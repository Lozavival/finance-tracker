import { getToday } from '../data/dates';
import { useMemo, useState } from 'react';
import { Plus, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { TransactionsMonthTable } from './transactions/TransactionsMonthTable';
import { PeriodFilter } from './transactions/PeriodFilter';
import { TypeFilter } from './transactions/TypeFilter';
import { DirectionFilter } from './transactions/DirectionFilter';
import { PaymentFilter } from './transactions/PaymentFilter';
import {
  resolvePeriodRange,
  sortTransactionsDescending,
  type PeriodFilter as PeriodFilterType,
  type Transaction,
  type TransactionDirection,
  groupToAccrualBasis,
} from '../data/transactions';
import { TransactionDialogs } from './transactions/TransactionDialogs';
import { useTransactionActions } from '../hooks/useTransactionActions';

type TransactionsPageProps = {
  transactions: Transaction[];
  onTransactionsChange: (transactions: Transaction[]) => void;
};

export function TransactionsPage({ transactions, onTransactionsChange }: TransactionsPageProps) {
  const [period, setPeriod] = useState<PeriodFilterType>({ kind: 'up-to-today' });
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [direction, setDirection] = useState<'all' | TransactionDirection>('all');
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);

  const {
    dialogOpen,
    setDialogOpen,
    editingTarget,
    setEditingTarget,
    deleteTarget,
    setDeleteTarget,
    openAddDialog,
    openEditDialog,
    saveTransaction,
    deleteTransaction,
  } = useTransactionActions(transactions, onTransactionsChange);

  const visibleTransactions = useMemo(() => {
    const periodRange = resolvePeriodRange(period);
    const accrualTransactions = groupToAccrualBasis(transactions);

    const filtered = accrualTransactions.filter(transaction => {
      if (periodRange) {
        if (transaction.date < periodRange.from || transaction.date > periodRange.to) {
          return false;
        }
      }
      if (selectedTypes.length > 0 && !selectedTypes.includes(transaction.typeId)) {
        return false;
      }
      if (direction !== 'all' && transaction.direction !== direction) {
        return false;
      }
      if (selectedPayments.length > 0) {
        if (!transaction.paymentMethodId || !selectedPayments.includes(transaction.paymentMethodId)) {
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

      <TransactionDialogs
        dialogOpen={dialogOpen}
        setDialogOpen={setDialogOpen}
        editingTarget={editingTarget}
        setEditingTarget={setEditingTarget}
        deleteTarget={deleteTarget}
        setDeleteTarget={setDeleteTarget}
        defaultDate={getToday()}
        onSave={saveTransaction}
        onDelete={deleteTransaction}
      />
    </div>
  );
}
