import { useMemo, useState } from 'react';
import { Plus, RotateCcw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { TransactionDialog, EditingTarget } from './TransactionDialog';
import { TransactionsMonthTable } from './transactions/TransactionsMonthTable';
import { PeriodFilter } from './transactions/PeriodFilter';
import { TypeFilter } from './transactions/TypeFilter';
import { DirectionFilter } from './transactions/DirectionFilter';
import { PaymentFilter } from './transactions/PaymentFilter';
import {
  buildTransferLegs,
  createTransactionId,
  findTransferLegs,
  formatTransactionDate,
  resolvePeriodRange,
  sortTransactionsDescending,
  type PeriodFilter as PeriodFilterType,
  type Transaction,
  type TransactionDirection,
  type TransactionType,
  type TransactionDraft,
  type PaymentMethod,
} from '../data/transactions';
import { buildInstallments, findInstallmentSeries } from '../data/installments';

type TransactionsPageProps = {
  transactions: Transaction[];
  defaultMonth: { from: Date; to: Date };
  onTransactionsChange: (transactions: Transaction[]) => void;
};

export function TransactionsPage({ transactions, defaultMonth, onTransactionsChange }: TransactionsPageProps) {
  const [period, setPeriod] = useState<PeriodFilterType>({ kind: 'up-to-today' });
  const [selectedTypes, setSelectedTypes] = useState<TransactionType[]>([]);
  const [direction, setDirection] = useState<'all' | TransactionDirection>('all');
  const [selectedPayments, setSelectedPayments] = useState<PaymentMethod[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<EditingTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  const visibleTransactions = useMemo(() => {
    const periodRange = resolvePeriodRange(period);

    const filtered = transactions.filter(transaction => {
      if (periodRange) {
        if (transaction.date < periodRange.from || transaction.date > periodRange.to) {
          return false;
        }
      }
      if (selectedTypes.length > 0 && !selectedTypes.includes(transaction.type)) {
        return false;
      }
      if (direction !== 'all' && transaction.direction !== direction) {
        return false;
      }
      if (selectedPayments.length > 0) {
        if (!transaction.paymentMethod || !selectedPayments.includes(transaction.paymentMethod)) {
          return false;
        }
      }
      return true;
    });

    return sortTransactionsDescending(filtered);
  }, [period, selectedTypes, direction, selectedPayments, transactions]);

  const filtersActive =
    period.kind !== 'up-to-today' || selectedTypes.length > 0 || direction !== 'all' || selectedPayments.length > 0;

  function resetFilters() {
    setPeriod({ kind: 'up-to-today' });
    setSelectedTypes([]);
    setDirection('all');
    setSelectedPayments([]);
  }

  function openAddDialog() {
    setEditingTarget(null);
    setDialogOpen(true);
  }

  function openEditDialog(transaction: Transaction) {
    const legs = findTransferLegs(transactions, transaction);
    const series = findInstallmentSeries(transactions, transaction);
    if (legs) {
      setEditingTarget({ kind: 'transfer', outgoing: legs.outgoing, incoming: legs.incoming });
    } else if (series) {
      setEditingTarget({ kind: 'installments', series });
    } else {
      setEditingTarget({ kind: 'single', transaction });
    }
    setDialogOpen(true);
  }

  function saveTransaction(draft: TransactionDraft) {
    let nextTransactions = [...transactions];
    let existingIds: string[] = [];
    let groupId = createTransactionId();
    let transferId = createTransactionId();

    // Remove existing if editing
    if (editingTarget) {
      if (editingTarget.kind === 'single') {
        existingIds = [editingTarget.transaction.id];
        nextTransactions = nextTransactions.filter(t => t.id !== editingTarget.transaction.id);
      } else if (editingTarget.kind === 'transfer') {
        existingIds = [editingTarget.outgoing.id, editingTarget.incoming.id];
        transferId = editingTarget.outgoing.transferId!;
        nextTransactions = nextTransactions.filter(t => t.transferId !== transferId);
      } else if (editingTarget.kind === 'installments') {
        existingIds = editingTarget.series.map(t => t.id);
        groupId = editingTarget.series[0].installment!.groupId;
        nextTransactions = nextTransactions.filter(t => t.installment?.groupId !== groupId);
      }
    }

    if (draft.kind === 'single') {
      const id = existingIds[0] ?? createTransactionId();
      nextTransactions.push({ ...draft.transaction, id });
    } else if (draft.kind === 'transfer') {
      const ids: [string, string] = [existingIds[0] ?? createTransactionId(), existingIds[1] ?? createTransactionId()];
      const legs = buildTransferLegs(draft, transferId, ids);
      nextTransactions.push(legs[0], legs[1]);
    } else if (draft.kind === 'installments') {
      // Safety net: check if payment method is still credit card.
      // Handled partly by the dialog, but let's ensure it here.
      if (draft.transaction.paymentMethod !== 'Credit card') {
        const id = existingIds[0] ?? createTransactionId();
        nextTransactions.push({
          ...draft.transaction,
          id,
          date: draft.firstDate,
          value: draft.totalValue,
        });
      } else {
        const ids = Array.from({ length: draft.count }, (_, i) => existingIds[i] ?? createTransactionId());
        const newInstallments = buildInstallments(draft, groupId, ids);
        nextTransactions.push(...newInstallments);
      }
    }

    onTransactionsChange(nextTransactions);
    setDialogOpen(false);
    setEditingTarget(null);
  }

  function deleteTransaction() {
    if (!deleteTarget) return;

    if (deleteTarget.transferId) {
      onTransactionsChange(transactions.filter(t => t.transferId !== deleteTarget.transferId));
    } else if (deleteTarget.installment) {
      onTransactionsChange(transactions.filter(t => t.installment?.groupId !== deleteTarget.installment!.groupId));
    } else {
      onTransactionsChange(transactions.filter(t => t.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div role="heading" aria-level={1} className="text-foreground text-3xl mb-2">
            Transaction History
          </div>
          <div className="text-muted-foreground">Review, filter, and manage your financial activity.</div>
        </div>
        <Button
          onClick={openAddDialog}
          className="bg-theme-cyan-btn text-white dark:text-gray-950 hover:bg-theme-cyan-btn-hover shadow-lg shadow-cyan-500/20"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add transaction
        </Button>
      </div>

      <Card className="gap-0 backdrop-blur-xl overflow-hidden">
        <div className="p-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <PeriodFilter value={period} onChange={setPeriod} />
            <TypeFilter value={selectedTypes} onChange={setSelectedTypes} />
            <DirectionFilter value={direction} onChange={setDirection} />
            <PaymentFilter value={selectedPayments} onChange={setSelectedPayments} />

            {filtersActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-theme-cyan hover:bg-cyan-500/10 hover:text-theme-cyan"
              >
                <RotateCcw className="mr-1 h-4 w-4" />
                Clear filters
              </Button>
            )}

            <div className="text-muted-foreground text-sm mt-1">
              {visibleTransactions.length} {visibleTransactions.length === 1 ? 'transaction' : 'transactions'}
            </div>
          </div>
        </div>

        <TransactionsMonthTable transactions={visibleTransactions} onEdit={openEditDialog} onDelete={setDeleteTarget} />

        {visibleTransactions.length === 0 && (
          <div className="min-h-64 border-t border-border/50 flex flex-col items-center justify-center p-8 text-center">
            <div className="text-foreground mb-1">No transactions found</div>
            <div className="text-muted-foreground text-sm mb-5">Try a different period or transaction type.</div>
            {filtersActive && (
              <Button
                variant="outline"
                onClick={resetFilters}
                className="border-border bg-foreground/5 text-foreground hover:bg-foreground/10 hover:text-foreground"
              >
                <RotateCcw className="h-4 w-4" />
                Clear filters
              </Button>
            )}
          </div>
        )}
      </Card>

      <TransactionDialog
        open={dialogOpen}
        editing={editingTarget}
        defaultDate={defaultMonth.to}
        onOpenChange={open => {
          setDialogOpen(open);
          if (!open) setEditingTarget(null);
        }}
        onSave={saveTransaction}
      />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={open => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="bg-popover border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Exclude transaction?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {deleteTarget
                ? deleteTarget.transferId
                  ? `Both sides of this transfer will be removed.`
                  : deleteTarget.installment
                    ? `All ${deleteTarget.installment.total} installments of ${deleteTarget.description} will be removed.`
                    : `${deleteTarget.description} from ${formatTransactionDate(deleteTarget.date)} will be removed.`
                : 'This transaction will be removed for this session.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border bg-foreground/5 text-foreground hover:bg-foreground/10 hover:text-foreground">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteTransaction}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Exclude transaction
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
