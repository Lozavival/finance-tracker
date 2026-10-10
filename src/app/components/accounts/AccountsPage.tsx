import { type CardStatement } from '../../data/cardStatements';
import { type AccountLedger, getAccountForecast } from '../../data/ledger';
import { UpcomingList } from './UpcomingList';
import { CardBillSummary } from './CardBillSummary';
import { Card } from '../ui/card';
import { useState, useMemo } from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { UpcomingPeriodFilter, type UpcomingPeriodType } from '../transactions/UpcomingPeriodFilter';
import { formatCurrency, type Transaction } from '../../data/transactions';
import { parseLocalDate, formatShort } from '../../data/dates';
import { useSettings } from '../../state/SettingsContext';
import { getAccountColor, type AccountConfig } from '../../data/settings';
import { AccountFormDialog } from './AccountFormDialog';

type AccountsPageProps = {
  finance: {
    statements: CardStatement[];
    ledgers: Record<string, AccountLedger>;
    today: Date;
  };
  transactions: Transaction[];
  onAccountSelect: (accountId: string) => void;
};

export function AccountsPage({ finance, transactions, onAccountSelect }: AccountsPageProps) {
  const { settings, dispatch } = useSettings();
  const [upcomingPeriod, setUpcomingPeriod] = useState<UpcomingPeriodType>({ kind: 'end-of-month' });
  const [dialogOpen, setDialogOpen] = useState(false);

  const horizonEnd = useMemo(() => {
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

  let totalBalance = 0;
  let totalIn = 0;
  let totalOut = 0;
  let totalProjected = 0;

  const cards = settings.accounts.map(acc => {
    const details = acc;
    const ledger = finance.ledgers[acc.id];
    const forecast = getAccountForecast(ledger, finance.today, horizonEnd);

    totalBalance += forecast.current;
    totalIn += forecast.upcomingIn;
    totalOut += forecast.upcomingOut;
    totalProjected += forecast.projected;

    return (
      <Card
        key={acc.id}
        className="p-6 bg-foreground/5 backdrop-blur-xl border border-border hover:border-cyan-500/30 transition-all cursor-pointer group"
        onClick={() => onAccountSelect(acc.id)}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-sm"
              style={{ backgroundColor: getAccountColor(details.color) }}
            >
              {details.initials}
            </div>
            <div>
              <div className="text-foreground font-medium group-hover:text-theme-cyan transition-colors">
                {details.name}
              </div>
              <div className="text-muted-foreground text-sm">{details.kind}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-foreground text-xl font-medium">{formatCurrency(forecast.current / 100)}</div>
          </div>
        </div>

        <div className="mb-2">
          <CardBillSummary accountId={acc.id} account={acc} statements={finance.statements} />
          <div className="text-xs text-muted-foreground mb-2 mt-4 font-medium uppercase tracking-wider">Next up</div>
          <UpcomingList upcoming={forecast.upcoming} currentBalance={forecast.current} variant="compact" />
        </div>
        <div className="space-y-3 mt-6">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Upcoming In</span>
            <span className="text-theme-green">+{formatCurrency(forecast.upcomingIn / 100)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Upcoming Out</span>
            <span className="text-theme-red">{formatCurrency(forecast.upcomingOut / 100)}</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-border/50">
            <span className="text-foreground font-medium">Projected</span>
            <span className="text-foreground font-medium">{formatCurrency(forecast.projected / 100)}</span>
          </div>

          {forecast.lowest.balance < Math.min(forecast.current, forecast.projected) && (
            <div className="text-xs text-theme-orange mt-2 p-2 bg-orange-500/10 rounded-md">
              ⚠ Dips to {formatCurrency(forecast.lowest.balance / 100)} on {formatShort(forecast.lowest.date)}
            </div>
          )}

          <div className="pt-4 border-t border-border/50 flex items-center justify-between text-muted-foreground group-hover:text-theme-cyan transition-colors">
            <span className="text-sm font-medium">View Account Details</span>
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </Card>
    );
  });

  function handleSaveAccount(newAccount: AccountConfig) {
    dispatch({ type: 'account/add', payload: newAccount });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div role="heading" aria-level={1} className="text-foreground text-3xl mb-2">
            Accounts
          </div>
          <div className="text-muted-foreground">Manage your cash flow and upcoming bills.</div>
        </div>
        <div className="flex items-center gap-3">
          <UpcomingPeriodFilter value={upcomingPeriod} onChange={setUpcomingPeriod} />
        </div>
      </div>

      {/* Totals Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-foreground/5 border-border">
          <div className="text-sm text-muted-foreground mb-1">Total Balance</div>
          <div className="text-2xl text-foreground">{formatCurrency(totalBalance / 100)}</div>
        </Card>
        <Card className="p-4 bg-foreground/5 border-border">
          <div className="text-sm text-muted-foreground mb-1">Upcoming In</div>
          <div className="text-2xl text-theme-green">+{formatCurrency(totalIn / 100)}</div>
        </Card>
        <Card className="p-4 bg-foreground/5 border-border">
          <div className="text-sm text-muted-foreground mb-1">Upcoming Out</div>
          <div className="text-2xl text-theme-red">{formatCurrency(totalOut / 100)}</div>
        </Card>
        <Card className="p-4 bg-cyan-500/10 border-cyan-500/30">
          <div className="text-sm text-theme-cyan mb-1">Projected</div>
          <div className="text-2xl text-theme-cyan">{formatCurrency(totalProjected / 100)}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards}
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="group relative flex h-full min-h-[350px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border/80 bg-foreground/[0.02] p-6 text-center transition-all hover:border-cyan-500/50 hover:bg-cyan-500/[0.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 cursor-pointer"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border/80 text-muted-foreground shadow-sm transition-all group-hover:scale-105 group-hover:border-cyan-500/60 group-hover:bg-cyan-500/10 group-hover:text-theme-cyan">
            <Plus className="h-6 w-6" />
          </div>
          <span className="text-sm font-medium text-muted-foreground transition-colors group-hover:text-theme-cyan">
            Add account
          </span>
        </button>
      </div>

      <AccountFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        transactions={transactions}
        onSave={handleSaveAccount}
      />
    </div>
  );
}
