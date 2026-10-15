import { formatMonthYear, formatFull, getToday } from '@/data/dates';
import { formatShort } from '@/data/dates';
import { type CardStatement, getCardUsage } from '@/data/cardStatements';
import { Card } from '@/components/primitives/card';
import { CreditCard } from 'lucide-react';
import { useState, useMemo } from 'react';
import { MonthPicker } from '@/components/shared/MonthPicker';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { Badge } from '@/components/primitives/badge';
import { useSettings } from '@/state/SettingsContext';
import { useI18n } from '@/i18n';

type CardStatementsPanelProps = {
  accountId: string;
  statements: CardStatement[];
};

export function CardStatementsPanel({ accountId, statements }: CardStatementsPanelProps) {
  const { settings, findAccount } = useSettings();
  const { t, formatCurrency, formatCents, locale } = useI18n();
  const account = findAccount(accountId);
  const usage = getCardUsage(statements, accountId, settings);
  const accountStatements = useMemo(
    () => statements.filter(s => s.accountId === accountId).reverse(),
    [statements, accountId],
  );

  function getDefaultStatement(accStmts: CardStatement[]) {
    const todayTime = getToday().getTime();
    return (
      accStmts.find(s => s.periodStart.getTime() <= todayTime && s.closingDate.getTime() >= todayTime) ||
      accStmts.find(s => s.status === 'open' && s.periodStart.getTime() <= todayTime) ||
      accStmts.find(s => s.status === 'open') ||
      accStmts[0]
    );
  }

  const [selectedId, setSelectedId] = useState<string | undefined>(() => getDefaultStatement(accountStatements)?.id);

  if (!account?.card) return null;

  const stmt = accountStatements.find(s => s.id === selectedId) ?? getDefaultStatement(accountStatements);
  const stmtIndex = stmt ? accountStatements.findIndex(s => s.id === stmt.id) : -1;
  const currentIndex = stmtIndex === -1 ? 0 : stmtIndex;

  return (
    <Card className="p-6 bg-foreground/5 border-border">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <CreditCard className="w-5 h-5 text-theme-cyan" />
          <div className="text-xl text-foreground">{t('accounts.creditCardBills')}</div>
        </div>
        {accountStatements.length > 0 && stmt && (
          <MonthPicker
            value={stmt.closingDate}
            onChange={pickedDate => {
              const matching = accountStatements.find(
                s =>
                  s.closingDate.getFullYear() === pickedDate.getFullYear() &&
                  s.closingDate.getMonth() === pickedDate.getMonth(),
              );
              if (matching) setSelectedId(matching.id);
            }}
            onPrev={() => setSelectedId(accountStatements[currentIndex + 1].id)}
            onNext={() => setSelectedId(accountStatements[currentIndex - 1].id)}
            prevDisabled={currentIndex >= accountStatements.length - 1}
            nextDisabled={currentIndex <= 0}
            isMonthEnabled={(year, monthIndex) =>
              accountStatements.some(
                s => s.closingDate.getFullYear() === year && s.closingDate.getMonth() === monthIndex,
              )
            }
          />
        )}
      </div>

      <div className="mb-6 p-4 bg-background/50 rounded-lg border border-border/50">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted-foreground">{t('accounts.limitUsage')}</span>
          <span className="text-foreground">
            {formatCents(usage.used)} / {formatCents(usage.limit)}
          </span>
        </div>
        <ProgressBar value={usage.limit > 0 ? (usage.used / usage.limit) * 100 : 0} />
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
              <div className="text-lg text-foreground font-medium">{formatCents(stmt.total)}</div>
              <Badge
                variant={stmt.status === 'paid' ? 'emerald' : stmt.status === 'open' ? 'cyan' : 'amber'}
                className="mt-1"
              >
                {stmt.status === 'paid'
                  ? t('accounts.statusPaid').toUpperCase()
                  : stmt.status === 'open'
                    ? t('accounts.statusOpen').toUpperCase()
                    : t('accounts.statusClosed').toUpperCase()}
              </Badge>
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
