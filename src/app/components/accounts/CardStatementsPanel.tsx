import { formatMonthYear, formatFull, getToday } from '@/data/dates';
import { formatShort } from '@/data/dates';
import { type CardStatement, getCardUsage } from '@/data/cardStatements';
import { Card } from '@/components/ui/card';
import { CreditCard, CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/state/SettingsContext';
import { useI18n } from '@/i18n';

type CardStatementsPanelProps = {
  accountId: string;
  statements: CardStatement[];
};

export function CardStatementsPanel({ accountId, statements }: CardStatementsPanelProps) {
  const { settings, findAccount } = useSettings();
  const { t, formatCurrency, locale } = useI18n();
  const account = findAccount(accountId);
  const usage = getCardUsage(statements, accountId, settings);
  const accountStatements = statements.filter(s => s.accountId === accountId).reverse();

  function getDefaultStatement(accStmts: CardStatement[]) {
    const todayTime = getToday().getTime();
    return (
      accStmts.find(s => s.periodStart.getTime() <= todayTime && s.closingDate.getTime() >= todayTime) ||
      accStmts.find(s => s.status === 'open' && s.periodStart.getTime() <= todayTime) ||
      accStmts.find(s => s.status === 'open') ||
      accStmts[0]
    );
  }

  const [selectedId, setSelectedId] = useState<string | undefined>(getDefaultStatement(accountStatements)?.id);

  // If the account changes, we need to update the selection
  useEffect(() => {
    const accStmts = statements.filter(s => s.accountId === accountId).reverse();
    setSelectedId(getDefaultStatement(accStmts)?.id);
  }, [accountId, statements]);

  const statementsByYear = useMemo(() => {
    const grouped: Record<number, CardStatement[]> = {};
    accountStatements.forEach(s => {
      const y = s.closingDate.getFullYear();
      if (!grouped[y]) grouped[y] = [];
      grouped[y].push(s);
    });
    return grouped;
  }, [accountStatements]);

  const [popoverOpen, setPopoverOpen] = useState(false);

  if (!account?.card) return null;

  const stmtIndex = accountStatements.findIndex(s => s.id === selectedId);
  const currentIndex = stmtIndex === -1 ? 0 : stmtIndex;
  const stmt = accountStatements[currentIndex];

  return (
    <Card className="p-6 bg-foreground/5 border-border">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <CreditCard className="w-5 h-5 text-theme-cyan" />
          <div className="text-xl text-foreground">{t('accounts.creditCardBills')}</div>
        </div>
        {accountStatements.length > 0 && stmt && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 bg-foreground/5 border-border text-foreground hover:bg-foreground/10 flex-shrink-0"
              disabled={currentIndex >= accountStatements.length - 1}
              onClick={() => setSelectedId(accountStatements[currentIndex + 1].id)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[160px] h-9 justify-between bg-foreground/5 border-border text-foreground hover:bg-foreground/10"
                >
                  {formatMonthYear(stmt.closingDate, locale)}
                  <CalendarIcon className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[260px] bg-popover border-border p-4 shadow-xl">
                <div className="space-y-6 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                  {Object.entries(statementsByYear)
                    .sort(([a], [b]) => Number(b) - Number(a))
                    .map(([year, stmts]) => {
                      const stmtsByMonth = stmts.reduce(
                        (acc, s) => {
                          const m = s.closingDate.getMonth();
                          acc[m] = s;
                          return acc;
                        },
                        {} as Record<number, CardStatement>,
                      );

                      return (
                        <div key={year}>
                          <div className="font-medium text-foreground mb-3">{year}</div>
                          <div className="grid grid-cols-3 gap-2">
                            {Array.from({ length: 12 }, (_, i) => i).map(monthIndex => {
                              const s = stmtsByMonth[monthIndex];
                              const monthName = new Date(Number(year), monthIndex, 1).toLocaleString(locale, {
                                month: 'short',
                              });
                              return (
                                <Button
                                  key={monthIndex}
                                  variant={s?.id === selectedId ? 'default' : 'outline'}
                                  className={`text-xs h-9 ${
                                    !s ? 'opacity-30' : 'hover:bg-accent hover:text-accent-foreground'
                                  } ${s?.id === selectedId ? 'bg-primary text-primary-foreground' : ''}`}
                                  disabled={!s}
                                  onClick={() => {
                                    if (s) {
                                      setSelectedId(s.id);
                                      setPopoverOpen(false);
                                    }
                                  }}
                                >
                                  {monthName}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 bg-foreground/5 border-border text-foreground hover:bg-foreground/10 flex-shrink-0"
              disabled={currentIndex <= 0}
              onClick={() => setSelectedId(accountStatements[currentIndex - 1].id)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="mb-6 p-4 bg-background/50 rounded-lg border border-border/50">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted-foreground">{t('accounts.limitUsage')}</span>
          <span className="text-foreground">
            {formatCurrency(usage.used / 100)} / {formatCurrency(usage.limit / 100)}
          </span>
        </div>
        <div className="h-2 w-full bg-foreground/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-theme-cyan transition-all"
            style={{ width: `${usage.limit > 0 ? Math.min(100, (usage.used / usage.limit) * 100) : 0}%` }}
          />
        </div>
      </div>

      {accountStatements.length > 0 && stmt ? (
        <div className="p-4 border border-border/50 rounded-lg">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-foreground font-medium mb-1">{formatMonthYear(stmt.closingDate, locale)}</div>
              <div className="text-xs text-muted-foreground">
                {t('accounts.billClosesDue', {
                  closingDate: formatFull(stmt.closingDate, locale),
                  dueDate: formatFull(stmt.dueDate, locale),
                })}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg text-foreground font-medium">{formatCurrency(stmt.total / 100)}</div>
              <div
                className={`text-xs inline-block px-2 py-0.5 rounded mt-1 ${
                  stmt.status === 'paid'
                    ? 'bg-green-500/20 text-theme-green'
                    : stmt.status === 'open'
                      ? 'bg-cyan-500/20 text-theme-cyan'
                      : 'bg-orange-500/20 text-theme-orange'
                }`}
              >
                {stmt.status === 'paid'
                  ? t('accounts.statusPaid').toUpperCase()
                  : stmt.status === 'open'
                    ? t('accounts.statusOpen').toUpperCase()
                    : t('accounts.statusClosed').toUpperCase()}
              </div>
            </div>
          </div>

          {stmt.items.length > 0 ? (
            <div className="text-sm space-y-1 pt-3 border-t border-border/20">
              {stmt.items.map(item => (
                <div key={item.id} className="flex justify-between py-1">
                  <div className="flex min-w-0 items-center gap-3 pr-4">
                    <span className="text-muted-foreground">{formatShort(item.date, locale)}</span>
                    <span className="truncate text-muted-foreground">{item.description}</span>
                  </div>

                  <span
                    className={
                      item.direction === 'income'
                        ? 'shrink-0 whitespace-nowrap text-theme-green'
                        : 'shrink-0 whitespace-nowrap'
                    }
                  >
                    {item.direction === 'income' ? '-' : ''}
                    {formatCurrency(item.value)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground pt-3 border-t border-border/20">
              {t('accounts.noPurchasesThisCycle')}
            </div>
          )}
        </div>
      ) : (
        <div className="text-muted-foreground text-sm">{t('accounts.noCardBills')}</div>
      )}
    </Card>
  );
}
