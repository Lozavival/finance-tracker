import { type CardStatement, getCardUsage } from '../../data/cardStatements';
import { type Account, formatCurrency } from '../../data/transactions';
import { Card } from '../ui/card';
import { CreditCard, CalendarIcon } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';

export function CardStatementsPanel({ account, statements }: { account: Account; statements: CardStatement[] }) {
  const usage = getCardUsage(statements, account);
  const accountStatements = statements.filter(s => s.account === account).reverse();

  // Set the default selected statement to the open one, or the latest closed one
  const defaultStmt = accountStatements.find(s => s.status === 'open') || accountStatements[0];
  const [selectedId, setSelectedId] = useState<string | undefined>(defaultStmt?.id);

  // If the account changes, we need to update the selection
  useEffect(() => {
    const accStmts = statements.filter(s => s.account === account).reverse();
    const def = accStmts.find(s => s.status === 'open') || accStmts[0];
    setSelectedId(def?.id);
  }, [account, statements]);

  const statementsByYear = useMemo(() => {
    const grouped: Record<number, CardStatement[]> = {};
    accountStatements.forEach(s => {
      const y = new Date(s.closingDate).getFullYear();
      if (!grouped[y]) grouped[y] = [];
      grouped[y].push(s);
    });
    return grouped;
  }, [accountStatements]);

  const [popoverOpen, setPopoverOpen] = useState(false);

  if (usage.limit === 0 || accountStatements.length === 0) return null;

  const stmt = accountStatements.find(s => s.id === selectedId) || accountStatements[0];

  return (
    <Card className="p-6 bg-foreground/5 border-border">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <CreditCard className="w-5 h-5 text-theme-cyan" />
          <div className="text-xl text-foreground">Credit Card Bills</div>
        </div>
        <div className="w-[200px]">
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between bg-foreground/5 border-border text-foreground hover:bg-foreground/10"
              >
                {new Date(stmt.closingDate).toLocaleString('en-US', { month: 'long', year: 'numeric' })}
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
                        const m = new Date(s.closingDate).getMonth();
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
                            const monthName = new Date(Number(year), monthIndex, 1).toLocaleString('en-US', {
                              month: 'short',
                            });
                            return (
                              <Button
                                key={monthIndex}
                                variant={s?.id === selectedId ? 'default' : 'outline'}
                                className={`text-xs h-9 ${!s ? 'opacity-30' : 'hover:bg-accent hover:text-accent-foreground'} ${s?.id === selectedId ? 'bg-primary text-primary-foreground' : ''}`}
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
        </div>
      </div>

      <div className="mb-6 p-4 bg-background/50 rounded-lg border border-border/50">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted-foreground">Limit Usage</span>
          <span className="text-foreground">
            {formatCurrency(usage.used / 100)} / {formatCurrency(usage.limit / 100)}
          </span>
        </div>
        <div className="h-2 w-full bg-foreground/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-theme-cyan transition-all"
            style={{ width: `${Math.min(100, (usage.used / usage.limit) * 100)}%` }}
          />
        </div>
      </div>

      <div className="p-4 border border-border/50 rounded-lg">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-foreground font-medium mb-1">
              {new Date(stmt.closingDate).toLocaleString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <div className="text-xs text-muted-foreground">
              Closes{' '}
              {new Date(stmt.closingDate).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}{' '}
              • Due{' '}
              {new Date(stmt.dueDate).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
              {stmt.status.toUpperCase()}
            </div>
          </div>
        </div>

        {stmt.items.length > 0 ? (
          <div className="text-sm space-y-1 pt-3 border-t border-border/20">
            {stmt.items.map(item => (
              <div key={item.id} className="flex justify-between py-1">
                <div className="flex min-w-0 items-center gap-3 pr-4">
                  <span className="text-muted-foreground">{item.date}</span>
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
          <div className="text-sm text-muted-foreground pt-3 border-t border-border/20">No purchases this cycle.</div>
        )}
      </div>
    </Card>
  );
}
