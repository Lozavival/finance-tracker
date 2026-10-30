import { useEffect, useState, useMemo, useRef, type FormEvent } from 'react';
import { Check, Plus } from 'lucide-react';
import { Button } from '@/components/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/primitives/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/primitives/alert-dialog';
import { Input } from '@/components/primitives/input';
import { Label } from '@/components/primitives/label';
import { DirectionToggle, DialogMode } from './DirectionToggle';
import { OptionSelect } from '@/components/shared/OptionSelect';
import { DateField } from '@/components/shared/DateField';
import { InstallmentsField } from './InstallmentsField';
import { RecurringField } from './RecurringField';
import { type TransactionDraft, type EditingTarget } from '@/data/transactions';
import { useSettings } from '@/state/SettingsContext';
import { logger } from '@/lib/logger';

const formLogger = logger.child('TransactionForm');
import { CategoryChip } from '@/components/shared/CategoryChip';
import { InlineAlert } from '@/components/shared/InlineAlert';
import { getIcon } from '@/data/icons';
import { TRANSFER_TYPE_ID, getAccountCurrencies } from '@/data/settings';
import { convertAmount, centsToDollars, dollarsToCents } from '@/data/currency';
import { type SupportedCurrency } from '@/i18n/types';
import { useI18n } from '@/i18n';

export type { EditingTarget };

export type TransactionFormDialogProps = {
  open: boolean;
  editing: EditingTarget | null;
  defaultDate: Date;
  defaultAccount?: string;
  initialRecurring?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (draft: TransactionDraft) => void;
};

type FormErrors = Partial<Record<'description' | 'value' | 'toValue' | 'date' | 'banks', string>>;

export function TransactionFormDialog({
  open,
  editing,
  defaultDate,
  defaultAccount,
  initialRecurring,
  onOpenChange,
  onSave,
}: TransactionFormDialogProps) {
  const { settings, typesByDirection, findAccount, isCreditCard, getAllowedPaymentMethodIds } = useSettings();
  const { t } = useI18n();

  const [mode, setMode] = useState<DialogMode>('expense');
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [currency, setCurrency] = useState<SupportedCurrency>('USD');
  const [date, setDate] = useState<Date | undefined>(defaultDate);
  const [typeId, setTypeId] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [paymentMethodId, setPaymentMethodId] = useState<string>('');
  const [installments, setInstallments] = useState<number | ''>(1);

  // Recurrence
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringLimitKind, setRecurringLimitKind] = useState<'infinite' | 'count'>('infinite');
  const [recurringCount, setRecurringCount] = useState<number | ''>(3);

  // Convert confirmation when disabling recurrence on editing
  const [showConvertConfirm, setShowConvertConfirm] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<TransactionDraft | null>(null);

  // Transfer specific
  const [fromAccountId, setFromAccountId] = useState<string>('');
  const [fromCurrency, setFromCurrency] = useState<SupportedCurrency>('USD');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [toCurrency, setToCurrency] = useState<SupportedCurrency>('USD');
  const [toValue, setToValue] = useState<string>('');

  const [errors, setErrors] = useState<FormErrors>({});

  const selectedAccount = useMemo(() => findAccount(accountId), [findAccount, accountId]);

  const fromAccount = useMemo(() => findAccount(fromAccountId), [findAccount, fromAccountId]);
  const toAccount = useMemo(() => findAccount(toAccountId), [findAccount, toAccountId]);

  const accountCurrencies = useMemo<SupportedCurrency[]>(() => {
    return selectedAccount ? getAccountCurrencies(selectedAccount) : (['USD'] as SupportedCurrency[]);
  }, [selectedAccount]);

  const fromAccountCurrencies = useMemo<SupportedCurrency[]>(() => {
    return fromAccount ? getAccountCurrencies(fromAccount) : (['USD'] as SupportedCurrency[]);
  }, [fromAccount]);

  const toAccountCurrencies = useMemo<SupportedCurrency[]>(() => {
    return toAccount ? getAccountCurrencies(toAccount) : (['USD'] as SupportedCurrency[]);
  }, [toAccount]);

  useEffect(() => {
    if (!accountCurrencies.includes(currency)) {
      setCurrency(accountCurrencies[0] || 'USD');
    }
  }, [accountCurrencies, currency]);

  useEffect(() => {
    if (!fromAccountCurrencies.includes(fromCurrency)) {
      setFromCurrency(fromAccountCurrencies[0] || 'USD');
    }
  }, [fromAccountCurrencies, fromCurrency]);

  useEffect(() => {
    if (!toAccountCurrencies.includes(toCurrency)) {
      setToCurrency(toAccountCurrencies[0] || 'USD');
    }
  }, [toAccountCurrencies, toCurrency]);

  const isCrossTransfer = mode === 'transfer' && fromCurrency !== toCurrency;

  const effectiveRateDisplay = useMemo(() => {
    if (!isCrossTransfer) return null;
    const numSent = Number(value);
    const numReceived = Number(toValue);
    if (!numSent || !numReceived || numSent <= 0 || numReceived <= 0) return null;

    if (fromCurrency === 'BRL' && toCurrency === 'USD') {
      return (numSent / numReceived).toFixed(2);
    }
    if (fromCurrency === 'USD' && toCurrency === 'BRL') {
      return (numReceived / numSent).toFixed(2);
    }
    return (numSent / numReceived).toFixed(2);
  }, [isCrossTransfer, value, toValue, fromCurrency, toCurrency]);

  function handleApplyLiveRate() {
    if (!settings.exchangeRate.rate) return;
    const numSent = Number(value);
    if (!numSent || numSent <= 0) return;
    const converted = convertAmount(numSent, fromCurrency, toCurrency, settings.exchangeRate.rate);
    if (converted !== null) {
      setToValue(converted.toFixed(2));
    }
  }

  // Filter payment methods: only allow methods configured for this account
  const availablePaymentMethods = useMemo(() => {
    if (!selectedAccount) return settings.paymentMethods;
    const allowedIds = getAllowedPaymentMethodIds(selectedAccount);
    return settings.paymentMethods.filter(m => allowedIds.includes(m.id));
  }, [selectedAccount, settings.paymentMethods, getAllowedPaymentMethodIds]);

  const canUseInstallments = mode === 'expense' && isCreditCard(paymentMethodId);
  const effectiveInstallments = canUseInstallments ? Number(installments) || 1 : 1;

  const prevOpenRef = useRef(false);
  const prevEditingRef = useRef<EditingTarget | null>(null);

  useEffect(() => {
    if (!open) {
      prevOpenRef.current = false;
      return;
    }

    const isOpening = !prevOpenRef.current;
    const isTargetChange = editing !== prevEditingRef.current;
    prevOpenRef.current = true;
    prevEditingRef.current = editing;

    if (!isOpening && !isTargetChange) {
      return;
    }

    setErrors({});
    setShowConvertConfirm(false);
    setPendingDraft(null);
    const activeAccounts = settings.accounts.filter(a => !a.archived);
    const firstAcc = activeAccounts[0]?.id || settings.accounts[0]?.id || '';
    const secondAcc = activeAccounts[1]?.id || activeAccounts[0]?.id || firstAcc;
    const initialAcc = defaultAccount || firstAcc;

    if (!editing) {
      setMode('expense');
      setDescription('');
      setValue('');
      setToValue('');
      setDate(defaultDate);
      setTypeId(typesByDirection.expense[0]?.id || '');
      setAccountId(initialAcc);
      const acc = findAccount(initialAcc);
      const accCurrs = getAccountCurrencies(acc);
      setCurrency(accCurrs[0] || 'USD');
      const allowedIds = getAllowedPaymentMethodIds(acc);
      const allowedMethods = settings.paymentMethods.filter(m => allowedIds.includes(m.id));
      setPaymentMethodId(allowedMethods[0]?.id || '');
      setInstallments(1);
      setIsRecurring(Boolean(initialRecurring));
      setRecurringLimitKind('infinite');
      setRecurringCount(3);
      setFromAccountId(firstAcc);
      setFromCurrency(getAccountCurrencies(findAccount(firstAcc))[0] || 'USD');
      setToAccountId(secondAcc);
      setToCurrency(getAccountCurrencies(findAccount(secondAcc))[0] || 'USD');
      return;
    }

    if (editing.kind === 'transfer') {
      setMode('transfer');
      setValue(String(centsToDollars(editing.outgoing.value)));
      setToValue(String(centsToDollars(editing.incoming.value)));
      setDate(editing.outgoing.date);
      setFromAccountId(editing.outgoing.accountId);
      setFromCurrency(editing.outgoing.currency);
      setToAccountId(editing.incoming.accountId);
      setToCurrency(editing.incoming.currency);
      setDescription('');
      setTypeId(TRANSFER_TYPE_ID);
      setAccountId(editing.outgoing.accountId);
      setCurrency(editing.outgoing.currency);
      setPaymentMethodId(settings.paymentMethods[0]?.id || '');
      setInstallments(1);
      setIsRecurring(false);
    } else if (editing.kind === 'installments') {
      const first = editing.series[0];
      setMode('expense');
      setDescription(first.description);
      const totalCents = editing.series.reduce((sum, tx) => sum + tx.value, 0);
      setValue(centsToDollars(totalCents).toFixed(2));
      setToValue('');
      setDate(first.date);
      setTypeId(first.typeId);
      setAccountId(first.accountId);
      setCurrency(first.currency);
      if (first.paymentMethodId) setPaymentMethodId(first.paymentMethodId);
      setInstallments(editing.series.length);
      setIsRecurring(false);
      setFromAccountId(firstAcc);
      setFromCurrency(getAccountCurrencies(findAccount(firstAcc))[0] || 'USD');
      setToAccountId(secondAcc);
      setToCurrency(getAccountCurrencies(findAccount(secondAcc))[0] || 'USD');
    } else if (editing.kind === 'recurring') {
      const first = editing.series[0];
      setMode(first.direction);
      setDescription(first.description);
      setValue(String(centsToDollars(first.value)));
      setToValue('');
      setDate(first.date);
      setTypeId(first.typeId);
      setAccountId(first.accountId);
      setCurrency(first.currency);
      if (first.paymentMethodId) setPaymentMethodId(first.paymentMethodId);
      setInstallments(1);
      setIsRecurring(true);
      if (first.recurring?.total) {
        setRecurringLimitKind('count');
        setRecurringCount(first.recurring.total);
      } else {
        setRecurringLimitKind('infinite');
        setRecurringCount(3);
      }
      setFromAccountId(firstAcc);
      setFromCurrency(getAccountCurrencies(findAccount(firstAcc))[0] || 'USD');
      setToAccountId(secondAcc);
      setToCurrency(getAccountCurrencies(findAccount(secondAcc))[0] || 'USD');
    } else {
      const tx = editing.transaction;
      setMode(tx.direction);
      setDescription(tx.description);
      setValue(String(centsToDollars(tx.value)));
      setToValue('');
      setDate(tx.date);
      setTypeId(tx.typeId);
      setAccountId(tx.accountId);
      setCurrency(tx.currency);
      if (tx.paymentMethodId) setPaymentMethodId(tx.paymentMethodId);
      setInstallments(1);
      setIsRecurring(Boolean(tx.recurring));
      if (tx.recurring?.total) {
        setRecurringLimitKind('count');
        setRecurringCount(tx.recurring.total);
      } else {
        setRecurringLimitKind('infinite');
        setRecurringCount(3);
      }
      setFromAccountId(firstAcc);
      setFromCurrency(getAccountCurrencies(findAccount(firstAcc))[0] || 'USD');
      setToAccountId(secondAcc);
      setToCurrency(getAccountCurrencies(findAccount(secondAcc))[0] || 'USD');
    }
  }, [
    open,
    editing,
    defaultDate,
    defaultAccount,
    initialRecurring,
    settings,
    typesByDirection,
    findAccount,
    getAllowedPaymentMethodIds,
  ]);

  // Adjust paymentMethodId if selected account changes and current method is not allowed
  useEffect(() => {
    if (paymentMethodId && !availablePaymentMethods.some(m => m.id === paymentMethodId)) {
      const fallback = availablePaymentMethods[0]?.id || '';
      setPaymentMethodId(fallback);
    }
  }, [paymentMethodId, availablePaymentMethods]);

  function handleModeChange(nextMode: DialogMode) {
    setMode(nextMode);
    if (nextMode === 'income') {
      const isCurrentIncome = typesByDirection.income.some(t => t.id === typeId);
      if (!isCurrentIncome) {
        setTypeId(typesByDirection.income[0]?.id || '');
      }
    } else if (nextMode === 'expense') {
      const isCurrentExpense = typesByDirection.expense.some(t => t.id === typeId && !t.system);
      if (!isCurrentExpense) {
        setTypeId(typesByDirection.expense.find(t => !t.system)?.id || typesByDirection.expense[0]?.id || '');
      }
    }
  }

  const isUncheckingRecurrence = editing?.kind === 'recurring' && !isRecurring;
  const isEditingInstallments = editing?.kind === 'installments';

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FormErrors = {};
    const normalizedDescription = description.trim();
    const normalizedValue = Number(value);
    const normalizedToValue = isCrossTransfer ? Number(toValue) : normalizedValue;

    if (mode !== 'transfer' && !normalizedDescription) {
      nextErrors.description = t('transactions.errors.enterDescription');
    }
    if (!value || !Number.isFinite(normalizedValue) || normalizedValue <= 0) {
      nextErrors.value = t('transactions.errors.enterValue');
    }
    if (isCrossTransfer && (!toValue || !Number.isFinite(normalizedToValue) || normalizedToValue <= 0)) {
      nextErrors.toValue = t('transactions.errors.enterValue');
    }
    if (effectiveInstallments > 1 && normalizedValue < effectiveInstallments * 0.01) {
      nextErrors.value = t('transactions.errors.valueTooSmall');
    }
    if (!date) {
      nextErrors.date = t('transactions.errors.chooseDate');
    }
    if (mode === 'transfer' && fromAccountId === toAccountId && fromCurrency === toCurrency) {
      nextErrors.banks = t('transactions.errors.differentAccounts');
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !date) {
      formLogger.warn('TransactionForm submission rejected by validation', {
        errors: nextErrors,
        hasDate: Boolean(date),
        mode,
        value,
      });
      return;
    }

    const valueCents = dollarsToCents(normalizedValue);
    const toValueCents = dollarsToCents(normalizedToValue);

    let draft: TransactionDraft;
    if (mode === 'transfer') {
      draft = {
        kind: 'transfer',
        date,
        value: valueCents,
        toValue: toValueCents,
        fromAccountId,
        fromCurrency,
        toAccountId,
        toCurrency,
      };
    } else if (isRecurring) {
      draft = {
        kind: 'recurring',
        transaction: {
          description: normalizedDescription,
          direction: mode,
          typeId,
          accountId,
          currency,
          ...(mode === 'expense' ? { paymentMethodId } : {}),
        },
        startDate: date,
        value: valueCents,
        frequency: 'monthly',
        limit:
          recurringLimitKind === 'count'
            ? { kind: 'count', count: Math.max(1, Number(recurringCount) || 1) }
            : { kind: 'infinite' },
      };
    } else if (effectiveInstallments > 1) {
      draft = {
        kind: 'installments',
        transaction: {
          description: normalizedDescription,
          direction: mode,
          typeId,
          accountId,
          currency,
          paymentMethodId,
        },
        firstDate: date,
        totalValue: valueCents,
        count: effectiveInstallments,
      };
    } else {
      draft = {
        kind: 'single',
        transaction: {
          description: normalizedDescription,
          value: valueCents,
          currency,
          date,
          direction: mode,
          typeId,
          accountId,
          ...(mode === 'expense' ? { paymentMethodId } : {}),
        },
      };
    }

    if (isUncheckingRecurrence) {
      setPendingDraft(draft);
      setShowConvertConfirm(true);
      return;
    }

    formLogger.info('TransactionForm draft submitted', { kind: draft.kind });
    onSave(draft);
  }

  const isTransfer = mode === 'transfer';

  const typeOptions = useMemo(() => {
    const list = mode === 'income' ? typesByDirection.income : typesByDirection.expense;
    return list.map(t => ({
      value: t.id,
      label: t.name,
      customContent: <CategoryChip typeConfig={t} size="sm" />,
    }));
  }, [mode, typesByDirection]);

  const accountOptions = useMemo(() => {
    return settings.accounts
      .filter(a => !a.archived || a.id === accountId)
      .map(a => ({
        value: a.id,
        label: a.archived ? `${a.name} (${t('accounts.archivedBadge')})` : a.name,
      }));
  }, [settings.accounts, accountId, t]);

  const transferAccountOptions = useMemo(() => {
    return settings.accounts
      .filter(a => !a.archived || a.id === fromAccountId || a.id === toAccountId)
      .map(a => ({
        value: a.id,
        label: a.archived ? `${a.name} (${t('accounts.archivedBadge')})` : a.name,
      }));
  }, [settings.accounts, fromAccountId, toAccountId, t]);

  const paymentOptions = useMemo(() => {
    return availablePaymentMethods.map(m => {
      const Icon = getIcon(m.icon);
      return {
        value: m.id,
        label: m.name,
        icon: <Icon className="w-3.5 h-3.5 text-muted-foreground" />,
      };
    });
  }, [availablePaymentMethods]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="gap-0 overflow-hidden border-border bg-popover p-0 text-foreground shadow-2xl sm:max-w-2xl max-h-[calc(100dvh-2rem)] flex flex-col">
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <DialogHeader className="border-b border-border p-6 pr-14 shrink-0">
              <DialogTitle>
                {editing ? t('transactions.editTransaction') : t('transactions.addTransaction')}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {isTransfer
                  ? t('transactions.moveMoneyDesc')
                  : editing
                    ? t('transactions.updateTxDesc')
                    : t('transactions.recordTxDesc')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 p-6 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
              <DirectionToggle value={mode} onChange={handleModeChange} />

              <div className="grid gap-5 sm:grid-cols-2">
                {!isTransfer && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="transaction-description" className="text-foreground">
                      {t('common.description')}
                    </Label>
                    <Input
                      id="transaction-description"
                      value={description}
                      onChange={event => setDescription(event.target.value)}
                      placeholder={t('transactions.descPlaceholder')}
                      aria-invalid={Boolean(errors.description)}
                      className="h-11 border-border bg-foreground/5 text-foreground placeholder:text-muted-foreground"
                    />
                    {errors.description && <div className="text-destructive text-sm">{errors.description}</div>}
                  </div>
                )}

                {!isTransfer ? (
                  <>
                    <div className="space-y-2">
                      <Label className="text-foreground">
                        {isRecurring
                          ? t('transactions.startDate')
                          : effectiveInstallments > 1
                            ? t('transactions.firstInstallment')
                            : t('common.date')}
                      </Label>
                      <DateField
                        placeholder={t('transactions.chooseDate')}
                        value={date}
                        onChange={d => setDate(d)}
                        hasError={Boolean(errors.date)}
                        className="h-11"
                      />
                      {errors.date && <div className="text-destructive text-sm">{errors.date}</div>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="transaction-value" className="text-foreground">
                        {isRecurring
                          ? `${t('transactions.valuePerMonth')} (${currency === 'BRL' ? 'R$' : '$'})`
                          : effectiveInstallments > 1
                            ? `${t('common.totalValue')} (${currency === 'BRL' ? 'R$' : '$'})`
                            : `${t('common.value')} (${currency === 'BRL' ? 'R$' : '$'})`}
                      </Label>
                      <Input
                        id="transaction-value"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={value}
                        onChange={event => setValue(event.target.value)}
                        placeholder={t('transactions.amountPlaceholder')}
                        aria-invalid={Boolean(errors.value)}
                        className="h-11 border-border bg-foreground/5 text-foreground placeholder:text-muted-foreground"
                      />
                      {errors.value && <div className="text-destructive text-sm">{errors.value}</div>}
                    </div>

                    <OptionSelect
                      label={t('common.category')}
                      value={typeId}
                      options={typeOptions}
                      onChange={setTypeId}
                    />

                    <div className="space-y-2">
                      <OptionSelect
                        label={t('common.account')}
                        value={accountId}
                        options={accountOptions}
                        onChange={setAccountId}
                      />
                      {accountCurrencies.length > 1 ? (
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-xs text-muted-foreground">
                            {t('dialogs.transaction.currencyLabel')}:
                          </span>
                          <div className="flex gap-1.5">
                            {accountCurrencies.map(curr => (
                              <Button
                                key={curr}
                                type="button"
                                size="sm"
                                variant={currency === curr ? 'cyan' : 'outline'}
                                onClick={() => setCurrency(curr)}
                                className="h-7 px-2.5 text-xs"
                              >
                                {curr} ({curr === 'BRL' ? 'R$' : '$'})
                              </Button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
                          <span>{t('dialogs.transaction.currencyLabel')}:</span>
                          <span className="font-semibold text-foreground uppercase">
                            {currency} ({currency === 'BRL' ? 'R$' : '$'})
                          </span>
                        </div>
                      )}
                    </div>

                    {mode === 'expense' && (
                      <>
                        <OptionSelect
                          label={t('transactions.formOfPayment')}
                          value={paymentMethodId}
                          options={paymentOptions}
                          onChange={setPaymentMethodId}
                        />
                        {canUseInstallments && !isRecurring && (
                          <InstallmentsField
                            value={installments}
                            onChange={setInstallments}
                            totalValue={dollarsToCents(Number(value) || 0)}
                            currency={currency}
                          />
                        )}
                      </>
                    )}

                    {effectiveInstallments <= 1 && (
                      <RecurringField
                        isRecurring={isRecurring}
                        onRecurringChange={checked => {
                          setIsRecurring(checked);
                          if (checked) setInstallments(1);
                        }}
                        limitKind={recurringLimitKind}
                        onLimitKindChange={setRecurringLimitKind}
                        count={recurringCount}
                        onCountChange={setRecurringCount}
                      />
                    )}
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <OptionSelect
                        label={t('transactions.fromAccount')}
                        value={fromAccountId}
                        options={transferAccountOptions}
                        onChange={setFromAccountId}
                        error={errors.banks}
                      />
                      {fromAccountCurrencies.length > 1 && (
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-xs text-muted-foreground">
                            {t('dialogs.transaction.currencyLabel')}:
                          </span>
                          <div className="flex gap-1.5">
                            {fromAccountCurrencies.map(curr => (
                              <Button
                                key={curr}
                                type="button"
                                size="sm"
                                variant={fromCurrency === curr ? 'cyan' : 'outline'}
                                onClick={() => setFromCurrency(curr)}
                                className="h-7 px-2.5 text-xs"
                              >
                                {curr} ({curr === 'BRL' ? 'R$' : '$'})
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <OptionSelect
                        label={t('transactions.toAccount')}
                        value={toAccountId}
                        options={transferAccountOptions}
                        onChange={setToAccountId}
                        error={errors.banks}
                      />
                      {toAccountCurrencies.length > 1 && (
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-xs text-muted-foreground">
                            {t('dialogs.transaction.currencyLabel')}:
                          </span>
                          <div className="flex gap-1.5">
                            {toAccountCurrencies.map(curr => (
                              <Button
                                key={curr}
                                type="button"
                                size="sm"
                                variant={toCurrency === curr ? 'cyan' : 'outline'}
                                onClick={() => setToCurrency(curr)}
                                className="h-7 px-2.5 text-xs"
                              >
                                {curr} ({curr === 'BRL' ? 'R$' : '$'})
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-foreground">{t('common.date')}</Label>
                      <DateField
                        placeholder={t('transactions.chooseDate')}
                        value={date}
                        onChange={d => setDate(d)}
                        hasError={Boolean(errors.date)}
                        className="h-11"
                      />
                      {errors.date && <div className="text-destructive text-sm">{errors.date}</div>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="transaction-value" className="text-foreground">
                        {isCrossTransfer
                          ? `${t('dialogs.transaction.sendAmountLabel')} (${fromCurrency === 'BRL' ? 'R$' : '$'})`
                          : `${t('common.value')} (${fromCurrency === 'BRL' ? 'R$' : '$'})`}
                      </Label>
                      <Input
                        id="transaction-value"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={value}
                        onChange={event => setValue(event.target.value)}
                        placeholder={t('transactions.amountPlaceholder')}
                        aria-invalid={Boolean(errors.value)}
                        className="h-11 border-border bg-foreground/5 text-foreground placeholder:text-muted-foreground"
                      />
                      {errors.value && <div className="text-destructive text-sm">{errors.value}</div>}
                    </div>

                    {isCrossTransfer && (
                      <div className="space-y-2">
                        <Label htmlFor="transaction-to-value" className="text-foreground">
                          {`${t('dialogs.transaction.receiveAmountLabel')} (${toCurrency === 'BRL' ? 'R$' : '$'})`}
                        </Label>
                        <Input
                          id="transaction-to-value"
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={toValue}
                          onChange={event => setToValue(event.target.value)}
                          placeholder={t('transactions.amountPlaceholder')}
                          aria-invalid={Boolean(errors.toValue)}
                          className="h-11 border-border bg-foreground/5 text-foreground placeholder:text-muted-foreground"
                        />
                        {errors.toValue && <div className="text-destructive text-sm">{errors.toValue}</div>}
                      </div>
                    )}

                    {isCrossTransfer && (
                      <div className="sm:col-span-2 rounded-lg border border-border/40 bg-foreground/5 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{t('dialogs.transaction.effectiveRate')}:</span>
                          <span className="font-mono text-foreground font-medium">
                            {effectiveRateDisplay ? `1 USD = R$ ${effectiveRateDisplay}` : '—'}
                          </span>
                        </div>
                        {settings.exchangeRate.rate && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleApplyLiveRate}
                            className="h-7 text-xs border-border hover:bg-foreground/10 text-theme-cyan"
                          >
                            {t('dialogs.transaction.useLiveRate')} (1 USD = {settings.exchangeRate.rate.toFixed(2)} BRL)
                          </Button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
              {isEditingInstallments && !canUseInstallments && (
                <InlineAlert variant="warning">{t('transactions.installmentsHint')}</InlineAlert>
              )}
              {isUncheckingRecurrence && (
                <InlineAlert variant="warning">{t('transactions.disableRecurrenceWarning')}</InlineAlert>
              )}
            </div>

            <DialogFooter className="border-t border-border p-6 shrink-0 sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
              >
                {t('common.cancel')}
              </Button>
              <Button variant="cyan" type="submit">
                {editing ? <Check className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                {editing ? t('transactions.saveChanges') : t('transactions.addTransaction')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConvertConfirm} onOpenChange={setShowConvertConfirm}>
        <AlertDialogContent className="border-border bg-popover text-foreground sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('transactions.confirmConvertToSingleTitle')}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {t('transactions.confirmConvertToSingleDesc', { description })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border bg-foreground/5 text-foreground hover:bg-foreground/10 hover:text-foreground">
              {t('transactions.keepRecurring')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDraft) {
                  onSave(pendingDraft);
                  setShowConvertConfirm(false);
                  setPendingDraft(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('transactions.convertToSingle')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
