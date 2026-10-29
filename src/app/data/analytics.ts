import { type Transaction } from './transactions';
import { type Settings, isCreditCard, getAccountCurrencies } from './settings';
import { type GoalsConfig, calculateMonthlyBudget } from './goals';
import { type CardStatement } from './cardStatements';
import { type RecurringRule } from './recurring';
import { type AccountLedger, balanceAt } from './ledger';
import { addMonthsClamped, addDays } from './dates';
import { convertCents } from './currency';
import { type SupportedCurrency } from '@/i18n/types';
import { logger } from '../lib/logger';

const analyticsLogger = logger.child('Analytics');

export type DashboardKpis = {
  totalBalance: number; // integer cents in preferred currency
  totalBalanceCents: number | null; // converted cents in preferred currency, or null if no rate and multi-currency
  balancesByCurrency: Record<SupportedCurrency, number>; // integer cents
  hasMultipleCurrencies: boolean;
  hasRate: boolean;
  balanceChangePercentage: number;
  monthlyInflow: number; // integer cents
  monthlyInflowCents: number | null;
  inflowByCurrency: Record<SupportedCurrency, number>; // integer cents
  monthlyOutflow: number; // integer cents
  monthlyOutflowCents: number | null;
  outflowByCurrency: Record<SupportedCurrency, number>; // integer cents
  netSavings: number; // integer cents
  netSavingsCents: number | null;
  hasMultiCurrencyCashFlow: boolean;
  savingsRate: number; // 0..100
  budgetBase: number; // integer cents
  budgetSpent: number; // integer cents
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
  income: number; // integer cents
  expenses: number; // integer cents
  netSavings: number; // integer cents
  savingsRate: number;
};

export type CumulativePacePoint = {
  day: number;
  currentMonthSpent?: number; // integer cents
  previousMonthSpent?: number; // integer cents
  targetPace?: number; // integer cents
};

export type CategoryBreakdownItem = {
  id: string;
  name: string;
  value: number; // integer cents
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
  amountCents?: number;
  currency?: SupportedCurrency;
  actionPage?: 'goals' | 'transactions' | 'accounts';
};

export type UpcomingObligation = {
  id: string;
  title: string;
  date: Date;
  amount: number; // integer cents
  currency: SupportedCurrency;
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
  preferredCurrency: SupportedCurrency = 'USD',
): DashboardKpis {
  const rate = settings.exchangeRate?.rate;
  const hasRate = rate !== null && rate !== undefined && rate > 0;
  const activeAccounts = settings.accounts.filter(a => !a.archived);

  // 1. Calculate liquid balance per currency across checking/savings/cash accounts (exclude credit card debt)
  const balancesByCurrency: Record<SupportedCurrency, number> = { BRL: 0, USD: 0 };
  const prevBalancesByCurrency: Record<SupportedCurrency, number> = { BRL: 0, USD: 0 };

  const y = today.getFullYear();
  const m = today.getMonth();
  const lastDayOfPrevMonth = new Date(y, m, 0);

  for (const acc of activeAccounts) {
    if (!isCreditCard(settings, acc.id)) {
      const currencies = getAccountCurrencies(acc);
      for (const curr of currencies) {
        const pocketLedger = ledgers[`${acc.id}:${curr}`] ?? ledgers[acc.id];
        if (pocketLedger) {
          balancesByCurrency[curr] += balanceAt(pocketLedger, today);
          prevBalancesByCurrency[curr] += balanceAt(pocketLedger, lastDayOfPrevMonth);
        }
      }
    }
  }

  const hasMultipleCurrencies = balancesByCurrency.BRL !== 0 && balancesByCurrency.USD !== 0;

  let convertedBalanceCents: number | null = null;
  let prevConvertedBalanceCents: number | null = null;

  if (hasRate) {
    const brlInPref = convertCents(balancesByCurrency.BRL, 'BRL', preferredCurrency, rate) ?? 0;
    const usdInPref = convertCents(balancesByCurrency.USD, 'USD', preferredCurrency, rate) ?? 0;
    convertedBalanceCents =
      preferredCurrency === 'USD' ? balancesByCurrency.USD + brlInPref : balancesByCurrency.BRL + usdInPref;

    const prevBrlInPref = convertCents(prevBalancesByCurrency.BRL, 'BRL', preferredCurrency, rate) ?? 0;
    const prevUsdInPref = convertCents(prevBalancesByCurrency.USD, 'USD', preferredCurrency, rate) ?? 0;
    prevConvertedBalanceCents =
      preferredCurrency === 'USD'
        ? prevBalancesByCurrency.USD + prevBrlInPref
        : prevBalancesByCurrency.BRL + prevUsdInPref;
  } else if (!hasMultipleCurrencies) {
    if (balancesByCurrency.BRL !== 0 && preferredCurrency === 'BRL') {
      convertedBalanceCents = balancesByCurrency.BRL;
      prevConvertedBalanceCents = prevBalancesByCurrency.BRL;
    } else if (balancesByCurrency.USD !== 0 && preferredCurrency === 'USD') {
      convertedBalanceCents = balancesByCurrency.USD;
      prevConvertedBalanceCents = prevBalancesByCurrency.USD;
    } else if (balancesByCurrency.BRL === 0 && balancesByCurrency.USD === 0) {
      convertedBalanceCents = 0;
      prevConvertedBalanceCents = 0;
    }
  }

  const totalBalance =
    convertedBalanceCents !== null ? convertedBalanceCents : (balancesByCurrency[preferredCurrency] ?? 0);
  const prevMonthBalance =
    prevConvertedBalanceCents !== null ? prevConvertedBalanceCents : (prevBalancesByCurrency[preferredCurrency] ?? 0);
  const balanceChangePercentage =
    prevMonthBalance !== 0 ? ((totalBalance - prevMonthBalance) / Math.abs(prevMonthBalance)) * 100 : 0;

  // 2. Current month income and expenses (excluding internal transfers) per currency
  const inflowByCurrency: Record<SupportedCurrency, number> = { BRL: 0, USD: 0 };
  const outflowByCurrency: Record<SupportedCurrency, number> = { BRL: 0, USD: 0 };

  for (const t of transactions) {
    if (t.transferId) continue;
    if (t.date.getFullYear() === y && t.date.getMonth() === m) {
      if (t.direction === 'income') {
        inflowByCurrency[t.currency] += t.value;
      } else if (t.direction === 'expense') {
        outflowByCurrency[t.currency] += t.value;
      }
    }
  }

  const hasBrlCashFlow = inflowByCurrency.BRL > 0 || outflowByCurrency.BRL > 0;
  const hasUsdCashFlow = inflowByCurrency.USD > 0 || outflowByCurrency.USD > 0;
  const hasMultiCurrencyCashFlow = hasBrlCashFlow && hasUsdCashFlow;
  const hasForeignCashFlowWithoutRate = !hasRate && (preferredCurrency === 'BRL' ? hasUsdCashFlow : hasBrlCashFlow);

  let convertedInflowCents: number | null = null;
  let convertedOutflowCents: number | null = null;

  if (hasRate) {
    const brlInflowPref = convertCents(inflowByCurrency.BRL, 'BRL', preferredCurrency, rate) ?? 0;
    const usdInflowPref = convertCents(inflowByCurrency.USD, 'USD', preferredCurrency, rate) ?? 0;
    convertedInflowCents =
      preferredCurrency === 'USD' ? inflowByCurrency.USD + brlInflowPref : inflowByCurrency.BRL + usdInflowPref;

    const brlOutflowPref = convertCents(outflowByCurrency.BRL, 'BRL', preferredCurrency, rate) ?? 0;
    const usdOutflowPref = convertCents(outflowByCurrency.USD, 'USD', preferredCurrency, rate) ?? 0;
    convertedOutflowCents =
      preferredCurrency === 'USD' ? outflowByCurrency.USD + brlOutflowPref : outflowByCurrency.BRL + usdOutflowPref;
  } else if (!hasForeignCashFlowWithoutRate) {
    convertedInflowCents = inflowByCurrency[preferredCurrency] ?? 0;
    convertedOutflowCents = outflowByCurrency[preferredCurrency] ?? 0;
  }

  const monthlyInflow =
    convertedInflowCents !== null ? convertedInflowCents : (inflowByCurrency[preferredCurrency] ?? 0);
  const monthlyOutflow =
    convertedOutflowCents !== null ? convertedOutflowCents : (outflowByCurrency[preferredCurrency] ?? 0);
  const convertedNetSavingsCents =
    convertedInflowCents !== null && convertedOutflowCents !== null
      ? convertedInflowCents - convertedOutflowCents
      : null;
  const netSavings = convertedNetSavingsCents !== null ? convertedNetSavingsCents : monthlyInflow - monthlyOutflow;
  const savingsRate = monthlyInflow > 0 ? (netSavings / monthlyInflow) * 100 : 0;

  // 3. Budget pacing
  const budgetSummary = calculateMonthlyBudget(transactions, goalsConfig, today, preferredCurrency, rate ?? null);
  const budgetBase = budgetSummary.budgetBase;
  const budgetSpent = budgetSummary.totalExpenses;
  const budgetPercentUsed = budgetBase > 0 ? (budgetSpent / budgetBase) * 100 : 0;

  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const dayOfMonth = today.getDate();
  const monthProgressPercent = Math.min((dayOfMonth / daysInMonth) * 100, 100);

  const kpis: DashboardKpis = {
    totalBalance,
    totalBalanceCents: convertedBalanceCents,
    balancesByCurrency,
    hasMultipleCurrencies,
    hasRate,
    balanceChangePercentage,
    monthlyInflow,
    monthlyInflowCents: convertedInflowCents,
    inflowByCurrency,
    monthlyOutflow,
    monthlyOutflowCents: convertedOutflowCents,
    outflowByCurrency,
    netSavings,
    netSavingsCents: convertedNetSavingsCents,
    hasMultiCurrencyCashFlow,
    savingsRate,
    budgetBase,
    budgetSpent,
    budgetPercentUsed,
    monthProgressPercent,
    dayOfMonth,
    daysInMonth,
    activeSignalsCount,
  };

  analyticsLogger.debug('calculateDashboardKpis computed', {
    preferredCurrency,
    totalBalanceCents: convertedBalanceCents,
    netSavingsCents: convertedNetSavingsCents,
    savingsRate,
    activeSignalsCount,
  });

  return kpis;
}

/**
 * Calculates monthly Cash Flow history (Inflow, Outflow, Net) for the last N months.
 */
export function calculateMonthlyCashFlowHistory(
  transactions: Transaction[],
  monthsCount: number,
  today: Date,
  locale = 'en-US',
  currencyScope: 'all' | SupportedCurrency = 'all',
  preferredCurrency: SupportedCurrency = 'USD',
  rate?: number | null,
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
        const curr = t.currency;
        let val = t.value;

        if (currencyScope !== 'all') {
          if (curr !== currencyScope) continue;
        } else if (curr !== preferredCurrency) {
          if (rate && rate > 0) {
            const converted = convertCents(val, curr, preferredCurrency, rate);
            if (converted !== null) {
              val = converted;
            }
          } else {
            // Unconvertible cross-currency: do not sum 1:1
            continue;
          }
        }

        if (t.direction === 'income') {
          income += val;
        } else if (t.direction === 'expense') {
          expenses += val;
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
      income: Math.round(income),
      expenses: Math.round(expenses),
      netSavings: Math.round(netSavings),
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
  currencyScope: 'all' | SupportedCurrency = 'all',
  preferredCurrency: SupportedCurrency = 'USD',
  rate?: number | null,
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

  // Group daily expenses (in cents)
  const currentMonthDaily = new Array<number>(maxDays + 1).fill(0);
  const prevMonthDaily = new Array<number>(maxDays + 1).fill(0);

  for (const t of transactions) {
    if (t.direction !== 'expense' || t.transferId) continue;
    const tYear = t.date.getFullYear();
    const tMonth = t.date.getMonth();
    const tDay = t.date.getDate();

    const curr = t.currency;
    let val = t.value;

    if (currencyScope !== 'all') {
      if (curr !== currencyScope) continue;
    } else if (curr !== preferredCurrency) {
      if (rate && rate > 0) {
        const converted = convertCents(val, curr, preferredCurrency, rate);
        if (converted !== null) {
          val = converted;
        }
      } else {
        // Unconvertible cross-currency: do not sum 1:1
        continue;
      }
    }

    if (tYear === currentYear && tMonth === currentMonth && tDay <= daysInCurrentMonth) {
      currentMonthDaily[tDay] += val;
    } else if (tYear === prevYear && tMonth === prevMonth && tDay <= daysInPrevMonth) {
      prevMonthDaily[tDay] += val;
    }
  }

  const targetCurr = currencyScope === 'all' ? preferredCurrency : currencyScope;
  const budgetSummary = calculateMonthlyBudget(transactions, goalsConfig, today, targetCurr, rate);
  const dailyTarget = budgetSummary.budgetBase > 0 ? budgetSummary.budgetBase / daysInCurrentMonth : 0;

  const points: CumulativePacePoint[] = [];
  let currentCum = 0;
  let prevCum = 0;

  for (let day = 1; day <= daysInCurrentMonth; day++) {
    prevCum += prevMonthDaily[day] ?? 0;

    const point: CumulativePacePoint = {
      day,
      previousMonthSpent: Math.round(prevCum),
      targetPace: dailyTarget > 0 ? Math.round(dailyTarget * day) : undefined,
    };

    if (day <= todayDay) {
      currentCum += currentMonthDaily[day] ?? 0;
      point.currentMonthSpent = Math.round(currentCum);
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
  currencyScope: 'all' | SupportedCurrency = 'all',
  preferredCurrency: SupportedCurrency = 'USD',
  rate?: number | null,
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

    const curr = t.currency;
    let val = t.value;

    if (currencyScope !== 'all') {
      if (curr !== currencyScope) continue;
    } else if (curr !== preferredCurrency) {
      if (rate && rate > 0) {
        const converted = convertCents(val, curr, preferredCurrency, rate);
        if (converted !== null) {
          val = converted;
        }
      } else {
        // Unconvertible cross-currency: do not sum 1:1
        continue;
      }
    }

    if (tTime >= targetFrom.getTime() && tTime <= targetTo.getTime()) {
      targetTotals.set(catId, (targetTotals.get(catId) ?? 0) + val);
    } else if (tTime >= compFrom.getTime() && tTime <= compTo.getTime()) {
      compTotals.set(catId, (compTotals.get(catId) ?? 0) + val);
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
        value: Math.round(value),
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
        value: Math.round(value),
        percentage: totalSpend > 0 ? Math.round((value / totalSpend) * 1000) / 10 : 0,
        color: `var(--accent-${goalCat.color}-dot)`,
        trendPercentage: trendPercentage !== undefined ? Math.round(trendPercentage * 10) / 10 : undefined,
      });
    }
  }

  // Sort descending by value
  items.sort((a, b) => b.value - a.value);

  return { items, totalSpend: Math.round(totalSpend) };
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
  preferredCurrency: SupportedCurrency = 'USD',
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

  // Aggregate current month per category (in cents)
  const currentCatTotals = new Map<string, number>();
  for (const t of transactions) {
    if (t.direction !== 'expense' || t.transferId) continue;
    if (t.date.getFullYear() === currentYear && t.date.getMonth() === currentMonth) {
      currentCatTotals.set(t.typeId, (currentCatTotals.get(t.typeId) ?? 0) + t.value);
    }
  }

  // Aggregate 3 past months per category (in cents)
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

    // Trigger if spent is at least $40 (4000 cents) and exceeds 1.35x baseline
    if (rollingAvg >= 4000 && currentSpent >= 1.35 * rollingAvg) {
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
          amountCents: stmt.total,
          currency: stmt.currency,
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
  if (currentKpis.netSavingsCents !== null) {
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
        amountCents: Math.abs(currentKpis.netSavingsCents ?? 0),
        currency: preferredCurrency,
        params: {
          amount: (Math.abs(currentKpis.netSavings) / 100).toFixed(2),
        },
      });
    }
  }

  analyticsLogger.debug('generateSmartFinancialSignals generated signals', {
    count: signals.length,
    signalTypes: signals.map(s => s.type),
  });

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
        amount: stmt.total,
        currency: stmt.currency,
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
          currency: t.currency,
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
