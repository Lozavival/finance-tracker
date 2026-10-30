import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarClock, Receipt, History } from 'lucide-react';
import { Card } from '@/components/primitives/card';
import { Button } from '@/components/primitives/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/primitives/table';
import { CategoryChip } from '@/components/shared/CategoryChip';
import { formatSignedValue, type Transaction } from '@/data/transactions';
import { formatInstallmentLabel } from '@/data/installments';
import { useSettings } from '@/state/SettingsContext';
import { useFinance } from '@/state/FinanceContext';
import { useI18n } from '@/i18n';
import { getUpcomingObligations } from '@/data/analytics';

interface ActivityAndObligationsProps {
  transactions: Transaction[];
  today: Date;
}

export function ActivityAndObligations({ transactions, today }: ActivityAndObligationsProps) {
  const { findType, settings } = useSettings();
  const { statements, recurringRules } = useFinance();
  const { t, formatShort, formatCents, locale } = useI18n();
  const navigate = useNavigate();

  // Recent 6 transactions up to today
  const recentTransactions = [...transactions]
    .filter(tx => tx.date.getTime() <= today.getTime())
    .sort((a, b) => b.date.getTime() - a.date.getTime() || b.id.localeCompare(a.id))
    .slice(0, 6);

  // Upcoming 6 obligations within next 30 days
  const upcomingObligations = getUpcomingObligations(
    statements,
    recurringRules,
    transactions,
    settings,
    today,
    30,
  ).slice(0, 6);

  function renderDueBadge(days: number) {
    if (days === 0) {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-theme-red/15 text-theme-red border border-theme-red/30">
          {t('dashboard.dueToday')}
        </span>
      );
    }
    if (days === 1) {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-theme-orange/15 text-theme-orange border border-theme-orange/30">
          {t('dashboard.dueTomorrow')}
        </span>
      );
    }
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-foreground/10 text-muted-foreground border border-border/60">
        {t('dashboard.dueInDays', { days: String(days) })}
      </span>
    );
  }

  return (
    <div className="grid grid-cols-1 @4xl/main:grid-cols-2 gap-6">
      {/* 1. Recent Transactions Card */}
      <Card className="@container min-w-0 p-4 sm:p-6 bg-foreground/5 backdrop-blur-xl border border-border/60 hover:shadow-xl hover:shadow-theme-cyan/5 transition-all duration-300 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <History className="size-4 text-theme-cyan shrink-0" />
              <h2 className="text-base font-semibold text-foreground tracking-tight truncate">
                {t('dashboard.recentTransactions')}
              </h2>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate('/transactions')}
              className="h-7 px-2 text-xs font-medium text-theme-cyan hover:text-theme-cyan hover:bg-theme-cyan/10 shrink-0 gap-1"
            >
              <span>{t('dashboard.viewAllTransactions')}</span>
              <ArrowRight className="size-3" />
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/50 hover:bg-transparent">
                  <TableHead className="text-xs text-muted-foreground">{t('common.date')}</TableHead>
                  <TableHead className="text-xs text-muted-foreground">{t('common.description')}</TableHead>
                  <TableHead className="text-xs text-muted-foreground">{t('common.category')}</TableHead>
                  <TableHead className="text-xs text-muted-foreground text-right">{t('common.value')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map(tx => {
                  const typeConfig = findType(tx.typeId);
                  return (
                    <TableRow
                      key={tx.id}
                      className="border-b border-border/40 hover:bg-foreground/5 transition-colors group"
                    >
                      <TableCell className="text-xs text-muted-foreground py-2.5 whitespace-nowrap">
                        {formatShort(tx.date)}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground py-2.5">
                        <div className="flex items-center gap-1.5 min-w-0 max-w-xs">
                          <span className="truncate min-w-0">{tx.description}</span>
                          {tx.installment && (
                            <span className="text-[10px] rounded bg-foreground/10 px-1 py-0.5 text-muted-foreground shrink-0">
                              {formatInstallmentLabel(tx.installment)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5 whitespace-nowrap">
                        <CategoryChip typeConfig={typeConfig} label={tx.typeId} size="sm" />
                      </TableCell>
                      <TableCell
                        className={`text-xs font-semibold text-right py-2.5 whitespace-nowrap tabular-nums ${
                          tx.direction === 'income' ? 'text-theme-green' : 'text-theme-red'
                        }`}
                      >
                        {formatSignedValue(tx, locale)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>

      {/* 2. Upcoming Obligations Card */}
      <Card className="@container min-w-0 p-4 sm:p-6 bg-foreground/5 backdrop-blur-xl border border-border/60 hover:shadow-xl hover:shadow-theme-orange/5 transition-all duration-300 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <CalendarClock className="size-4 text-theme-orange shrink-0" />
              <h2 className="text-base font-semibold text-foreground tracking-tight truncate">
                {t('dashboard.upcomingObligations')}
              </h2>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{t('transactions.upcoming30')}</span>
          </div>

          {upcomingObligations.length > 0 ? (
            <div className="space-y-3">
              {upcomingObligations.map(ob => {
                return (
                  <div
                    key={ob.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-foreground/[0.03] border border-border/40 hover:border-theme-orange/30 transition-all text-xs gap-2"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="size-8 rounded-lg bg-foreground/5 border border-border/60 flex items-center justify-center text-muted-foreground shrink-0">
                        <Receipt className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground truncate">{ob.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {formatShort(ob.date)} {ob.accountName ? `• ${ob.accountName}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 text-right">
                      <span className="font-bold text-foreground tabular-nums whitespace-nowrap">
                        {formatCents(ob.amount, ob.currency)}
                      </span>
                      {renderDueBadge(ob.daysRemaining)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-44 flex flex-col items-center justify-center text-center p-4">
              <CalendarClock className="size-8 text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">{t('dashboard.noUpcomingObligations')}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
