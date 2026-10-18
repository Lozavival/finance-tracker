import { useState, useMemo } from 'react';
import { Card } from '@/components/primitives/card';
import { DollarSign, Receipt, PiggyBank, ListOrdered, ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import { type Transaction } from '@/data/transactions';
import {
  type GoalsConfig,
  type GoalCategory,
  type MonthlyBudgetSummary,
  calculateMonthlyBudget,
  formatPercent,
} from '@/data/goals';
import { COLOR_CONFIG } from '@/data/settings';
import { formatMonthYear } from '@/data/dates';
import { CategoryTransactionsDialog } from './CategoryTransactionsDialog';
import { CategoryChip } from '@/components/shared/CategoryChip';
import { MonthPicker } from '@/components/shared/MonthPicker';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { useSettings } from '@/state/SettingsContext';
import { useI18n } from '@/i18n';

type BudgetOverviewProps = {
  transactions: Transaction[];
  goalsConfig: GoalsConfig;
  onAdjustGoals: () => void;
};

export function BudgetOverview({ transactions, goalsConfig, onAdjustGoals }: BudgetOverviewProps) {
  const { settings } = useSettings();
  const { t, formatCurrency, locale, currency } = useI18n();
  // Current selected month: default to current month (e.g. October 2026)
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [dialogState, setDialogState] = useState<{
    open: boolean;
    category: GoalCategory | null;
    transactions: Transaction[];
  }>({
    open: false,
    category: null,
    transactions: [],
  });

  // Calculate budget metrics for the selected month
  const budget: MonthlyBudgetSummary = useMemo(() => {
    return calculateMonthlyBudget(
      transactions,
      goalsConfig,
      selectedMonth,
      currency,
      settings.exchangeRate?.rate ?? null,
    );
  }, [transactions, goalsConfig, selectedMonth, currency, settings.exchangeRate?.rate]);

  return (
    <div className="space-y-8">
      {/* Header with Month Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">{t('goals.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('goals.subtitle')}</p>
        </div>

        <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
      </div>

      {/* Top 3 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Your Income */}
        <Card className="p-6 bg-foreground/5 backdrop-blur-xl border border-border hover:border-cyan-500/40 hover:shadow-[0_0_25px_var(--shadow-glow-cyan)] transition-all duration-300 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-theme-cyan">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-foreground">{t('goals.yourIncome')}</span>
          </div>
          <div className="text-3xl font-bold text-foreground tracking-tight">{formatCurrency(budget.actualIncome)}</div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
            <span>{t('goals.incomeReceiptsDesc')}</span>
            {goalsConfig.referenceMonthlyIncome > 0 && (
              <span className="text-theme-cyan/90 font-medium">
                {t('goals.plannedBaseline', { amount: formatCurrency(goalsConfig.referenceMonthlyIncome) })}
              </span>
            )}
          </div>
        </Card>

        {/* Monthly Expenses */}
        <Card className="p-6 bg-foreground/5 backdrop-blur-xl border border-border hover:border-blue-500/40 hover:shadow-[0_0_25px_var(--shadow-glow-blue)] transition-all duration-300 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-theme-blue">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-foreground">{t('goals.monthlyExpenses')}</span>
          </div>
          <div className="text-3xl font-bold text-foreground tracking-tight">
            {formatCurrency(budget.totalExpenses)}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
            <span className="w-2 h-2 rounded-full border border-muted-foreground inline-block" />
            <span>{t('goals.incomeUsed', { percent: formatPercent(budget.usedPercentage) })}</span>
          </div>
        </Card>

        {/* Remaining Balance */}
        <Card className="p-6 bg-foreground/5 backdrop-blur-xl border border-border hover:border-emerald-500/40 hover:shadow-[0_0_25px_var(--shadow-glow-green)] transition-all duration-300 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-theme-green">
              <PiggyBank className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-foreground">{t('goals.remainingBalance')}</span>
          </div>
          <div
            className={`text-3xl font-bold tracking-tight ${
              budget.remainingBalance >= 0 ? 'text-theme-green' : 'text-theme-red'
            }`}
          >
            {formatCurrency(budget.remainingBalance)}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
            <span>{t('goals.netCashFlow')}</span>
            <span>
              {t('goals.remaining')}: {formatCurrency(budget.remainingBudget)}
            </span>
          </div>
        </Card>
      </div>

      {/* Financial Goals Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{t('goals.financialGoals')}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t('goals.distributionDesc')}</p>
          </div>

          <button
            onClick={onAdjustGoals}
            className="group flex items-center gap-1.5 text-sm font-medium text-theme-cyan hover:text-cyan-400 transition-colors"
          >
            <span>{t('goals.adjustGoals')}</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budget.categories.map(summary => {
            const { category, budgeted, spent, remaining, percentageUsed, txCount, transactions: catTxs } = summary;
            const colorConfig = COLOR_CONFIG[category.color] ?? COLOR_CONFIG.blue;
            const isOverBudget = remaining < 0;
            const hasNoExpenses = spent === 0;

            // Clamped progress bar width (0% to 100%)
            const progressWidth = Math.min(Math.max(percentageUsed, 0), 100);

            const linkedTypes = settings.transactionTypes.filter(
              t => t.direction === 'expense' && !t.system && goalsConfig.typeMappings[t.id] === category.id,
            );

            return (
              <Card
                key={category.id}
                className="p-5 bg-foreground/5 backdrop-blur-xl border border-border hover:border-cyan-500/40 hover:shadow-[0_0_20px_var(--shadow-glow-cyan)] transition-all duration-300 rounded-2xl flex flex-col justify-between group"
              >
                <div>
                  {/* Category Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm mt-1"
                        style={{ backgroundColor: colorConfig.dotColor }}
                      />
                      <div className="min-w-0">
                        <span className="font-semibold text-foreground text-sm truncate block">{category.name}</span>
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {linkedTypes.length > 0 ? (
                            linkedTypes.map(lt => <CategoryChip key={lt.id} typeConfig={lt} size="sm" />)
                          ) : (
                            <span className="text-[10px] text-muted-foreground/60 italic">
                              {t('goals.noTypesLinked')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {hasNoExpenses ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-foreground/5 text-muted-foreground border border-border/60">
                          {t('goals.noExpenses')}
                        </span>
                      ) : (
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${
                            isOverBudget
                              ? 'bg-destructive/10 text-destructive border-destructive/30'
                              : 'bg-foreground/5 text-foreground border-border/60'
                          }`}
                        >
                          {formatPercent(percentageUsed)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <ProgressBar value={progressWidth} color={colorConfig.dotColor} className="mb-4" />

                  {/* Dual Info Boxes: Spent vs Budgeted */}
                  <div className="grid grid-cols-2 rounded-xl bg-foreground/[0.03] dark:bg-foreground/[0.05] border border-border/60 p-3 divide-x divide-border/60 mb-4">
                    <div className="pr-3">
                      <div className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">
                        {t('goals.spent')}
                      </div>
                      <div className="text-base font-bold text-foreground mt-0.5">{formatCurrency(spent)}</div>
                    </div>
                    <div className="pl-3">
                      <div className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">
                        {t('goals.budgeted')}
                      </div>
                      <div className="text-base font-bold text-foreground mt-0.5">{formatCurrency(budgeted)}</div>
                    </div>
                  </div>
                </div>

                {/* Footer Row */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                  <div className="flex items-center gap-1 font-medium">
                    {isOverBudget ? (
                      <span className="text-destructive flex items-center gap-1">
                        <TrendingDown className="w-3.5 h-3.5" />
                        {t('goals.overBudgetAmount', { amount: formatCurrency(Math.abs(remaining)) })}
                      </span>
                    ) : (
                      <span className="text-theme-green flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        {t('goals.remainingAmount', { amount: formatCurrency(remaining) })}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setDialogState({
                        open: true,
                        category,
                        transactions: catTxs,
                      })
                    }
                    className="flex items-center gap-1.5 text-muted-foreground group-hover:text-theme-cyan hover:text-theme-cyan transition-colors cursor-pointer"
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                    <span>
                      {txCount === 1
                        ? t('common.singleTransaction')
                        : t('common.transactionsCount', { count: String(txCount) })}
                    </span>
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Category Transactions Dialog */}
      <CategoryTransactionsDialog
        open={dialogState.open}
        onOpenChange={open => setDialogState(prev => ({ ...prev, open }))}
        category={dialogState.category}
        transactions={dialogState.transactions}
        monthLabel={formatMonthYear(selectedMonth, locale)}
      />
    </div>
  );
}
