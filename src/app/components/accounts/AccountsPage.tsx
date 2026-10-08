import { type Account } from '../../data/transactions';
import { type CardStatement } from '../../data/cardStatements';
import { type AccountLedger, getAccountForecast, resolveHorizonEnd, type ForecastHorizon } from '../../data/ledger';
import { UpcomingList } from './UpcomingList';
import { CardBillSummary } from './CardBillSummary';
import { ACCOUNT_DETAILS } from '../../data/accounts';
import { Card } from '../ui/card';
import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { formatCurrency } from '../../data/transactions';

type AccountsPageProps = {
  finance: {
    statements: CardStatement[];
    ledgers: Record<Account, AccountLedger>;
    today: string;
  };
  transactions: any[];
  onAccountSelect: (acc: Account) => void;
};

export function AccountsPage({ finance, onAccountSelect }: AccountsPageProps) {
  const [horizon, setHorizon] = useState<ForecastHorizon>('end-of-month');
  const horizonEnd = resolveHorizonEnd(horizon, finance.today);

  let totalBalance = 0;
  let totalIn = 0;
  let totalOut = 0;
  let totalProjected = 0;

  const cards = (Object.keys(ACCOUNT_DETAILS) as Account[]).map(accName => {
    const details = ACCOUNT_DETAILS[accName];
    const ledger = finance.ledgers[accName];
    const forecast = getAccountForecast(ledger, finance.today, horizonEnd);
    const dFrom = new Date(`${finance.today}T12:00:00`);
    dFrom.setDate(dFrom.getDate() - 30);

    totalBalance += forecast.current;
    totalIn += forecast.upcomingIn;
    totalOut += forecast.upcomingOut;
    totalProjected += forecast.projected;

    return (
      <Card
        key={accName}
        className="p-6 bg-foreground/5 backdrop-blur-xl border border-border hover:border-cyan-500/30 transition-all cursor-pointer group"
        onClick={() => onAccountSelect(accName)}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white`}
              style={{ backgroundColor: details.color }}
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
          <CardBillSummary account={accName} statements={finance.statements} />
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
              ⚠ Dips to {formatCurrency(forecast.lowest.balance / 100)} on {forecast.lowest.date}
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div role="heading" aria-level={1} className="text-foreground text-3xl mb-2">
            Accounts
          </div>
          <div className="text-muted-foreground">Manage your cash flow and upcoming bills.</div>
        </div>
        <div className="flex gap-2">
          {['end-of-month', '30d', '90d'].map(h => (
            <button
              key={h}
              onClick={() => setHorizon(h as ForecastHorizon)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${horizon === h ? 'bg-cyan-500/20 text-theme-cyan' : 'bg-foreground/5 text-muted-foreground hover:text-foreground'}`}
            >
              {h === 'end-of-month' ? 'End of month' : h === '30d' ? '30 days' : '90 days'}
            </button>
          ))}
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{cards}</div>
    </div>
  );
}
