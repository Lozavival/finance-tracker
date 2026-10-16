import { useEffect, useState, useMemo, type FormEvent } from 'react';
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
import { CategoryChip } from '@/components/shared/CategoryChip';
import { InlineAlert } from '@/components/shared/InlineAlert';
import { getIcon } from '@/data/icons';
import { TRANSFER_TYPE_ID } from '@/data/settings';
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

type FormErrors = Partial<Record<'description' | 'value' | 'date' | 'banks', string>>;

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
  const [toAccountId, setToAccountId] = useState<string>('');

  const [errors, setErrors] = useState<FormErrors>({});

  const selectedAccount = useMemo(() => findAccount(accountId), [findAccount, accountId]);

  // Filter payment methods: only allow methods configured for this account
  const availablePaymentMethods = useMemo(() => {
    if (!selectedAccount) return settings.paymentMethods;
    const allowedIds = getAllowedPaymentMethodIds(selectedAccount);
    return settings.paymentMethods.filter(m => allowedIds.includes(m.id));
  }, [selectedAccount, settings.paymentMethods, getAllowedPaymentMethodIds]);

  const canUseInstallments = mode === 'expense' && isCreditCard(paymentMethodId);
  const effectiveInstallments = canUseInstallments ? Number(installments) || 1 : 1;

  useEffect(() => {
    if (!open) return;

    setErrors({});
    setShowConvertConfirm(false);
    setPendingDraft(null);
    const firstAcc = settings.accounts[0]?.id || '';
    const secondAcc = settings.accounts[1]?.id || settings.accounts[0]?.id || '';
    const initialAcc = defaultAccount || firstAcc;

    if (!editing) {
      setMode('expense');
      setDescription('');
      setValue('');
      setDate(defaultDate);
      setTypeId(typesByDirection.expense[0]?.id || '');
      setAccountId(initialAcc);
      // Determine initial payment method
      const acc = findAccount(initialAcc);
      const allowedIds = getAllowedPaymentMethodIds(acc);
      const allowedMethods = settings.paymentMethods.filter(m => allowedIds.includes(m.id));
      setPaymentMethodId(allowedMethods[0]?.id || '');
      setInstallments(1);
      setIsRecurring(Boolean(initialRecurring));
      setRecurringLimitKind('infinite');
      setRecurringCount(3);
      setFromAccountId(firstAcc);
      setToAccountId(secondAcc);
      return;
    }

    if (editing.kind === 'transfer') {
      setMode('transfer');
      setValue(String(editing.outgoing.value));
      setDate(editing.outgoing.date);
      setFromAccountId(editing.outgoing.accountId);
      setToAccountId(editing.incoming.accountId);
      setDescription('');
      setTypeId(TRANSFER_TYPE_ID);
      setAccountId(editing.outgoing.accountId);
      setPaymentMethodId(settings.paymentMethods[0]?.id || '');
      setInstallments(1);
      setIsRecurring(false);
    } else if (editing.kind === 'installments') {
      const first = editing.series[0];
      setMode('expense');
      setDescription(first.description);
      const total = editing.series.reduce((sum, tx) => sum + tx.value, 0);
      setValue(total.toFixed(2));
      setDate(first.date);
      setTypeId(first.typeId);
      setAccountId(first.accountId);
      if (first.paymentMethodId) setPaymentMethodId(first.paymentMethodId);
      setInstallments(editing.series.length);
      setIsRecurring(false);
      setFromAccountId(firstAcc);
      setToAccountId(secondAcc);
    } else if (editing.kind === 'recurring') {
      const first = editing.series[0];
      setMode(first.direction);
      setDescription(first.description);
      setValue(String(first.value));
      setDate(first.date);
      setTypeId(first.typeId);
      setAccountId(first.accountId);
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
      setToAccountId(secondAcc);
    } else {
      const tx = editing.transaction;
      setMode(tx.direction);
      setDescription(tx.description);
      setValue(String(tx.value));
      setDate(tx.date);
      setTypeId(tx.typeId);
      setAccountId(tx.accountId);
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
      setToAccountId(secondAcc);
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

    if (mode !== 'transfer' && !normalizedDescription) {
      nextErrors.description = t('transactions.errors.enterDescription');
    }
    if (!value || !Number.isFinite(normalizedValue) || normalizedValue <= 0) {
      nextErrors.value = t('transactions.errors.enterValue');
    }
    if (effectiveInstallments > 1 && normalizedValue < effectiveInstallments * 0.01) {
      nextErrors.value = t('transactions.errors.valueTooSmall');
    }
    if (!date) {
      nextErrors.date = t('transactions.errors.chooseDate');
    }
    if (mode === 'transfer' && fromAccountId === toAccountId) {
      nextErrors.banks = t('transactions.errors.differentAccounts');
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !date) return;

    let draft: TransactionDraft;
    if (mode === 'transfer') {
      draft = {
        kind: 'transfer',
        date,
        value: normalizedValue,
        fromAccountId,
        toAccountId,
      };
    } else if (isRecurring) {
      draft = {
        kind: 'recurring',
        transaction: {
          description: normalizedDescription,
          direction: mode,
          typeId,
          accountId,
          ...(mode === 'expense' ? { paymentMethodId } : {}),
        },
        startDate: date,
        value: normalizedValue,
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
          paymentMethodId,
        },
        firstDate: date,
        totalValue: normalizedValue,
        count: effectiveInstallments,
      };
    } else {
      draft = {
        kind: 'single',
        transaction: {
          description: normalizedDescription,
          value: normalizedValue,
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
    return settings.accounts.map(a => ({
      value: a.id,
      label: a.name,
    }));
  }, [settings.accounts]);

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
        <DialogContent className="gap-0 overflow-hidden border-border bg-popover p-0 text-foreground shadow-2xl sm:max-w-2xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader className="border-b border-border p-6 pr-14">
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

            <div className="space-y-6 p-6">
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
                      ? t('transactions.valuePerMonth')
                      : effectiveInstallments > 1
                        ? t('common.totalValue')
                        : t('common.value')}
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

                {!isTransfer ? (
                  <>
                    <OptionSelect
                      label={t('common.category')}
                      value={typeId}
                      options={typeOptions}
                      onChange={setTypeId}
                    />
                    <OptionSelect
                      label={t('common.account')}
                      value={accountId}
                      options={accountOptions}
                      onChange={setAccountId}
                    />
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
                            totalValue={Number(value) || 0}
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
                    <OptionSelect
                      label={t('transactions.fromAccount')}
                      value={fromAccountId}
                      options={accountOptions}
                      onChange={setFromAccountId}
                      error={errors.banks}
                    />
                    <OptionSelect
                      label={t('transactions.toAccount')}
                      value={toAccountId}
                      options={accountOptions}
                      onChange={setToAccountId}
                      error={errors.banks}
                    />
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

            <DialogFooter className="border-t border-border p-6 sm:justify-between">
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
