import { type CashMovement } from '../../data/ledger';
import { formatCurrency } from '../../data/transactions';
import { formatShort } from '../../data/dates';

export function UpcomingList({
  upcoming,
  currentBalance,
  variant,
}: {
  upcoming: CashMovement[];
  currentBalance: number;
  variant: 'compact' | 'full';
}) {
  if (upcoming.length === 0) return <div className="text-muted-foreground text-sm">No upcoming items.</div>;

  const items = variant === 'compact' ? upcoming.slice(0, 3) : upcoming;
  let runningBalance = currentBalance;

  return (
    <div className="space-y-2">
      {items.map((m, i) => {
        runningBalance += m.amount;
        const dateStr = formatShort(m.date);

        if (variant === 'compact') {
          return (
            <div
              key={i}
              className="flex justify-between items-center text-sm py-1 border-b border-border/50 last:border-0"
            >
              <div className="flex gap-2 truncate">
                <span className="text-muted-foreground w-12 flex-shrink-0">{dateStr}</span>
                <span className="text-foreground truncate">{m.description}</span>
                {m.isEstimate && <span className="text-[10px] px-1 bg-cyan-500/20 text-theme-cyan rounded">est.</span>}
              </div>
              <span
                className={m.amount > 0 ? 'text-theme-green whitespace-nowrap' : 'text-theme-red whitespace-nowrap'}
              >
                {m.amount > 0 ? '+' : '−'}
                {formatCurrency(Math.abs(m.amount) / 100)}
              </span>
            </div>
          );
        }

        return (
          <div
            key={i}
            className="flex justify-between items-center text-sm py-2 border-b border-border/50 last:border-0 hover:bg-foreground/5 px-2 -mx-2 rounded-md transition-colors"
          >
            <div className="flex gap-4">
              <span className="text-muted-foreground w-16">{dateStr}</span>
              <div>
                <div className="text-foreground flex items-center gap-2">
                  {m.description}
                  {m.isEstimate && (
                    <span className="text-[10px] px-1 bg-cyan-500/20 text-theme-cyan rounded">est.</span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={m.amount > 0 ? 'text-theme-green' : 'text-theme-red'}>
                {m.amount > 0 ? '+' : '−'}
                {formatCurrency(Math.abs(m.amount) / 100)}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{formatCurrency(runningBalance / 100)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
