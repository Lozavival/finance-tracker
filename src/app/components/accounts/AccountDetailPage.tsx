import { getToday } from '../../data/dates';
import { type CardStatement } from '../../data/cardStatements';
import { type AccountLedger, getAccountForecast } from '../../data/ledger';
import { buildDailySeries } from '../../data/ledger';
import { UpcomingList } from './UpcomingList';
import { CardStatementsPanel } from './CardStatementsPanel';
import { BalanceProjectionChart } from './BalanceProjectionChart';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import {
  formatCurrency,
  resolvePeriodRange,
  type PeriodFilter as PeriodFilterType,
  sortTransactionsDescending,
  type Transaction,
} from '../../data/transactions';
import { ArrowLeft, Pencil } from 'lucide-react';
import { TransactionsMonthTable } from '../transactions/TransactionsMonthTable';
import { useTransactionActions } from '../../hooks/useTransactionActions';
import { TransactionDialogs } from '../transactions/TransactionDialogs';
import { useMemo, useState } from 'react';
import { PeriodFilter } from '../transactions/PeriodFilter';
import { UpcomingPeriodFilter, type UpcomingPeriodType } from '../transactions/UpcomingPeriodFilter';
import { parseLocalDate } from '../../data/dates';
import { useSettings } from '../../state/SettingsContext';
import { getAccountColor, type AccountConfig } from '../../data/settings';
import { AccountFormDialog } from './AccountFormDialog';

type AccountDetailPageProps = {
  accountId: string;
  finance: {
    statements: CardStatement[];
    ledgers: Record<string, AccountLedger>;
    today: Date;
  };
  transactions: Transaction[];
  onTransactionsChange: (txs: Transaction[]) => void;
  onBack: () => void;
};

export function AccountDetailPage({
  accountId,
  finance,
  transactions,
  onTransactionsChange,
  onBack,
}: AccountDetailPageProps) {
  const { findAccount, dispatch } = useSettings();
  const details = findAccount(accountId);
  const ledger = finance.ledgers[accountId];

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [upcomingPeriod, setUpcomingPeriod] = useState<UpcomingPeriodType>({ kind: 'end-of-month' });

  const upcomingLimitDate = useMemo(() => {
    if (upcomingPeriod.kind === 'all') return parseLocalDate('2030-01-01');
    if (upcomingPeriod.kind === 'custom') return upcomingPeriod.until || parseLocalDate('2030-01-01');
    if (upcomingPeriod.kind === 'end-of-month') {
      const y = finance.today.getFullYear();
      const m = finance.today.getMonth() + 1;
      const lastDay = new Date(y, m, 0).getDate();
      return new Date(y, m - 1, lastDay, 0, 0, 0, 0);
    }
    const d = new Date(finance.today);
    d.setDate(d.getDate() + upcomingPeriod.days);
    return d;
  }, [finance.today, upcomingPeriod]);

  // Forecast used in header cards and upcoming list
  const fullForecast = getAccountForecast(ledger, finance.today, upcomingLimitDate);

  let chartEndDate = upcomingLimitDate;
  if (upcomingPeriod.kind === 'all' || (upcomingPeriod.kind === 'custom' && !upcomingPeriod.until)) {
    if (fullForecast.upcoming.length > 0) {
      chartEndDate = fullForecast.upcoming[fullForecast.upcoming.length - 1].date;
    } else {
      const fallback = new Date(finance.today);
      fallback.setDate(fallback.getDate() + 30);
      chartEndDate = fallback;
    }
  }

  const dFrom = new Date(finance.today);
  dFrom.setDate(dFrom.getDate() - 30);
  const series = buildDailySeries(ledger, dFrom, chartEndDate, finance.today);

  const {
    dialogOpen,
    setDialogOpen,
    editingTarget,
    setEditingTarget,
    deleteTarget,
    setDeleteTarget,
    openEditDialog,
    saveTransaction,
    deleteTransaction,
  } = useTransactionActions(transactions, onTransactionsChange);

  const [period, setPeriod] = useState<PeriodFilterType>({ kind: 'up-to-today' });

  const visibleTransactions = useMemo(() => {
    const periodRange = resolvePeriodRange(period, finance.today);
    const filtered = transactions
      .filter(t => t.accountId === accountId)
      .filter(transaction => {
        if (periodRange) {
          if (
            transaction.date.getTime() < periodRange.from.getTime() ||
            transaction.date.getTime() > periodRange.to.getTime()
          ) {
            return false;
          }
        }
        return true;
      });
    return sortTransactionsDescending(filtered);
  }, [period, transactions, accountId, finance.today]);

  if (!details) {
    return (
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Accounts
        </button>
        <div className="text-foreground text-xl">Account not found</div>
      </div>
    );
  }

  function handleSaveAccount(updated: AccountConfig) {
    dispatch({
      type: 'account/update',
      payload: {
        id: updated.id,
        changes: {
          name: updated.name,
          kind: updated.kind,
          initials: updated.initials,
          color: updated.color,
          openingBalance: updated.openingBalance,
          openingDate: updated.openingDate,
          card: updated.card,
        },
      },
    });
  }

  return (
    <div className="space-y-8">
      <button
        onClick={onBack}
        className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Accounts
      </button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-medium shadow-sm flex-shrink-0"
            style={{ backgroundColor: getAccountColor(details.color) }}
          >
            {details.initials}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <div role="heading" aria-level={1} className="text-foreground text-3xl mb-1">
                {details.name}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditDialogOpen(true)}
                className="h-8 gap-1.5 border-border bg-foreground/5 text-foreground hover:bg-foreground/10 text-xs"
              >
                <Pencil className="w-3.5 h-3.5 text-theme-cyan" />
                Edit account
              </Button>
            </div>
            <div className="text-muted-foreground">{details.kind}</div>
          </div>
        </div>
        <div className="flex gap-2 mb-1">
          <UpcomingPeriodFilter value={upcomingPeriod} onChange={setUpcomingPeriod} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-foreground/5 border-border">
          <div className="text-sm text-muted-foreground mb-1">Current Balance</div>
          <div className="text-2xl text-foreground">{formatCurrency(fullForecast.current / 100)}</div>
        </Card>
        <Card className="p-4 bg-foreground/5 border-border">
          <div className="text-sm text-muted-foreground mb-1">Upcoming In</div>
          <div className="text-2xl text-theme-green">+{formatCurrency(fullForecast.upcomingIn / 100)}</div>
        </Card>
        <Card className="p-4 bg-foreground/5 border-border">
          <div className="text-sm text-muted-foreground mb-1">Upcoming Out</div>
          <div className="text-2xl text-theme-red">{formatCurrency(fullForecast.upcomingOut / 100)}</div>
        </Card>
        <Card className="p-4 bg-cyan-500/10 border-cyan-500/30">
          <div className="text-sm text-theme-cyan mb-1">Projected</div>
          <div className="text-2xl text-theme-cyan">{formatCurrency(fullForecast.projected / 100)}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 bg-foreground/5 border-border lg:col-span-2">
          <div className="text-xl text-foreground mb-4">Balance Projection</div>
          <BalanceProjectionChart series={series} today={finance.today} />
        </Card>

        <Card className="p-6 bg-foreground/5 border-border">
          <div className="text-xl text-foreground mb-4">Upcoming</div>
          <UpcomingList upcoming={fullForecast.upcoming} currentBalance={fullForecast.current} variant="full" />
        </Card>
      </div>

      <CardStatementsPanel accountId={accountId} statements={finance.statements} />

      <Card className="p-6 bg-foreground/5 border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
          <div className="text-xl text-foreground">Transactions</div>
          <div className="w-[200px]">
            <PeriodFilter value={period} onChange={setPeriod} />
          </div>
        </div>
        <TransactionsMonthTable
          transactions={visibleTransactions}
          onEdit={openEditDialog}
          onDelete={setDeleteTarget}
          showAccount={false}
        />
      </Card>

      <TransactionDialogs
        dialogOpen={dialogOpen}
        setDialogOpen={setDialogOpen}
        editingTarget={editingTarget}
        setEditingTarget={setEditingTarget}
        deleteTarget={deleteTarget}
        setDeleteTarget={setDeleteTarget}
        defaultDate={getToday()}
        defaultAccount={accountId}
        onSave={saveTransaction}
        onDelete={deleteTransaction}
      />

      <AccountFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        account={details}
        transactions={transactions}
        onSave={handleSaveAccount}
      />
    </div>
  );
}
