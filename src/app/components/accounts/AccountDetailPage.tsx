import { getToday } from '../../data/dates';
import { type Account } from '../../data/transactions';
import { type CardStatement } from '../../data/cardStatements';
import { type AccountLedger, getAccountForecast } from '../../data/ledger';
import { buildDailySeries } from '../../data/ledger';
import { UpcomingList } from './UpcomingList';
import { CardStatementsPanel } from './CardStatementsPanel';
import { BalanceProjectionChart } from './BalanceProjectionChart';
import { ACCOUNT_DETAILS } from '../../data/accounts';
import { Card } from '../ui/card';
import {
  formatCurrency,
  resolvePeriodRange,
  type PeriodFilter as PeriodFilterType,
  sortTransactionsDescending,
} from '../../data/transactions';
import { ArrowLeft } from 'lucide-react';
import { TransactionsMonthTable } from '../transactions/TransactionsMonthTable';
import { useTransactionActions } from '../../hooks/useTransactionActions';
import { TransactionDialogs } from '../transactions/TransactionDialogs';
import { useMemo, useState } from 'react';
import { PeriodFilter } from '../transactions/PeriodFilter';
import { UpcomingPeriodFilter, type UpcomingPeriodType } from '../transactions/UpcomingPeriodFilter';
import { parseLocalDate } from '../../data/dates';

type AccountDetailPageProps = {
  account: Account;
  finance: {
    statements: CardStatement[];
    ledgers: Record<Account, AccountLedger>;
    today: Date;
  };
  transactions: any[];
  onTransactionsChange: (txs: any[]) => void;
  onBack: () => void;
};

export function AccountDetailPage({
  account,
  finance,
  transactions,
  onTransactionsChange,
  onBack,
}: AccountDetailPageProps) {
  const details = ACCOUNT_DETAILS[account];
  const ledger = finance.ledgers[account];

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

  const y = finance.today.getFullYear();
  const m = finance.today.getMonth() + 1;
  const lastDay = new Date(y, m, 0).getDate();
  const eom = new Date(y, m - 1, lastDay, 0, 0, 0, 0);

  const dFrom = new Date(finance.today);
  dFrom.setDate(dFrom.getDate() - 30);
  const series = buildDailySeries(ledger, dFrom, eom, finance.today);

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
      .filter(t => t.account === account)
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
  }, [period, transactions, account, finance.today]);

  return (
    <div className="space-y-8">
      <button
        onClick={onBack}
        className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Accounts
      </button>

      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg`}
          style={{ backgroundColor: details.color }}
        >
          {details.initials}
        </div>
        <div>
          <div role="heading" aria-level={1} className="text-foreground text-3xl mb-1">
            {details.name}
          </div>
          <div className="text-muted-foreground">{details.kind}</div>
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

      <Card className="p-6 bg-foreground/5 border-border">
        <div className="text-xl text-foreground mb-4">Balance Projection</div>
        <BalanceProjectionChart series={series} today={finance.today} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Card className="p-6 bg-foreground/5 border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
            <div className="text-xl text-foreground">Upcoming</div>
            <div>
              <UpcomingPeriodFilter value={upcomingPeriod} onChange={setUpcomingPeriod} />
            </div>
          </div>
          <UpcomingList upcoming={fullForecast.upcoming} currentBalance={fullForecast.current} variant="full" />
        </Card>
        <CardStatementsPanel account={account} statements={finance.statements} />
      </div>

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
        defaultAccount={account}
        onSave={saveTransaction}
        onDelete={deleteTransaction}
      />
    </div>
  );
}
