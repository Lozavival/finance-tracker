import { useState, useMemo, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import {
  DollarSign,
  Receipt,
  PiggyBank,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
  ListOrdered,
  ArrowRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { type Transaction, formatCurrency } from '../../data/transactions';
import {
  type GoalsConfig,
  type GoalCategory,
  type MonthlyBudgetSummary,
  calculateMonthlyBudget,
  formatPercent,
} from '../../data/goals';
import { COLOR_CONFIG } from '../../data/settings';
import { addMonthsClamped, formatMonthYear } from '../../data/dates';
import { CategoryTransactionsDialog } from './CategoryTransactionsDialog';

type BudgetOverviewProps = {
  transactions: Transaction[];
  goalsConfig: GoalsConfig;
  onAdjustGoals: () => void;
};

export function BudgetOverview({ transactions, goalsConfig, onAdjustGoals }: BudgetOverviewProps) {
  // Current selected month: default to current month (e.g. October 2026)
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState<number>(() => selectedMonth.getFullYear());

  useEffect(() => {
    if (popoverOpen) {
      setPickerYear(selectedMonth.getFullYear());
    }
  }, [popoverOpen, selectedMonth]);

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
    return calculateMonthlyBudget(transactions, goalsConfig, selectedMonth);
  }, [transactions, goalsConfig, selectedMonth]);

  function handlePrevMonth() {
    setSelectedMonth(prev => addMonthsClamped(prev, -1));
  }

  function handleNextMonth() {
    setSelectedMonth(prev => addMonthsClamped(prev, 1));
  }

  return (
    <div className="space-y-8">
      {/* Header with Month Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">Budget & Goals</h1>
          <p className="text-muted-foreground text-sm mt-1">Control your budget based on your goals and income</p>
        </div>

        {/* Date Controls */}
        <div className="flex items-center rounded-lg border border-border bg-foreground/5 p-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevMonth}
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-foreground/10"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 px-3 gap-2 text-sm font-medium text-foreground hover:bg-foreground/10 hover:text-theme-cyan transition-colors"
              >
                <Calendar className="w-4 h-4 text-theme-cyan" />
                <span>{formatMonthYear(selectedMonth)}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] bg-popover/95 backdrop-blur-xl border-border p-4 shadow-xl rounded-2xl z-50">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setPickerYear(y => y - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="font-semibold text-foreground text-sm">{pickerYear}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setPickerYear(y => y + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 12 }, (_, i) => i).map(monthIndex => {
                  const isCurrent =
                    selectedMonth.getFullYear() === pickerYear && selectedMonth.getMonth() === monthIndex;
                  const monthName = new Date(pickerYear, monthIndex, 1).toLocaleString('en-US', {
                    month: 'short',
                  });
                  return (
                    <Button
                      key={monthIndex}
                      variant={isCurrent ? 'default' : 'outline'}
                      size="sm"
                      className={`text-xs h-9 font-medium transition-all ${
                        isCurrent
                          ? 'bg-theme-cyan-btn text-white dark:text-gray-950 font-semibold shadow-md shadow-cyan-500/20'
                          : 'border-border bg-foreground/5 text-foreground hover:border-cyan-400/40 hover:text-theme-cyan hover:bg-foreground/10'
                      }`}
                      onClick={() => {
                        setSelectedMonth(new Date(pickerYear, monthIndex, 1));
                        setPopoverOpen(false);
                      }}
                    >
                      {monthName}
                    </Button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextMonth}
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-foreground/10"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Top 3 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Your Income */}
        <Card className="p-6 bg-foreground/5 backdrop-blur-xl border border-border hover:border-cyan-500/40 hover:shadow-[0_0_25px_var(--shadow-glow-cyan)] transition-all duration-300 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-theme-cyan">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-foreground">Your Income</span>
          </div>
          <div className="text-3xl font-bold text-foreground tracking-tight">{formatCurrency(budget.actualIncome)}</div>
          <div className="text-xs text-muted-foreground mt-2">Sum of receipts this month</div>
        </Card>

        {/* Monthly Expenses */}
        <Card className="p-6 bg-foreground/5 backdrop-blur-xl border border-border hover:border-blue-500/40 hover:shadow-[0_0_25px_var(--shadow-glow-blue)] transition-all duration-300 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-theme-blue">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-foreground">Monthly Expenses</span>
          </div>
          <div className="text-3xl font-bold text-foreground tracking-tight">
            {formatCurrency(budget.totalExpenses)}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
            <span className="w-2 h-2 rounded-full border border-muted-foreground inline-block" />
            <span>{formatPercent(budget.usedPercentage)} of income used</span>
          </div>
        </Card>

        {/* Remaining Balance */}
        <Card className="p-6 bg-foreground/5 backdrop-blur-xl border border-border hover:border-emerald-500/40 hover:shadow-[0_0_25px_var(--shadow-glow-green)] transition-all duration-300 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-theme-green">
              <PiggyBank className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-foreground">Remaining Balance</span>
          </div>
          <div
            className={`text-3xl font-bold tracking-tight ${
              budget.remainingBalance >= 0 ? 'text-theme-green' : 'text-theme-red'
            }`}
          >
            {formatCurrency(budget.remainingBalance)}
          </div>
          <div className="text-xs text-muted-foreground mt-2">Available to spend</div>
        </Card>
      </div>

      {/* Financial Goals Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Financial Goals</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Distribution of your monthly income by category</p>
          </div>

          <button
            onClick={onAdjustGoals}
            className="group flex items-center gap-1.5 text-sm font-medium text-theme-cyan hover:text-cyan-400 transition-colors"
          >
            <span>Adjust Goals</span>
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

            return (
              <Card
                key={category.id}
                className="p-5 bg-foreground/5 backdrop-blur-xl border border-border hover:border-cyan-500/40 hover:shadow-[0_0_20px_var(--shadow-glow-cyan)] transition-all duration-300 rounded-2xl flex flex-col justify-between group"
              >
                <div>
                  {/* Category Card Header */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: colorConfig.dotColor }}
                      />
                      <span className="font-semibold text-foreground text-sm truncate">{category.name}</span>
                    </div>

                    <div className="flex-shrink-0">
                      {hasNoExpenses ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-foreground/5 text-muted-foreground border border-border/60">
                          No expenses
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
                  <div className="h-2 w-full bg-foreground/10 rounded-full overflow-hidden mb-4">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${progressWidth}%`,
                        backgroundColor: colorConfig.dotColor,
                      }}
                    />
                  </div>

                  {/* Dual Info Boxes: Spent vs Budgeted */}
                  <div className="grid grid-cols-2 rounded-xl bg-foreground/[0.03] dark:bg-foreground/[0.05] border border-border/60 p-3 divide-x divide-border/60 mb-4">
                    <div className="pr-3">
                      <div className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">
                        Spent
                      </div>
                      <div className="text-base font-bold text-foreground mt-0.5">{formatCurrency(spent)}</div>
                    </div>
                    <div className="pl-3">
                      <div className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">
                        Budgeted
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
                        <TrendingDown className="w-3.5 h-3.5" />-{formatCurrency(Math.abs(remaining))} over budget
                      </span>
                    ) : (
                      <span className="text-theme-green flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" />+{formatCurrency(remaining)} remaining
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
                      {txCount} {txCount === 1 ? 'transaction' : 'transactions'}
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
        monthLabel={formatMonthYear(selectedMonth)}
      />
    </div>
  );
}
