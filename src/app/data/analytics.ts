import { type Transaction } from './transactions';
import { type Settings, isCreditCard } from './settings';
import { type GoalsConfig, calculateMonthlyBudget } from './goals';
import { type CardStatement } from './cardStatements';
import { type RecurringRule } from './recurring';
import { type AccountLedger, balanceAt } from './ledger';
import { addMonthsClamped, addDays } from './dates';

export type DashboardKpis = {
  totalBalance: number; // in dollars
  balanceChangePercentage: number;
  monthlyInflow: number;
  monthlyOutflow: number;
  netSavings: number;
  savingsRate: number; // 0..100
  budgetBase: number;
  budgetSpent: number;
  budgetPercentUsed: number;
  monthProgressPercent: number; // 0..100
  dayOfMonth: number;
  daysInMonth: number;
  activeSignalsCount: number;
};

export type MonthlyCashFlowPoint = {
  monthKey: string;
  year: number;
  month: number;
  label: string;
  income: number;
  expenses: number;
  netSavings: number;
  savingsRate: number;
};

export type CumulativePacePoint = {
  day: number;
  currentMonthSpent?: number;
  previousMonthSpent?: number;
  targetPace?: number;
};

export type CategoryBreakdownItem = {
  id: string;
  name: string;
  value: number;
  percentage: number;
  color: string;
  trendPercentage?: number; // vs previous period
};

export type SmartFinancialSignal = {
  id: string;
  type: 'streak' | 'spike' | 'upcoming-bill' | 'savings-milestone' | 'deficit-warning';
  severity: 'info' | 'warning' | 'critical' | 'success';
  titleKey: string;
  descriptionKey: string;
  params: Record<string, string | number>;
  actionPage?: 'goals' | 'transactions' | 'accounts';
};

export type UpcomingObligation = {
  id: string;
  title: string;
  date: Date;
  amount: number;
  kind: 'card-bill' | 'recurring' | 'installment';
  accountName?: string;
  daysRemaining: number;
};

/**
 * Calculates high-level dashboard KPIs from live finance data.
 */
export function calculateDashboardKpis(
  transactions: Transaction[],
  ledgers: Record<string, AccountLedger>,
  settings: Settings,
  goalsConfig: GoalsConfig,
  today: Date,
  activeSignalsCount = 0,
): DashboardKpis {
  // 1. Calculate liquid balance across checking/savings/cash accounts (exclude credit card debt)
  let totalBalanceCents = 0;
  let prevMonthBalanceCents = 0;

  const y = today.getFullYear();
  const m = today.getMonth();
  const lastDayOfPrevMonth = new Date(y, m, 0);

  for (const acc of settings.accounts) {
    if (!isCreditCard(settings, acc.id)) {
      const ledger = ledgers[acc.id];
      if (ledger) {
        totalBalanceCents += balanceAt(ledger, today);
        prevMonthBalanceCents += balanceAt(ledger, lastDayOfPrevMonth);
      }
    }
  }

  const totalBalance = totalBalanceCents / 100;
  const prevMonthBalance = prevMonthBalanceCents / 100;
  const balanceChangePercentage =
    prevMonthBalance !== 0 ? ((totalBalance - prevMonthBalance) / Math.abs(prevMonthBalance)) * 100 : 0;

  // 2. Current month income and expenses (excluding internal transfers)
  let monthlyInflow = 0;
  let monthlyOutflow = 0;

  for (const t of transactions) {
    if (t.transferId) continue;
    if (t.date.getFullYear() === y && t.date.getMonth() === m) {
      if (t.direction === 'income') {
        monthlyInflow += t.value;
      } else if (t.direction === 'expense') {
        monthlyOutflow += t.value;
      }
    }
  }

  const netSavings = monthlyInflow - monthlyOutflow;
  const savingsRate = monthlyInflow > 0 ? (netSavings / monthlyInflow) * 100 : 0;

  // 3. Budget pacing
  const budgetSummary = calculateMonthlyBudget(transactions, goalsConfig, today);
  const budgetBase = budgetSummary.budgetBase;
  const budgetSpent = budgetSummary.totalExpenses;
  const budgetPercentUsed = budgetBase > 0 ? (budgetSpent / budgetBase) * 100 : 0;

  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const dayOfMonth = today.getDate();
  const monthProgressPercent = Math.min((dayOfMonth / daysInMonth) * 100, 100);

  return {
    totalBalance,
    balanceChangePercentage,
    monthlyInflow,
    monthlyOutflow,
    netSavings,
    savingsRate,
    budgetBase,
    budgetSpent,
    budgetPercentUsed,
    monthProgressPercent,
    dayOfMonth,
    daysInMonth,
    activeSignalsCount,
  };
}

/**
 * Calculates monthly Cash Flow history (Inflow, Outflow, Net) for the last N months.
 */
export function calculateMonthlyCashFlowHistory(
  transactions: Transaction[],
  monthsCount: number,
  today: Date,
  locale = 'en-US',
): MonthlyCashFlowPoint[] {
  const result: MonthlyCashFlowPoint[] = [];

  for (let i = monthsCount - 1; i >= 0; i--) {
    const targetDate = addMonthsClamped(today, -i);
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();

    let income = 0;
    let expenses = 0;

    for (const t of transactions) {
      if (t.transferId) continue;
      if (t.date.getFullYear() === targetYear && t.date.getMonth() === targetMonth) {
        if (t.direction === 'income') {
          income += t.value;
        } else if (t.direction === 'expense') {
          expenses += t.value;
        }
      }
    }

    const netSavings = income - expenses;
    const savingsRate = income > 0 ? (netSavings / income) * 100 : 0;
    const monthKey = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;
    const label = new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(targetYear, targetMonth, 1));

    result.push({
      monthKey,
      year: targetYear,
      month: targetMonth,
      label,
      income: Math.round(income * 100) / 100,
      expenses: Math.round(expenses * 100) / 100,
      netSavings: Math.round(netSavings * 100) / 100,
      savingsRate: Math.round(savingsRate * 10) / 10,
    });
  }

  return result;
}

/**
 * Calculates cumulative daily spending (Day 1 to End of Month) for current month vs prior month vs budget.
 */
export function calculateCumulativeSpendingPace(
  transactions: Transaction[],
  goalsConfig: GoalsConfig,
  today: Date,
): CumulativePacePoint[] {
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const todayDay = today.getDate();
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const prevMonthDate = addMonthsClamped(today, -1);
  const prevYear = prevMonthDate.getFullYear();
  const prevMonth = prevMonthDate.getMonth();
  const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();

  const maxDays = Math.max(daysInCurrentMonth, daysInPrevMonth);

  // Group daily expenses
  const currentMonthDaily = new Array<number>(maxDays + 1).fill(0);
  const prevMonthDaily = new Array<number>(maxDays + 1).fill(0);

  for (const t of transactions) {
    if (t.direction !== 'expense' || t.transferId) continue;
    const tYear = t.date.getFullYear();
    const tMonth = t.date.getMonth();
    const tDay = t.date.getDate();

    if (tYear === currentYear && tMonth === currentMonth && tDay <= daysInCurrentMonth) {
      currentMonthDaily[tDay] += t.value;
    } else if (tYear === prevYear && tMonth === prevMonth && tDay <= daysInPrevMonth) {
      prevMonthDaily[tDay] += t.value;
    }
  }

  const budgetSummary = calculateMonthlyBudget(transactions, goalsConfig, today);
  const dailyTarget = budgetSummary.budgetBase > 0 ? budgetSummary.budgetBase / daysInCurrentMonth : 0;

  const points: CumulativePacePoint[] = [];
  let currentCum = 0;
  let prevCum = 0;

  for (let day = 1; day <= daysInCurrentMonth; day++) {
    prevCum += prevMonthDaily[day] ?? 0;

    const point: CumulativePacePoint = {
      day,
      previousMonthSpent: Math.round(prevCum * 100) / 100,
      targetPace: dailyTarget > 0 ? Math.round(dailyTarget * day * 100) / 100 : undefined,
    };

    if (day <= todayDay) {
      currentCum += currentMonthDaily[day] ?? 0;
      point.currentMonthSpent = Math.round(currentCum * 100) / 100;
    }

    points.push(point);
  }

  return points;
}

/**
 * Calculates categorized spending distribution for either 'types' or 'goals',
 * supporting period filtering and trend calculation vs prior period.
 */
export function calculateCategoryBreakdown(
  transactions: Transaction[],
  settings: Settings,
  goalsConfig: GoalsConfig,
  period: 'this-month' | 'last-month' | 'last-90-days',
  mode: 'types' | 'goals',
  today: Date,
): { items: CategoryBreakdownItem[]; totalSpend: number } {
  // Determine date ranges for target period and comparison period
  let targetFrom: Date;
  let targetTo: Date;
  let compFrom: Date;
  let compTo: Date;

  const y = today.getFullYear();
  const m = today.getMonth();

  if (period === 'this-month') {
    targetFrom = new Date(y, m, 1);
    targetTo = new Date(y, m + 1, 0, 23, 59, 59, 999);
    compFrom = new Date(y, m - 1, 1);
    compTo = new Date(y, m, 0, 23, 59, 59, 999);
  } else if (period === 'last-month') {
    targetFrom = new Date(y, m - 1, 1);
    targetTo = new Date(y, m, 0, 23, 59, 59, 999);
    compFrom = new Date(y, m - 2, 1);
    compTo = new Date(y, m - 1, 0, 23, 59, 59, 999);
  } else {
    // last-90-days
    targetFrom = addDays(today, -90);
    targetTo = today;
    compFrom = addDays(today, -180);
    compTo = addDays(today, -91);
  }

  const targetTotals = new Map<string, number>();
  const compTotals = new Map<string, number>();

  for (const t of transactions) {
    if (t.direction !== 'expense' || t.transferId) continue;
    const tTime = t.date.getTime();

    // Map to category ID depending on mode
    let catId = t.typeId;
    if (mode === 'goals') {
      catId = goalsConfig.typeMappings[t.typeId] || t.typeId;
    }

    if (tTime >= targetFrom.getTime() && tTime <= targetTo.getTime()) {
      targetTotals.set(catId, (targetTotals.get(catId) ?? 0) + t.value);
    } else if (tTime >= compFrom.getTime() && tTime <= compTo.getTime()) {
      compTotals.set(catId, (compTotals.get(catId) ?? 0) + t.value);
    }
  }

  const totalSpend = Array.from(targetTotals.values()).reduce((sum, v) => sum + v, 0);

  const items: CategoryBreakdownItem[] = [];

  if (mode === 'types') {
    for (const typeCfg of settings.transactionTypes) {
      if (typeCfg.direction !== 'expense' || typeCfg.system) continue;
      const value = targetTotals.get(typeCfg.id) ?? 0;
      if (value <= 0) continue;

      const compVal = compTotals.get(typeCfg.id) ?? 0;
      const trendPercentage = compVal > 0 ? ((value - compVal) / compVal) * 100 : undefined;

      items.push({
        id: typeCfg.id,
        name: typeCfg.name,
        value: Math.round(value * 100) / 100,
        percentage: totalSpend > 0 ? Math.round((value / totalSpend) * 1000) / 10 : 0,
        color: `var(--accent-${typeCfg.color}-dot)`,
        trendPercentage: trendPercentage !== undefined ? Math.round(trendPercentage * 10) / 10 : undefined,
      });
    }
  } else {
    // mode === 'goals'
    for (const goalCat of goalsConfig.categories) {
      const value = targetTotals.get(goalCat.id) ?? 0;
      if (value <= 0) continue;

      const compVal = compTotals.get(goalCat.id) ?? 0;
      const trendPercentage = compVal > 0 ? ((value - compVal) / compVal) * 100 : undefined;

      items.push({
        id: goalCat.id,
        name: goalCat.name,
        value: Math.round(value * 100) / 100,
        percentage: totalSpend > 0 ? Math.round((value / totalSpend) * 1000) / 10 : 0,
        color: `var(--accent-${goalCat.color}-dot)`,
        trendPercentage: trendPercentage !== undefined ? Math.round(trendPercentage * 10) / 10 : undefined,
      });
    }
  }

  // Sort descending by value
  items.sort((a, b) => b.value - a.value);

  return { items, totalSpend: Math.round(totalSpend * 100) / 100 };
}

/**
 * Pure heuristic intelligence engine (Zero LLM):
 * Analyzes multi-month budget streaks, spending velocity anomalies, and upcoming liquidity.
 */
export function generateSmartFinancialSignals(
  transactions: Transaction[],
  settings: Settings,
  goalsConfig: GoalsConfig,
  statements: CardStatement[],
  _recurringRules: RecurringRule[],
  ledgers: Record<string, AccountLedger>,
  today: Date,
): SmartFinancialSignal[] {
  const signals: SmartFinancialSignal[] = [];

  // --- 1. Multi-Month Budget Overrun Streaks ---
  // Inspect the past 3 months
  const monthsToCheck = [0, -1, -2].map(offset => addMonthsClamped(today, offset));
  const categoryOverrunCounts = new Map<string, { count: number; totalOverrunPercent: number; name: string }>();

  for (const mDate of monthsToCheck) {
    const budget = calculateMonthlyBudget(transactions, goalsConfig, mDate);
    for (const catSummary of budget.categories) {
      if (catSummary.remaining < 0 && catSummary.budgeted > 0) {
        const excessPercent = ((catSummary.spent - catSummary.budgeted) / catSummary.budgeted) * 100;
        const entry = categoryOverrunCounts.get(catSummary.category.id) ?? {
          count: 0,
          totalOverrunPercent: 0,
          name: catSummary.category.name,
        };
        entry.count += 1;
        entry.totalOverrunPercent += excessPercent;
        categoryOverrunCounts.set(catSummary.category.id, entry);
      }
    }
  }

  for (const [catId, data] of categoryOverrunCounts.entries()) {
    if (data.count >= 2) {
      const avgOverrun = Math.round((data.totalOverrunPercent / data.count) * 10) / 10;
      signals.push({
        id: `streak-overrun-${catId}`,
        type: 'streak',
        severity: data.count === 3 ? 'critical' : 'warning',
        titleKey: 'dashboard.signals.budgetStreakTitle',
        descriptionKey: 'dashboard.signals.budgetStreakDesc',
        params: {
          category: data.name,
          months: data.count,
          percent: avgOverrun,
        },
        actionPage: 'goals',
      });
    }
  }

  // --- 2. Spending Velocity Anomaly (Current Month vs 3-Month Rolling Average) ---
  const past3MonthsDates = [-1, -2, -3].map(offset => addMonthsClamped(today, offset));
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Aggregate current month per category
  const currentCatTotals = new Map<string, number>();
  for (const t of transactions) {
    if (t.direction !== 'expense' || t.transferId) continue;
    if (t.date.getFullYear() === currentYear && t.date.getMonth() === currentMonth) {
      currentCatTotals.set(t.typeId, (currentCatTotals.get(t.typeId) ?? 0) + t.value);
    }
  }

  // Aggregate 3 past months per category
  const historicalTotals = new Map<string, number>();
  for (const t of transactions) {
    if (t.direction !== 'expense' || t.transferId) continue;
    const isPast3 = past3MonthsDates.some(
      d => d.getFullYear() === t.date.getFullYear() && d.getMonth() === t.date.getMonth(),
    );
    if (isPast3) {
      historicalTotals.set(t.typeId, (historicalTotals.get(t.typeId) ?? 0) + t.value);
    }
  }

  for (const [typeId, currentSpent] of currentCatTotals.entries()) {
    const histTotal = historicalTotals.get(typeId) ?? 0;
    const rollingAvg = histTotal / 3;

    // Trigger if spent is at least $50 and exceeds 1.35x baseline
    if (rollingAvg >= 40 && currentSpent >= 1.35 * rollingAvg) {
      const typeCfg = settings.transactionTypes.find(t => t.id === typeId);
      const catName = typeCfg?.name ?? typeId;
      const spikePercent = Math.round(((currentSpent - rollingAvg) / rollingAvg) * 100);

      signals.push({
        id: `spike-${typeId}`,
        type: 'spike',
        severity: 'warning',
        titleKey: 'dashboard.signals.spendingSpikeTitle',
        descriptionKey: 'dashboard.signals.spendingSpikeDesc',
        params: {
          category: catName,
          percent: spikePercent,
        },
        actionPage: 'transactions',
      });
    }
  }

  // --- 3. Upcoming Critical Card Bill or Obligation in next 7 days ---
  const next7Days = addDays(today, 7);
  for (const stmt of statements) {
    if (stmt.status === 'open' && stmt.total > 0) {
      const dueTime = stmt.dueDate.getTime();
      if (dueTime >= today.getTime() && dueTime <= next7Days.getTime()) {
        const daysRemaining = Math.max(0, Math.ceil((dueTime - today.getTime()) / (1000 * 60 * 60 * 24)));
        signals.push({
          id: `bill-${stmt.id}`,
          type: 'upcoming-bill',
          severity: daysRemaining <= 3 ? 'critical' : 'warning',
          titleKey: 'dashboard.signals.upcomingBillTitle',
          descriptionKey: 'dashboard.signals.upcomingBillDesc',
          params: {
            title: stmt.cardName,
            amount: (stmt.total / 100).toFixed(2),
            days: daysRemaining,
          },
          actionPage: 'accounts',
        });
      }
    }
  }

  // --- 4. Savings Rate Milestone or Deficit Warning ---
  const currentKpis = calculateDashboardKpis(transactions, ledgers, settings, goalsConfig, today);
  if (currentKpis.monthlyInflow > 0 && currentKpis.savingsRate >= 25) {
    signals.push({
      id: 'savings-milestone',
      type: 'savings-milestone',
      severity: 'success',
      titleKey: 'dashboard.signals.savingsMilestoneTitle',
      descriptionKey: 'dashboard.signals.savingsMilestoneDesc',
      params: {
        rate: currentKpis.savingsRate.toFixed(1),
      },
    });
  } else if (currentKpis.netSavings < 0) {
    signals.push({
      id: 'deficit-warning',
      type: 'deficit-warning',
      severity: 'critical',
      titleKey: 'dashboard.signals.deficitWarningTitle',
      descriptionKey: 'dashboard.signals.deficitWarningDesc',
      params: {
        amount: Math.abs(currentKpis.netSavings).toFixed(2),
      },
    });
  }

  return signals;
}

/**
 * Returns upcoming obligations (credit card bills, recurring rules, installment legs)
 * occurring within the next horizonDays.
 */
export function getUpcomingObligations(
  statements: CardStatement[],
  _recurringRules: RecurringRule[],
  transactions: Transaction[],
  settings: Settings,
  today: Date,
  horizonDays = 30,
): UpcomingObligation[] {
  const obligations: UpcomingObligation[] = [];
  const horizonEnd = addDays(today, horizonDays);
  const todayTime = today.getTime();
  const horizonEndTime = horizonEnd.getTime();

  // 1. Credit card statement bills
  for (const stmt of statements) {
    const dueTime = stmt.dueDate.getTime();
    if (dueTime >= todayTime && dueTime <= horizonEndTime && stmt.total > 0) {
      const daysRemaining = Math.max(0, Math.ceil((dueTime - todayTime) / (1000 * 60 * 60 * 24)));
      obligations.push({
        id: `stmt-${stmt.id}`,
        title: `${stmt.cardName} Bill`,
        date: stmt.dueDate,
        amount: stmt.total / 100,
        kind: 'card-bill',
        daysRemaining,
      });
    }
  }

  // 2. Upcoming future transactions (recurring or installments)
  for (const t of transactions) {
    if (t.direction !== 'expense' || t.transferId) continue;
    const tTime = t.date.getTime();
    if (tTime >= todayTime && tTime <= horizonEndTime) {
      if (t.installment || t.recurring) {
        const daysRemaining = Math.max(0, Math.ceil((tTime - todayTime) / (1000 * 60 * 60 * 24)));
        const acc = settings.accounts.find(a => a.id === t.accountId);
        obligations.push({
          id: `tx-${t.id}`,
          title: t.description,
          date: t.date,
          amount: t.value,
          kind: t.installment ? 'installment' : 'recurring',
          accountName: acc?.name,
          daysRemaining,
        });
      }
    }
  }

  // Sort chronologically ascending
  obligations.sort((a, b) => a.date.getTime() - b.date.getTime());

  return obligations;
}
