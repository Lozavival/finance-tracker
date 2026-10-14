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
import { Input } from '@/components/primitives/input';
import { Label } from '@/components/primitives/label';
import { DirectionToggle, DialogMode } from './DirectionToggle';
import { OptionSelect } from '@/components/shared/OptionSelect';
import { DateField } from '@/components/shared/DateField';
import { InstallmentsField } from './InstallmentsField';
import { type Transaction, type TransactionDraft } from '@/data/transactions';
import { useSettings } from '@/state/SettingsContext';
import { CategoryChip } from '@/components/shared/CategoryChip';
import { getIcon } from '@/data/icons';
import { TRANSFER_TYPE_ID } from '@/data/settings';

import { useI18n } from '@/i18n';

export type EditingTarget =
  | { kind: 'single'; transaction: Transaction }
  | { kind: 'transfer'; outgoing: Transaction; incoming: Transaction }
  | { kind: 'installments'; series: Transaction[] };

type TransactionDialogProps = {
  open: boolean;
  editing: EditingTarget | null;
  defaultDate: Date;
  defaultAccount?: string;
  onOpenChange: (open: boolean) => void;
  onSave: (draft: TransactionDraft) => void;
};

type FormErrors = Partial<Record<'description' | 'value' | 'date' | 'banks', string>>;

export function TransactionDialog({
  open,
  editing,
  defaultDate,
  defaultAccount,
  onOpenChange,
  onSave,
}: TransactionDialogProps) {
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
      setFromAccountId(firstAcc);
      setToAccountId(secondAcc);
    }
  }, [open, editing, defaultDate, defaultAccount, settings, typesByDirection, findAccount, getAllowedPaymentMethodIds]);

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

    if (mode === 'transfer') {
      onSave({
        kind: 'transfer',
        date,
        value: normalizedValue,
        fromAccountId,
        toAccountId,
      });
    } else if (effectiveInstallments > 1) {
      onSave({
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
      });
    } else {
      onSave({
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
      });
    }
  }

  const isTransfer = mode === 'transfer';
  const isEditingSeries = editing?.kind === 'installments';

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden border-border bg-popover p-0 text-foreground shadow-2xl sm:max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-border p-6 pr-14">
            <DialogTitle>{editing ? t('transactions.editTransaction') : t('transactions.addTransaction')}</DialogTitle>
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
                  {errors.description && <div className="text-red-400 text-sm">{errors.description}</div>}
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-foreground">
                  {effectiveInstallments > 1 ? t('transactions.firstInstallment') : t('common.date')}
                </Label>
                <DateField
                  placeholder={t('transactions.chooseDate')}
                  value={date}
                  onChange={d => setDate(d)}
                  hasError={Boolean(errors.date)}
                  className="h-11"
                />
                {errors.date && <div className="text-red-400 text-sm">{errors.date}</div>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="transaction-value" className="text-foreground">
                  {effectiveInstallments > 1 ? t('common.totalValue') : t('common.value')}
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
                {errors.value && <div className="text-red-400 text-sm">{errors.value}</div>}
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
                      {canUseInstallments && (
                        <InstallmentsField
                          value={installments}
                          onChange={setInstallments}
                          totalValue={Number(value) || 0}
                        />
                      )}
                    </>
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
            {isEditingSeries && !canUseInstallments && (
              <div className="rounded-lg bg-orange-500/10 border border-orange-500/30 p-3 text-sm text-orange-800 dark:text-orange-400">
                {t('transactions.installmentsHint')}
              </div>
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
            <Button
              type="submit"
              className="bg-theme-cyan-btn text-white dark:text-gray-950 hover:bg-theme-cyan-btn-hover shadow-lg shadow-cyan-500/20"
            >
              {editing ? <Check className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
              {editing ? t('transactions.saveChanges') : t('transactions.addTransaction')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
