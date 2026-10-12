import { useState, useEffect, type FormEvent, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { Toggle } from '../ui/toggle';
import { DateField } from '../transactions/DateField';
import { ColorPicker } from '../settings/ColorPicker';
import { CreditCardFields, type CreditCardFormValues } from './CreditCardFields';
import {
  type AccountConfig,
  type AccountKind,
  type ColorToken,
  getAccountColor,
  getAllowedPaymentMethodIds,
} from '../../data/settings';
import { type Transaction } from '../../data/transactions';
import { useSettings } from '../../state/SettingsContext';
import { getToday } from '../../data/dates';
import { getIcon } from '../../data/icons';
import { AlertCircle } from 'lucide-react';

type AccountFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: AccountConfig | null;
  transactions: Transaction[];
  onSave: (account: AccountConfig) => void;
};

export function AccountFormDialog({ open, onOpenChange, account, transactions, onSave }: AccountFormDialogProps) {
  const isEditing = Boolean(account);
  const { settings, isCreditCard } = useSettings();

  const [name, setName] = useState('');
  const [kind, setKind] = useState<AccountKind>('Checking');
  const [initials, setInitials] = useState('');
  const [color, setColor] = useState<ColorToken>('blue');
  const [openingBalance, setOpeningBalance] = useState('');
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

  useEffect(() => {
    if (!open) return;
    setErrors({});

    if (account) {
      setName(account.name);
      setKind(account.kind);
      setInitials(account.initials);
      setColor(account.color);
      setOpeningBalance((account.openingBalance / 100).toFixed(2));
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
          name: `${account.name} Card`,
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
      setOpeningBalance('0.00');
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
  }, [open, account, settings, getDefaultMethodsForKind]);

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
    setKind(newKind);
    if (newKind === 'Cash') {
      setSelectedMethods(['cash']);
      if (hasCard) {
        if (cardTransactionsCount > 0) {
          setErrors(prev => ({
            ...prev,
            card: `Cannot switch to Cash: ${cardTransactionsCount} transaction(s) are using the attached credit card.`,
          }));
          return;
        }
        setHasCard(false);
      }
    } else if (newKind === 'Savings') {
      setSelectedMethods(prev => {
        const filtered = prev.filter(m => m !== 'cash' && m !== 'credit-card');
        return filtered.length > 0 ? filtered : ['bank-transfer'];
      });
      if (hasCard) {
        if (cardTransactionsCount > 0) {
          setErrors(prev => ({
            ...prev,
            card: `Cannot switch to Savings: ${cardTransactionsCount} transaction(s) are using the attached credit card.`,
          }));
          return;
        }
        setHasCard(false);
      }
    } else {
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
        card: `Cannot disable credit card: ${cardTransactionsCount} transaction(s) are using it.`,
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
            methodWarning: `Cannot disable ${method?.name || methodId}: ${inUseCount} transaction(s) are using it.`,
          }));
          return;
        }
      }
      if (method?.behavior === 'credit-card') {
        if (cardTransactionsCount > 0) {
          setErrors(prev => ({
            ...prev,
            methodWarning: `Cannot disable credit card: ${cardTransactionsCount} transaction(s) are using it.`,
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
      nextErrors.name = 'Please provide an account name.';
    } else {
      // Check uniqueness
      const duplicate = settings.accounts.some(
        a => a.name.toLowerCase() === trimmedName.toLowerCase() && a.id !== account?.id,
      );
      if (duplicate) {
        nextErrors.name = 'An account with this name already exists.';
      }
    }

    const trimmedInitials = initials.trim().toUpperCase();
    if (!trimmedInitials) {
      nextErrors.initials = 'Initials required.';
    } else if (trimmedInitials.length > 3) {
      nextErrors.initials = 'Max 3 letters.';
    }

    const numBalance = Number(openingBalance);
    if (isNaN(numBalance)) {
      nextErrors.openingBalance = 'Enter a valid opening balance.';
    }

    if (!openingDate) {
      nextErrors.openingDate = 'Select an opening date.';
    }

    if (hasCard) {
      if (!cardValues.name.trim()) {
        nextErrors.cardName = 'Card name is required.';
      }
      const numLimit = Number(cardValues.limit);
      if (isNaN(numLimit) || numLimit < 0) {
        nextErrors.cardLimit = 'Enter a valid card limit.';
      }
      const closing = Number(cardValues.closingDay);
      if (!closing || closing < 1 || closing > 31) {
        nextErrors.cardClosing = 'Must be between 1 and 31.';
      }
      const due = Number(cardValues.dueDay);
      if (!due || due < 1 || due > 31) {
        nextErrors.cardDue = 'Must be between 1 and 31.';
      }
    }

    if (kind !== 'Cash' && selectedMethods.filter(id => id !== 'cash').length === 0) {
      nextErrors.paymentMethods = 'Please select at least one payment method for this bank account.';
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
      initials: trimmedInitials,
      color,
      openingBalance: Math.round(numBalance * 100),
      openingDate,
      allowedPaymentMethods,
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
            <DialogTitle>{isEditing ? 'Edit account' : 'Add account'}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {isEditing
                ? 'Update account details and payment method settings.'
                : 'Configure a new checking, savings, or physical cash account.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 p-6 overflow-y-auto flex-1 custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="account-name" className="text-foreground">
                  Account Name
                </Label>
                <Input
                  id="account-name"
                  value={name}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="e.g. Chase Total Checking"
                  aria-invalid={Boolean(errors.name)}
                  className="h-11 border-border bg-foreground/5 text-foreground placeholder:text-muted-foreground"
                />
                {errors.name && <div className="text-xs text-red-400">{errors.name}</div>}
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Account Type</Label>
                <ToggleGroup
                  type="single"
                  value={kind}
                  onValueChange={val => val && handleKindChange(val as AccountKind)}
                  className="w-full justify-start bg-foreground/5 p-1 rounded-lg border border-border"
                >
                  <ToggleGroupItem
                    value="Checking"
                    className="flex-1 data-[state=on]:bg-cyan-500/20 data-[state=on]:text-theme-cyan"
                  >
                    Checking
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="Savings"
                    className="flex-1 data-[state=on]:bg-cyan-500/20 data-[state=on]:text-theme-cyan"
                  >
                    Savings
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="Cash"
                    className="flex-1 data-[state=on]:bg-cyan-500/20 data-[state=on]:text-theme-cyan"
                  >
                    Cash
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="account-initials" className="text-foreground">
                  Initials / Avatar
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
                    placeholder="e.g. CH"
                    className="h-11 border-border bg-foreground/5 text-foreground uppercase"
                  />
                </div>
                {errors.initials && <div className="text-xs text-red-400">{errors.initials}</div>}
              </div>

              <ColorPicker value={color} onChange={setColor} label="Theme Color" />

              <div className="space-y-2">
                <Label htmlFor="opening-balance" className="text-foreground">
                  Opening Balance ($)
                </Label>
                <Input
                  id="opening-balance"
                  type="number"
                  step="0.01"
                  value={openingBalance}
                  onChange={e => setOpeningBalance(e.target.value)}
                  placeholder="0.00"
                  className="h-11 border-border bg-foreground/5 text-foreground"
                />
                {errors.openingBalance && <div className="text-xs text-red-400">{errors.openingBalance}</div>}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label className="text-foreground">Opening Date</Label>
                <DateField
                  placeholder="Select opening date"
                  value={openingDate}
                  onChange={d => setOpeningDate(d)}
                  className="h-11"
                />
                {errors.openingDate && <div className="text-xs text-red-400">{errors.openingDate}</div>}
              </div>
            </div>

            {kind === 'Cash' ? (
              <div className="pt-4 border-t border-border space-y-2">
                <div>
                  <Label className="text-foreground">Payment Methods</Label>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Dedicated physical cash account. Physical cash is the only payment channel for this account.
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs px-3 py-1.5 font-medium">
                    {(() => {
                      const CashIcon = getIcon('Banknote');
                      return <CashIcon className="w-3.5 h-3.5" />;
                    })()}
                    <span>Cash (Dedicated)</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="pt-4 border-t border-border space-y-3">
                <div>
                  <Label className="text-foreground">Payment Methods</Label>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Select payment channels accepted or enabled for this bank account.
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {settings.paymentMethods
                    .filter(m => m.id !== 'cash')
                    .map(m => {
                      const Icon = getIcon(m.icon);
                      const isSelected = selectedMethods.includes(m.id);
                      return (
                        <Toggle
                          key={m.id}
                          pressed={isSelected}
                          onPressedChange={() => handleToggleMethod(m.id)}
                          variant="outline"
                          className="rounded-full border-border bg-foreground/5 hover:bg-foreground/10 data-[state=on]:border-cyan-500/40 data-[state=on]:bg-cyan-500/10 data-[state=on]:text-theme-cyan text-xs px-3 py-1.5 flex items-center gap-1.5 h-auto transition-all cursor-pointer"
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{m.name}</span>
                        </Toggle>
                      );
                    })}
                </div>
                {errors.paymentMethods && <div className="text-xs text-red-400">{errors.paymentMethods}</div>}
                {errors.methodWarning && (
                  <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-400">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{errors.methodWarning}</span>
                  </div>
                )}
              </div>
            )}

            {kind !== 'Cash' && (
              <div className="pt-4 border-t border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-foreground">Attach Credit Card</div>
                    <div className="text-xs text-muted-foreground">
                      Enable credit card bills and limit forecasting for this account.
                    </div>
                  </div>
                  <Switch checked={hasCard} onCheckedChange={handleToggleCard} />
                </div>

                {errors.card && (
                  <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-400">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{errors.card}</span>
                  </div>
                )}

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

          <DialogFooter className="border-t border-border p-6 flex-shrink-0 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-theme-cyan-btn text-white dark:text-gray-950 hover:bg-theme-cyan-btn-hover shadow-lg shadow-cyan-500/20"
            >
              {isEditing ? 'Save changes' : 'Add account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
