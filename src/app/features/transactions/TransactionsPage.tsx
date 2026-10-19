import { getToday } from '@/data/dates';
import { useEffect, useMemo, useState } from 'react';
import { Plus, RotateCcw, Repeat } from 'lucide-react';
import { Button } from '@/components/primitives/button';
import { Card } from '@/components/primitives/card';
import { TransactionsMonthTable } from '@/components/shared/TransactionsMonthTable';
import { PeriodFilter } from '@/components/shared/filters/PeriodFilter';
import { TypeFilter } from './TypeFilter';
import { DirectionFilter } from './DirectionFilter';
import { PaymentFilter } from './PaymentFilter';
import { CurrencyFilter } from './CurrencyFilter';
import { RecurringRulesDialog } from './RecurringRulesDialog';
import {
  resolvePeriodRange,
  sortTransactionsDescending,
  type PeriodFilter as PeriodFilterType,
  type Transaction,
  type TransactionDirection,
  groupToAccrualBasis,
} from '@/data/transactions';
import { TransactionDialogs } from '@/components/shared/transaction-dialogs/TransactionDialogs';
import { useTransactionActions } from '@/state/useTransactionActions';
import { useFinance } from '@/state/FinanceContext';
import { type SupportedCurrency } from '@/i18n/types';
import { useI18n } from '@/i18n';

type TransactionsPageProps = {
  transactions?: Transaction[];
  onTransactionsChange?: (transactions: Transaction[]) => void;
};

export function TransactionsPage({ transactions: propTransactions }: TransactionsPageProps) {
  const { t } = useI18n();
  const finance = useFinance();
  const transactions = propTransactions ?? finance.transactions;
  const [period, setPeriod] = useState<PeriodFilterType>({ kind: 'preset', days: 30 });
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [direction, setDirection] = useState<'all' | TransactionDirection>('all');
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [currencyFilter, setCurrencyFilter] = useState<'all' | SupportedCurrency>('all');
  const [recurringRulesOpen, setRecurringRulesOpen] = useState(false);

  useEffect(() => {
    const range = resolvePeriodRange(period);
    void finance.ensureTransactionsLoaded(range ? range.from : null);
  }, [period, finance]);

  const {
    dialogOpen,
    setDialogOpen,
    editingTarget,
    setEditingTarget,
    deleteTarget,
    setDeleteTarget,
    initialRecurring,
    openAddDialog,
    openEditDialog,
    saveTransaction,
    deleteTransaction,
  } = useTransactionActions();

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
      if (currencyFilter !== 'all' && transaction.currency !== currencyFilter) {
        return false;
      }
      return true;
    });

    return sortTransactionsDescending(filtered);
  }, [period, selectedTypes, direction, selectedPayments, currencyFilter, transactions]);

  const filtersActive =
    !(period.kind === 'preset' && period.days === 30) ||
    selectedTypes.length > 0 ||
    direction !== 'all' ||
    selectedPayments.length > 0 ||
    currencyFilter !== 'all';

  function resetFilters() {
    setPeriod({ kind: 'preset', days: 30 });
    setSelectedTypes([]);
    setDirection('all');
    setSelectedPayments([]);
    setCurrencyFilter('all');
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div role="heading" aria-level={1} className="text-foreground text-3xl mb-2">
            {t('transactions.title')}
          </div>
          <div className="text-muted-foreground">{t('transactions.subtitle')}</div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setRecurringRulesOpen(true)}
            className="border-border bg-foreground/5 hover:bg-foreground/10 text-foreground"
          >
            <Repeat className="mr-2 h-4 w-4 text-theme-cyan" />
            {t('transactions.recurringRules')}
          </Button>
          <Button variant="cyan" onClick={() => openAddDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            {t('transactions.addTransaction')}
          </Button>
        </div>
      </div>

      <Card className="gap-0 backdrop-blur-xl overflow-hidden">
        <div className="p-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <PeriodFilter value={period} onChange={setPeriod} />
            <TypeFilter value={selectedTypes} onChange={setSelectedTypes} />
            <DirectionFilter value={direction} onChange={setDirection} />
            <PaymentFilter value={selectedPayments} onChange={setSelectedPayments} />
            <CurrencyFilter value={currencyFilter} onChange={setCurrencyFilter} />

            {filtersActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-theme-cyan hover:bg-theme-cyan/10 hover:text-theme-cyan"
              >
                <RotateCcw className="mr-1 h-4 w-4" />
                {t('common.clearFilters')}
              </Button>
            )}

            <div className="text-muted-foreground text-sm mt-1">
              {visibleTransactions.length === 1
                ? t('common.singleTransaction')
                : t('common.transactionsCount', { count: visibleTransactions.length })}
            </div>
          </div>
        </div>

        <TransactionsMonthTable transactions={visibleTransactions} onEdit={openEditDialog} onDelete={setDeleteTarget} />

        {visibleTransactions.length === 0 && (
          <div className="min-h-64 border-t border-border/50 flex flex-col items-center justify-center p-8 text-center">
            <div className="text-foreground mb-1">{t('transactions.noTransactionsFound')}</div>
            <div className="text-muted-foreground text-sm mb-5">{t('transactions.noTransactionsFilterDesc')}</div>
            {filtersActive && (
              <Button
                variant="outline"
                onClick={resetFilters}
                className="border-border bg-foreground/5 text-foreground hover:bg-foreground/10 hover:text-foreground"
              >
                <RotateCcw className="h-4 w-4" />
                {t('common.clearFilters')}
              </Button>
            )}
          </div>
        )}
      </Card>

      <RecurringRulesDialog
        open={recurringRulesOpen}
        onOpenChange={setRecurringRulesOpen}
        onAddNew={() => openAddDialog({ recurring: true })}
      />

      <TransactionDialogs
        dialogOpen={dialogOpen}
        setDialogOpen={setDialogOpen}
        editingTarget={editingTarget}
        setEditingTarget={setEditingTarget}
        deleteTarget={deleteTarget}
        setDeleteTarget={setDeleteTarget}
        defaultDate={getToday()}
        initialRecurring={initialRecurring}
        onSave={saveTransaction}
        onDelete={deleteTransaction}
      />
    </div>
  );
}
