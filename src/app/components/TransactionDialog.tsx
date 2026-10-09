import { useEffect, useState, type FormEvent } from 'react';
import { Check, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { DirectionToggle, DialogMode } from './transactions/DirectionToggle';
import { OptionSelect } from './transactions/OptionSelect';
import { DateField } from './transactions/DateField';
import { InstallmentsField } from './transactions/InstallmentsField';
import {
  ACCOUNTS,
  EXPENSE_TYPES,
  INCOME_TYPES,
  PAYMENT_METHODS,
  type Account,
  type Transaction,
  type TransactionType,
  type PaymentMethod,
  type TransactionDraft,
} from '../data/transactions';

export type EditingTarget =
  | { kind: 'single'; transaction: Transaction }
  | { kind: 'transfer'; outgoing: Transaction; incoming: Transaction }
  | { kind: 'installments'; series: Transaction[] };

type TransactionDialogProps = {
  open: boolean;
  editing: EditingTarget | null;
  defaultDate: Date;
  defaultAccount?: Account;
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
  const [mode, setMode] = useState<DialogMode>('expense');
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [date, setDate] = useState<Date | undefined>(defaultDate);
  const [type, setType] = useState<TransactionType>('Shopping');
  const [account, setAccount] = useState<Account>(defaultAccount || 'Bank of America');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Credit card');
  const [installments, setInstallments] = useState<number | ''>(1);

  // Transfer specific
  const [fromAccount, setFromAccount] = useState<Account>(ACCOUNTS[0]);
  const [toAccount, setToAccount] = useState<Account>(ACCOUNTS[1]);

  const [errors, setErrors] = useState<FormErrors>({});

  const canUseInstallments = mode === 'expense' && paymentMethod === 'Credit card';
  const effectiveInstallments = canUseInstallments ? Number(installments) || 1 : 1;

  useEffect(() => {
    if (!open) return;

    setErrors({});
    if (!editing) {
      setMode('expense');
      setDescription('');
      setValue('');
      setDate(defaultDate);
      setType('Shopping');
      setAccount(ACCOUNTS[0]);
      setPaymentMethod('Credit card');
      setInstallments(1);
      setFromAccount(ACCOUNTS[0]);
      setToAccount(ACCOUNTS[1]);
      return;
    }

    if (editing.kind === 'transfer') {
      setMode('transfer');
      setValue(String(editing.outgoing.value));
      setDate(editing.outgoing.date);
      setFromAccount(editing.outgoing.account);
      setToAccount(editing.incoming.account);
      // reset others
      setDescription('');
      setType('Transfer');
      setAccount(editing.outgoing.account);
      setPaymentMethod('Credit card');
      setInstallments(1);
    } else if (editing.kind === 'installments') {
      const first = editing.series[0];
      setMode('expense');
      setDescription(first.description);
      const total = editing.series.reduce((sum, tx) => sum + tx.value, 0);
      setValue(total.toFixed(2));
      setDate(first.date);
      setType(first.type);
      setAccount(first.account);
      if (first.paymentMethod) setPaymentMethod(first.paymentMethod);
      setInstallments(editing.series.length);
      setFromAccount(ACCOUNTS[0]);
      setToAccount(ACCOUNTS[1]);
    } else {
      const tx = editing.transaction;
      setMode(tx.direction);
      setDescription(tx.description);
      setValue(String(tx.value));
      setDate(tx.date);
      setType(tx.type);
      setAccount(tx.account);
      if (tx.paymentMethod) setPaymentMethod(tx.paymentMethod);
      setInstallments(1);
      setFromAccount(ACCOUNTS[0]);
      setToAccount(ACCOUNTS[1]);
    }
  }, [open, editing, defaultDate]);

  function handleModeChange(nextMode: DialogMode) {
    setMode(nextMode);
    if (nextMode === 'income' && !INCOME_TYPES.includes(type as any)) {
      setType(INCOME_TYPES[0]);
    } else if (nextMode === 'expense' && !EXPENSE_TYPES.includes(type as any)) {
      setType(EXPENSE_TYPES[0]);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FormErrors = {};
    const normalizedDescription = description.trim();
    const normalizedValue = Number(value);

    if (mode !== 'transfer' && !normalizedDescription) {
      nextErrors.description = 'Enter a description.';
    }
    if (!value || !Number.isFinite(normalizedValue) || normalizedValue <= 0) {
      nextErrors.value = 'Enter a value greater than zero.';
    }
    if (effectiveInstallments > 1 && normalizedValue < effectiveInstallments * 0.01) {
      nextErrors.value = 'Total value is too small to split.';
    }
    if (!date) {
      nextErrors.date = 'Choose a transaction date.';
    }
    if (mode === 'transfer' && fromAccount === toAccount) {
      nextErrors.banks = 'Origin and destination must be different.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !date) return;

    if (mode === 'transfer') {
      onSave({
        kind: 'transfer',
        date,
        value: normalizedValue,
        fromAccount,
        toAccount,
      });
    } else if (effectiveInstallments > 1) {
      onSave({
        kind: 'installments',
        transaction: {
          description: normalizedDescription,
          direction: mode,
          type,
          account,
          paymentMethod,
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
          type,
          account,
          ...(mode === 'expense' ? { paymentMethod } : {}),
        },
      });
    }
  }

  const isTransfer = mode === 'transfer';
  const isEditingSeries = editing?.kind === 'installments';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden border-border bg-popover p-0 text-foreground shadow-2xl sm:max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-border p-6 pr-14">
            <DialogTitle>{editing ? 'Edit transaction' : 'Add transaction'}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {isTransfer
                ? 'Move money between your accounts.'
                : editing
                  ? 'Update the details for this transaction.'
                  : 'Record income or an expense.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 p-6">
            <DirectionToggle value={mode} onChange={handleModeChange} />

            <div className="grid gap-5 sm:grid-cols-2">
              {!isTransfer && (
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="transaction-description" className="text-foreground">
                    Description
                  </Label>
                  <Input
                    id="transaction-description"
                    value={description}
                    onChange={event => setDescription(event.target.value)}
                    placeholder="e.g. Grocery store"
                    aria-invalid={Boolean(errors.description)}
                    className="h-11 border-border bg-foreground/5 text-foreground placeholder:text-muted-foreground"
                  />
                  {errors.description && <div className="text-red-400 text-sm">{errors.description}</div>}
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-foreground">{effectiveInstallments > 1 ? 'First installment' : 'Date'}</Label>
                <DateField
                  placeholder="Choose date"
                  value={date}
                  onChange={d => setDate(d)}
                  hasError={Boolean(errors.date)}
                  className="h-11"
                />
                {errors.date && <div className="text-red-400 text-sm">{errors.date}</div>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="transaction-value" className="text-foreground">
                  {effectiveInstallments > 1 ? 'Total value' : 'Value'}
                </Label>
                <Input
                  id="transaction-value"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={value}
                  onChange={event => setValue(event.target.value)}
                  placeholder="0.00"
                  aria-invalid={Boolean(errors.value)}
                  className="h-11 border-border bg-foreground/5 text-foreground placeholder:text-muted-foreground"
                />
                {errors.value && <div className="text-red-400 text-sm">{errors.value}</div>}
              </div>

              {!isTransfer ? (
                <>
                  <OptionSelect
                    label="Type"
                    value={type}
                    options={mode === 'income' ? INCOME_TYPES : EXPENSE_TYPES}
                    onChange={setType}
                  />
                  <OptionSelect label="Account" value={account} options={ACCOUNTS} onChange={setAccount} />
                  {mode === 'expense' && (
                    <>
                      <OptionSelect
                        label="Form of payment"
                        value={paymentMethod}
                        options={PAYMENT_METHODS}
                        onChange={setPaymentMethod}
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
                    label="From account"
                    value={fromAccount}
                    options={ACCOUNTS}
                    onChange={setFromAccount}
                    error={errors.banks}
                  />
                  <OptionSelect
                    label="To account"
                    value={toAccount}
                    options={ACCOUNTS}
                    onChange={setToAccount}
                    error={errors.banks}
                  />
                </>
              )}
            </div>
            {isEditingSeries && !canUseInstallments && (
              <div className="rounded-lg bg-orange-500/10 p-3 text-sm text-orange-400">
                Installments are only available for credit card. This will be saved as a single expense.
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
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-theme-cyan-btn text-white dark:text-gray-950 hover:bg-theme-cyan-btn-hover shadow-lg shadow-cyan-500/20"
            >
              {editing ? <Check className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
              {editing ? 'Save changes' : 'Add transaction'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
