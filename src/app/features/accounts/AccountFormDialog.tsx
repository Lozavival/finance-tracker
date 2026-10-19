import { useState, useEffect, type FormEvent, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/primitives/dialog';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { Label } from '@/components/primitives/label';
import { Switch } from '@/components/primitives/switch';
import { Toggle } from '@/components/primitives/toggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/primitives/toggle-group';
import { DateField } from '@/components/shared/DateField';
import { ColorPicker } from '@/components/shared/ColorPicker';
import { CreditCardFields, type CreditCardFormValues } from './CreditCardFields';
import { AccountPaymentMethodsSelector } from './AccountPaymentMethodsSelector';
import {
  type AccountConfig,
  type AccountKind,
  type ColorToken,
  getAccountColor,
  getAllowedPaymentMethodIds,
  getAccountCurrencies,
  getAccountOpeningBalance,
} from '@/data/settings';
import { type SupportedCurrency } from '@/i18n/types';
import { type Transaction } from '@/data/transactions';
import { useSettings } from '@/state/SettingsContext';
import { getToday } from '@/data/dates';
import { InlineAlert } from '@/components/shared/InlineAlert';
import { useI18n } from '@/i18n';
import { Trash2 } from 'lucide-react';

type AccountFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: AccountConfig | null;
  transactions: Transaction[];
  onSave: (account: AccountConfig) => void;
  onDeleteOrArchive?: (account: AccountConfig) => void;
};

export function AccountFormDialog({
  open,
  onOpenChange,
  account,
  transactions,
  onSave,
  onDeleteOrArchive,
}: AccountFormDialogProps) {
  const isEditing = Boolean(account);
  const { settings, isCreditCard } = useSettings();
  const { t } = useI18n();

  const [name, setName] = useState('');
  const [kind, setKind] = useState<AccountKind>('Checking');
  const [initials, setInitials] = useState('');
  const [color, setColor] = useState<ColorToken>('blue');
  const [currencies, setCurrencies] = useState<SupportedCurrency[]>(['USD']);
  const [openingBalanceBRL, setOpeningBalanceBRL] = useState('0.00');
  const [openingBalanceUSD, setOpeningBalanceUSD] = useState('0.00');
  const [openingDate, setOpeningDate] = useState<Date | undefined>(getToday());
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);

  const [hasCard, setHasCard] = useState(false);
  const [cardValues, setCardValues] = useState<CreditCardFormValues>({
    name: '',
    limit: '',
    closingDay: 25,
    dueDay: 5,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check if card transactions exist for this account
  const cardTransactionsCount = useMemo(() => {
    if (!account) return 0;
    return transactions.filter(t => t.accountId === account.id && isCreditCard(t.paymentMethodId)).length;
  }, [account, transactions, isCreditCard]);

  const getDefaultMethodsForKind = useCallback(
    (accountKind: AccountKind, attachCard = false): string[] => {
      if (accountKind === 'Cash') {
        return ['cash'];
      }
      if (accountKind === 'Savings') {
        return ['bank-transfer'];
      }
      return settings.paymentMethods
        .filter(m => m.id !== 'cash' && (m.behavior !== 'credit-card' || attachCard))
        .map(m => m.id);
    },
    [settings.paymentMethods],
  );

  function handleToggleCurrency(curr: SupportedCurrency) {
    if (currencies.includes(curr)) {
      if (currencies.length === 1) return; // Keep at least one currency
      setCurrencies(currencies.filter(c => c !== curr));
    } else {
      setCurrencies([...currencies, curr]);
    }
  }

  useEffect(() => {
    if (!open) return;
    setErrors({});

    if (account) {
      setName(account.name);
      setKind(account.kind);
      setInitials(account.initials);
      setColor(account.color);
      const currs = getAccountCurrencies(account);
      setCurrencies(currs);
      setOpeningBalanceBRL((getAccountOpeningBalance(account, 'BRL') / 100).toFixed(2));
      setOpeningBalanceUSD((getAccountOpeningBalance(account, 'USD') / 100).toFixed(2));
      setOpeningDate(account.openingDate);
      setHasCard(Boolean(account.card));
      setSelectedMethods(getAllowedPaymentMethodIds(account, settings));
      if (account.card) {
        setCardValues({
          name: account.card.name,
          limit: (account.card.limit / 100).toFixed(0),
          closingDay: account.card.closingDay,
          dueDay: account.card.dueDay,
        });
      } else {
        setCardValues({
          name: t('accounts.dialog.defaultCardName', { name: account.name }),
          limit: '5000',
          closingDay: 25,
          dueDay: 5,
        });
      }
    } else {
      setName('');
      setKind('Checking');
      setInitials('');
      setColor('cyan');
      setCurrencies(['USD']);
      setOpeningBalanceBRL('0.00');
      setOpeningBalanceUSD('0.00');
      setOpeningDate(getToday());
      setHasCard(false);
      setSelectedMethods(getDefaultMethodsForKind('Checking', false));
      setCardValues({
        name: '',
        limit: '5000',
        closingDay: 25,
        dueDay: 5,
      });
    }
  }, [open, account, settings, getDefaultMethodsForKind, t]);

  function handleNameChange(val: string) {
    setName(val);
    if (!account && (!initials || initials.length <= 2)) {
      const parts = val.trim().split(/\s+/);
      const autoInitials = parts
        .slice(0, 2)
        .map(p => p[0] || '')
        .join('')
        .toUpperCase();
      setInitials(autoInitials);
    }
  }

  function handleKindChange(newKind: AccountKind) {
    if (newKind === 'Cash') {
      if (hasCard && cardTransactionsCount > 0) {
        setErrors(prev => ({
          ...prev,
          card: t('accounts.errors.cannotSwitchToCash', { count: cardTransactionsCount }),
        }));
        return;
      }
      setKind(newKind);
      setSelectedMethods(['cash']);
      if (hasCard) {
        setHasCard(false);
      }
    } else if (newKind === 'Savings') {
      if (hasCard && cardTransactionsCount > 0) {
        setErrors(prev => ({
          ...prev,
          card: t('accounts.errors.cannotSwitchToSavings', { count: cardTransactionsCount }),
        }));
        return;
      }
      setKind(newKind);
      setSelectedMethods(prev => {
        const filtered = prev.filter(m => m !== 'cash' && m !== 'credit-card');
        return filtered.length > 0 ? filtered : ['bank-transfer'];
      });
      if (hasCard) {
        setHasCard(false);
      }
    } else {
      setKind(newKind);
      setSelectedMethods(prev => {
        const filtered = prev.filter(m => m !== 'cash');
        return filtered.length > 0 ? filtered : getDefaultMethodsForKind('Checking', hasCard);
      });
    }
  }

  function handleToggleCard(checked: boolean) {
    if (!checked && cardTransactionsCount > 0) {
      setErrors(prev => ({
        ...prev,
        card: t('accounts.errors.cannotDisableCard', { count: cardTransactionsCount }),
      }));
      return;
    }
    setErrors(prev => {
      const next = { ...prev };
      delete next.card;
      delete next.methodWarning;
      return next;
    });
    setHasCard(checked);
    const creditCardMethod = settings.paymentMethods.find(m => m.behavior === 'credit-card');
    if (creditCardMethod) {
      if (checked) {
        setSelectedMethods(prev => (prev.includes(creditCardMethod.id) ? prev : [...prev, creditCardMethod.id]));
      } else {
        setSelectedMethods(prev => prev.filter(id => id !== creditCardMethod.id));
      }
    }
  }

  function handleToggleMethod(methodId: string) {
    if (kind === 'Cash' || methodId === 'cash') return;
    const method = settings.paymentMethods.find(m => m.id === methodId);
    const isSelected = selectedMethods.includes(methodId);

    if (isSelected) {
      if (account) {
        const inUseCount = transactions.filter(
          t => t.accountId === account.id && t.paymentMethodId === methodId,
        ).length;
        if (inUseCount > 0) {
          setErrors(prev => ({
            ...prev,
            methodWarning: t('accounts.errors.cannotDisableMethod', {
              name: method?.name || methodId,
              count: inUseCount,
            }),
          }));
          return;
        }
      }
      if (method?.behavior === 'credit-card') {
        if (cardTransactionsCount > 0) {
          setErrors(prev => ({
            ...prev,
            methodWarning: t('accounts.errors.cannotDisableCard', {
              count: cardTransactionsCount,
            }),
          }));
          return;
        }
        setHasCard(false);
      }
      setErrors(prev => {
        const next = { ...prev };
        delete next.methodWarning;
        delete next.paymentMethods;
        return next;
      });
      setSelectedMethods(prev => prev.filter(id => id !== methodId));
    } else {
      if (method?.behavior === 'credit-card') {
        setHasCard(true);
      }
      setErrors(prev => {
        const next = { ...prev };
        delete next.methodWarning;
        delete next.paymentMethods;
        return next;
      });
      setSelectedMethods(prev => [...prev, methodId]);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};

    const trimmedName = name.trim();
    if (!trimmedName) {
      nextErrors.name = t('accounts.errors.accountNameRequired');
    } else {
      // Check uniqueness
      const duplicate = settings.accounts.some(
        a => a.name.toLowerCase() === trimmedName.toLowerCase() && a.id !== account?.id,
      );
      if (duplicate) {
        nextErrors.name = t('accounts.errors.accountNameExists');
      }
    }

    const trimmedInitials = initials.trim().toUpperCase();
    if (!trimmedInitials) {
      nextErrors.initials = t('accounts.errors.initialsRequired');
    } else if (trimmedInitials.length > 3) {
      nextErrors.initials = t('accounts.errors.initialsMax');
    }

    const openingBalances: Partial<Record<SupportedCurrency, number>> = {};
    if (currencies.includes('BRL')) {
      const numBRL = Number(openingBalanceBRL);
      if (isNaN(numBRL)) {
        nextErrors.openingBalanceBRL = t('accounts.errors.validOpeningBalance');
      } else {
        openingBalances.BRL = Math.round(numBRL * 100);
      }
    }
    if (currencies.includes('USD')) {
      const numUSD = Number(openingBalanceUSD);
      if (isNaN(numUSD)) {
        nextErrors.openingBalanceUSD = t('accounts.errors.validOpeningBalance');
      } else {
        openingBalances.USD = Math.round(numUSD * 100);
      }
    }

    if (!openingDate) {
      nextErrors.openingDate = t('accounts.errors.selectOpeningDate');
    }

    if (hasCard) {
      if (!cardValues.name.trim()) {
        nextErrors.cardName = t('accounts.errors.cardNameRequired');
      }
      const numLimit = Number(cardValues.limit);
      if (isNaN(numLimit) || numLimit < 0) {
        nextErrors.cardLimit = t('accounts.errors.validCardLimit');
      }
      const closing = Number(cardValues.closingDay);
      if (!closing || closing < 1 || closing > 31) {
        nextErrors.cardClosing = t('accounts.errors.dayRange');
      }
      const due = Number(cardValues.dueDay);
      if (!due || due < 1 || due > 31) {
        nextErrors.cardDue = t('accounts.errors.dayRange');
      }
    }

    if (kind !== 'Cash' && selectedMethods.filter(id => id !== 'cash').length === 0) {
      nextErrors.paymentMethods = t('accounts.errors.selectMethod');
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !openingDate) return;

    let id = account?.id;
    if (!id) {
      id = trimmedName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      if (!id || settings.accounts.some(a => a.id === id)) {
        id = `acc-${Date.now()}`;
      }
    }

    const allowedPaymentMethods = kind === 'Cash' ? ['cash'] : selectedMethods.filter(id => id !== 'cash');

    const result: AccountConfig = {
      id,
      name: trimmedName,
      kind,
      currencies,
      openingBalances,
      initials: trimmedInitials,
      color,
      openingDate,
      allowedPaymentMethods,
      archived: account?.archived,
      card:
        hasCard && kind !== 'Cash'
          ? {
              name: cardValues.name.trim(),
              limit: Math.round(Number(cardValues.limit) * 100),
              closingDay: Number(cardValues.closingDay),
              dueDay: Number(cardValues.dueDay),
            }
          : undefined,
    };

    onSave(result);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden border-border bg-popover p-0 text-foreground shadow-2xl sm:max-w-xl max-h-[90vh] flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <DialogHeader className="border-b border-border p-6 pr-14 flex-shrink-0">
            <DialogTitle>{isEditing ? t('accounts.dialog.editTitle') : t('accounts.dialog.newTitle')}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {isEditing ? t('accounts.dialog.editDesc') : t('accounts.dialog.newDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 p-6 overflow-y-auto flex-1 custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="account-name" className="text-foreground">
                  {t('accounts.dialog.nameLabel')}
                </Label>
                <Input
                  id="account-name"
                  value={name}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder={t('accounts.dialog.namePlaceholder')}
                  aria-invalid={Boolean(errors.name)}
                  className="h-11 border-border bg-foreground/5 text-foreground placeholder:text-muted-foreground"
                />
                {errors.name && <div className="text-xs text-theme-red">{errors.name}</div>}
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">{t('accounts.dialog.typeLabel')}</Label>
                <ToggleGroup
                  type="single"
                  value={kind}
                  onValueChange={val => val && handleKindChange(val as AccountKind)}
                  className="w-full justify-start bg-foreground/5 p-1 rounded-lg border border-border"
                >
                  <ToggleGroupItem
                    value="Checking"
                    className="flex-1 text-xs sm:text-sm px-1.5 data-[state=on]:bg-theme-cyan/20 data-[state=on]:text-theme-cyan"
                  >
                    {t('accounts.dialog.checking')}
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="Savings"
                    className="flex-1 text-xs sm:text-sm px-1.5 data-[state=on]:bg-theme-cyan/20 data-[state=on]:text-theme-cyan"
                  >
                    {t('accounts.dialog.savings')}
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="Cash"
                    className="flex-1 text-xs sm:text-sm px-1.5 data-[state=on]:bg-theme-cyan/20 data-[state=on]:text-theme-cyan"
                  >
                    {t('accounts.dialog.cash')}
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="account-initials" className="text-foreground">
                  {t('accounts.dialog.initialsLabel')}
                </Label>
                <div className="flex gap-2">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: getAccountColor(color) }}
                  >
                    {initials || '??'}
                  </div>
                  <Input
                    id="account-initials"
                    value={initials}
                    maxLength={3}
                    onChange={e => setInitials(e.target.value.toUpperCase())}
                    placeholder={t('accounts.dialog.initialsPlaceholder')}
                    className="h-11 border-border bg-foreground/5 text-foreground uppercase"
                  />
                </div>
                {errors.initials && <div className="text-xs text-theme-red">{errors.initials}</div>}
              </div>

              <ColorPicker value={color} onChange={setColor} label={t('accounts.dialog.themeColor')} />

              <div className="space-y-2 sm:col-span-2">
                <Label className="text-foreground">{t('dialogs.account.currenciesLabel')}</Label>
                <div className="flex gap-2">
                  {(['BRL', 'USD'] as const).map(curr => {
                    const isSelected = currencies.includes(curr);
                    return (
                      <Toggle
                        key={curr}
                        pressed={isSelected}
                        onPressedChange={() => handleToggleCurrency(curr)}
                        aria-label={curr === 'BRL' ? 'BRL (R$)' : 'USD ($)'}
                        variant="outline"
                        className={`flex-1 flex items-center justify-between p-3 h-auto rounded-lg border text-sm transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'border-theme-cyan/60 bg-theme-cyan/15 text-theme-cyan font-medium data-[state=on]:bg-theme-cyan/15 data-[state=on]:text-theme-cyan'
                            : 'border-border bg-foreground/5 text-muted-foreground hover:border-theme-cyan/40 hover:text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{curr === 'BRL' ? '🇧🇷 BRL' : '🇺🇸 USD'}</span>
                          <span className="text-xs opacity-75">{curr === 'BRL' ? '(R$)' : '($)'}</span>
                        </div>
                        <span
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-theme-cyan bg-theme-cyan' : 'border-muted-foreground'
                          }`}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-background" />}
                        </span>
                      </Toggle>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">{t('dialogs.account.currenciesDesc')}</p>
              </div>

              {currencies.includes('BRL') && (
                <div className="space-y-2">
                  <Label htmlFor="opening-balance-brl" className="text-foreground">
                    {t('dialogs.account.pocketBalanceLabel', { currency: 'BRL' })}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">
                      R$
                    </span>
                    <Input
                      id="opening-balance-brl"
                      type="number"
                      step="0.01"
                      value={openingBalanceBRL}
                      onChange={e => setOpeningBalanceBRL(e.target.value)}
                      placeholder="0.00"
                      className="h-11 pl-9 border-border bg-foreground/5 text-foreground"
                    />
                  </div>
                  {errors.openingBalanceBRL && <div className="text-xs text-theme-red">{errors.openingBalanceBRL}</div>}
                </div>
              )}

              {currencies.includes('USD') && (
                <div className="space-y-2">
                  <Label htmlFor="opening-balance-usd" className="text-foreground">
                    {t('dialogs.account.pocketBalanceLabel', { currency: 'USD' })}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">
                      $
                    </span>
                    <Input
                      id="opening-balance-usd"
                      type="number"
                      step="0.01"
                      value={openingBalanceUSD}
                      onChange={e => setOpeningBalanceUSD(e.target.value)}
                      placeholder="0.00"
                      className="h-11 pl-7 border-border bg-foreground/5 text-foreground"
                    />
                  </div>
                  {errors.openingBalanceUSD && <div className="text-xs text-theme-red">{errors.openingBalanceUSD}</div>}
                </div>
              )}

              <div className="space-y-2 sm:col-span-2">
                <Label className="text-foreground">{t('accounts.dialog.openingDate')}</Label>
                <DateField
                  placeholder={t('accounts.dialog.selectOpeningDate')}
                  value={openingDate}
                  onChange={d => setOpeningDate(d)}
                  className="h-11"
                />
                {errors.openingDate && <div className="text-xs text-theme-red">{errors.openingDate}</div>}
              </div>
            </div>

            <AccountPaymentMethodsSelector
              kind={kind}
              paymentMethods={settings.paymentMethods}
              selectedMethods={selectedMethods}
              onToggleMethod={handleToggleMethod}
              methodError={errors.paymentMethods}
              methodWarning={errors.methodWarning}
            />

            {kind !== 'Cash' && (
              <div className="pt-4 border-t border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-foreground">{t('accounts.dialog.attachCreditCard')}</div>
                    <div className="text-xs text-muted-foreground">{t('accounts.dialog.attachCardDesc')}</div>
                  </div>
                  <Switch checked={hasCard} onCheckedChange={handleToggleCard} />
                </div>

                {errors.card && <InlineAlert variant="destructive">{errors.card}</InlineAlert>}

                {hasCard && (
                  <CreditCardFields
                    values={cardValues}
                    onChange={setCardValues}
                    errors={{
                      name: errors.cardName,
                      limit: errors.cardLimit,
                      closingDay: errors.cardClosing,
                      dueDay: errors.cardDue,
                    }}
                    isEditing={isEditing}
                  />
                )}
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-border p-6 flex-shrink-0 sm:justify-between items-center gap-2">
            <div>
              {isEditing && account && onDeleteOrArchive && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    onOpenChange(false);
                    onDeleteOrArchive(account);
                  }}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5 text-xs px-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t('accounts.deleteOrArchive')}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
              >
                {t('common.cancel')}
              </Button>
              <Button variant="cyan" type="submit">
                {isEditing ? t('accounts.saveChanges') : t('accounts.addAccount')}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
