import { getToday } from '@/data/dates';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, RotateCcw, Repeat } from 'lucide-react';
import { Button } from '@/components/primitives/button';
import { Card } from '@/components/primitives/card';
import { Skeleton } from '@/components/primitives/skeleton';
import { TransactionsMonthTable } from '@/components/shared/TransactionsMonthTable';
import { PeriodFilter } from '@/components/shared/filters/PeriodFilter';
import { SearchFilter } from './SearchFilter';
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
import { useTransactionSearch } from '@/state/useTransactionSearch';
import { type SupportedCurrency } from '@/i18n/types';
import { useI18n } from '@/i18n';
import { SEARCH_MIN_LENGTH } from '@/data/search';

type TransactionsPageProps = {
  transactions?: Transaction[];
  onTransactionsChange?: (transactions: Transaction[]) => void;
};

export function TransactionsPage({ transactions: propTransactions }: TransactionsPageProps) {
  const { t } = useI18n();
  const finance = useFinance();
  const [searchParams, setSearchParams] = useSearchParams();

  const searchQuery = searchParams.get('q') ?? '';
  const isSearchActive = searchQuery.trim().length >= SEARCH_MIN_LENGTH;

  // Search results hook
  const {
    status: searchStatus,
    transactions: searchResults,
    tokens: searchTokens,
  } = useTransactionSearch(searchQuery, { limit: 1000 });

  // Default period: all-time if search active, 30 days preset otherwise
  const [period, setPeriod] = useState<PeriodFilterType>(() =>
    searchQuery.trim().length >= SEARCH_MIN_LENGTH ? { kind: 'all' } : { kind: 'preset', days: 30 },
  );

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [direction, setDirection] = useState<'all' | TransactionDirection>('all');
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [currencyFilter, setCurrencyFilter] = useState<'all' | SupportedCurrency>('all');
  const [recurringRulesOpen, setRecurringRulesOpen] = useState(false);

  // If a search query is loaded from URL, switch to 'all' if not already configured
  useEffect(() => {
    if (searchQuery.trim().length >= SEARCH_MIN_LENGTH) {
      setPeriod({ kind: 'all' });
    }
  }, [searchQuery]);

  // Ensure window is loaded for non-search views
  useEffect(() => {
    if (!isSearchActive) {
      const range = resolvePeriodRange(period);
      void finance.ensureTransactionsLoaded(range ? range.from : null);
    }
  }, [period, finance, isSearchActive]);

  // When search results arrive, ensure earlier history is loaded in FinanceContext
  // so editing transactions resolves installment and recurring series correctly
  useEffect(() => {
    if (isSearchActive && searchResults.length > 0) {
      let earliestDate = searchResults[0].date;
      for (const tx of searchResults) {
        if (tx.date.getTime() < earliestDate.getTime()) {
          earliestDate = tx.date;
        }
      }
      void finance.ensureTransactionsLoaded(earliestDate);
    }
  }, [isSearchActive, searchResults, finance]);

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

  // Pick data source: search results if searching, otherwise prop or context transactions
  const baseTransactions = isSearchActive ? searchResults : (propTransactions ?? finance.transactions);

  const visibleTransactions = useMemo(() => {
    const periodRange = resolvePeriodRange(period);
    const accrualTransactions = groupToAccrualBasis(baseTransactions);

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
  }, [period, selectedTypes, direction, selectedPayments, currencyFilter, baseTransactions]);

  const defaultPeriodIsActive = isSearchActive ? period.kind === 'all' : period.kind === 'preset' && period.days === 30;

  const filtersActive =
    searchQuery.trim().length > 0 ||
    !defaultPeriodIsActive ||
    selectedTypes.length > 0 ||
    direction !== 'all' ||
    selectedPayments.length > 0 ||
    currencyFilter !== 'all';

  function handleSearchChange(nextQ: string) {
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev);
        if (nextQ.trim()) {
          next.set('q', nextQ);
        } else {
          next.delete('q');
        }
        return next;
      },
      { replace: true },
    );
  }

  function resetFilters() {
    handleSearchChange('');
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
            <SearchFilter value={searchQuery} onChange={handleSearchChange} />
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
                className="text-theme-cyan hover:bg-theme-cyan/10 hover:text-theme-cyan cursor-pointer"
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

        {isSearchActive && searchStatus === 'loading' && visibleTransactions.length === 0 ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <TransactionsMonthTable
            transactions={visibleTransactions}
            onEdit={openEditDialog}
            onDelete={setDeleteTarget}
            highlightTokens={isSearchActive ? searchTokens : undefined}
          />
        )}

        {visibleTransactions.length === 0 && (!isSearchActive || searchStatus !== 'loading') && (
          <div className="min-h-64 border-t border-border/50 flex flex-col items-center justify-center p-8 text-center">
            <div className="text-foreground mb-1">
              {isSearchActive ? t('search.noResultsTitle') : t('transactions.noTransactionsFound')}
            </div>
            <div className="text-muted-foreground text-sm mb-5">
              {isSearchActive ? t('search.noResultsDesc') : t('transactions.noTransactionsFilterDesc')}
            </div>
            {filtersActive && (
              <Button
                variant="outline"
                onClick={resetFilters}
                className="border-border bg-foreground/5 text-foreground hover:bg-foreground/10 hover:text-foreground cursor-pointer"
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
