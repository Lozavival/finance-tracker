import { type CashMovement } from '@/data/ledger';
import { formatShort } from '@/data/dates';
import { useI18n } from '@/i18n';

export function UpcomingList({
  upcoming,
  currentBalance,
  variant,
}: {
  upcoming: CashMovement[];
  currentBalance: number;
  variant: 'compact' | 'full';
}) {
  const { t, formatCurrency, locale } = useI18n();

  if (upcoming.length === 0)
    return <div className="text-muted-foreground text-sm">{t('accounts.noUpcomingItems')}</div>;

  const items = variant === 'compact' ? upcoming.slice(0, 3) : upcoming;
  let runningBalance = currentBalance;

  return (
    <div className="space-y-2">
      {items.map((m, i) => {
        runningBalance += m.amount;
        const dateStr = formatShort(m.date, locale);

        if (variant === 'compact') {
          return (
            <div
              key={i}
              className="flex justify-between items-center text-sm py-1 border-b border-border/50 last:border-0 gap-3"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-muted-foreground shrink-0 whitespace-nowrap">{dateStr}</span>
                <span className="text-foreground truncate">{m.description}</span>
                {m.isEstimate && (
                  <span className="text-[10px] px-1 bg-cyan-500/20 text-theme-cyan rounded shrink-0">
                    {t('accounts.est')}
                  </span>
                )}
              </div>
              <span className={`shrink-0 whitespace-nowrap ${m.amount > 0 ? 'text-theme-green' : 'text-theme-red'}`}>
                {m.amount > 0 ? '+' : '−'}
                {formatCurrency(Math.abs(m.amount) / 100)}
              </span>
            </div>
          );
        }

        return (
          <div
            key={i}
            className="flex justify-between items-center text-sm py-2 border-b border-border/50 last:border-0 hover:bg-foreground/5 px-2 -mx-2 rounded-md transition-colors gap-4"
          >
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <span className="text-muted-foreground shrink-0 whitespace-nowrap">{dateStr}</span>
              <div className="min-w-0 flex-1">
                <div className="text-foreground flex items-center gap-2">
                  <span className="truncate">{m.description}</span>
                  {m.isEstimate && (
                    <span className="text-[10px] px-1 bg-cyan-500/20 text-theme-cyan rounded shrink-0">
                      {t('accounts.est')}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
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
