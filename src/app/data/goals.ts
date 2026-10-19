import { type ColorToken } from './settings';
import { type IconKey } from './icons';
import { type Transaction } from './transactions';

export type GoalCategory = {
  id: string;
  name: string;
  percentage: number; // e.g. 30 for 30%
  color: ColorToken;
  icon: IconKey;
  description?: string;
};

export type GoalsConfig = {
  referenceMonthlyIncome: number;
  mode: 'percentage' | 'currency';
  categories: GoalCategory[];
  typeMappings: Record<string, string>; // transaction typeId -> goalCategoryId
};

export type CategoryBudgetSummary = {
  category: GoalCategory;
  budgeted: number; // integer cents
  spent: number; // integer cents
  remaining: number; // integer cents
  percentageUsed: number; // spent / budgeted * 100
  txCount: number;
  transactions: Transaction[];
};

export type MonthlyBudgetSummary = {
  monthDate: Date;
  actualIncome: number; // integer cents
  budgetBase: number; // integer cents
  totalBudgeted: number; // integer cents
  totalExpenses: number; // integer cents
  remainingBalance: number; // integer cents
  remainingBudget: number; // integer cents
  usedPercentage: number; // totalExpenses / budgetBase * 100
  categories: CategoryBudgetSummary[];
};

import { convertCents } from './currency';
import { type SupportedCurrency } from '@/i18n/types';

export function calculateMonthlyBudget(
  transactions: Transaction[],
  goalsConfig: GoalsConfig,
  targetDate: Date,
  targetCurrency: SupportedCurrency = 'USD',
  exchangeRate: number | null = null,
): MonthlyBudgetSummary {
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();

  // Filter transactions belonging to the target month & year
  const monthTransactions = transactions.filter(t => {
    return t.date.getFullYear() === targetYear && t.date.getMonth() === targetMonth;
  });

  // Calculate actual income in cents (exclude internal transfers)
  let actualIncome = 0;
  for (const t of monthTransactions) {
    if (t.direction === 'income' && !t.transferId) {
      const val = convertCents(t.value, t.currency, targetCurrency, exchangeRate) ?? t.value;
      actualIncome += val;
    }
  }

  // Base for computing category targets (in cents):
  // Use expected reference monthly income if configured; fallback to actual income if 0
  const budgetBase = goalsConfig.referenceMonthlyIncome > 0 ? goalsConfig.referenceMonthlyIncome : actualIncome;

  // Map transactions to categories
  const categoryTransactionsMap = new Map<string, Transaction[]>();
  for (const cat of goalsConfig.categories) {
    categoryTransactionsMap.set(cat.id, []);
  }

  let totalExpenses = 0;
  const unmappedExpenses: Transaction[] = [];

  for (const t of monthTransactions) {
    if (t.direction === 'expense' && !t.transferId) {
      const val = convertCents(t.value, t.currency, targetCurrency, exchangeRate) ?? t.value;
      totalExpenses += val;
      // Determine which goal category this transaction belongs to
      const targetCatId = goalsConfig.typeMappings[t.typeId] || t.typeId;
      const list = categoryTransactionsMap.get(targetCatId);
      if (list) {
        list.push(t);
      } else {
        unmappedExpenses.push(t);
      }
    }
  }

  // If there are unmapped expenses and categories exist, place them into the first category or distribute
  if (unmappedExpenses.length > 0 && goalsConfig.categories.length > 0) {
    const firstCatList = categoryTransactionsMap.get(goalsConfig.categories[0].id);
    if (firstCatList) {
      firstCatList.push(...unmappedExpenses);
    }
  }

  const categorySummaries: CategoryBudgetSummary[] = goalsConfig.categories.map(cat => {
    const txs = categoryTransactionsMap.get(cat.id) || [];
    const spent = txs.reduce((sum, tx) => {
      const val = convertCents(tx.value, tx.currency, targetCurrency, exchangeRate) ?? tx.value;
      return sum + val;
    }, 0);
    const budgeted = Math.round((budgetBase * cat.percentage) / 100);
    const remaining = budgeted - spent;
    const percentageUsed = budgeted > 0 ? (spent / budgeted) * 100 : 0;

    return {
      category: cat,
      budgeted,
      spent,
      remaining,
      percentageUsed,
      txCount: txs.length,
      transactions: txs,
    };
  });

  const totalBudgeted = categorySummaries.reduce((sum, c) => sum + c.budgeted, 0);
  const remainingBudget = budgetBase - totalExpenses;
  const remainingBalance = actualIncome - totalExpenses;
  const usedPercentage = budgetBase > 0 ? (totalExpenses / budgetBase) * 100 : 0;

  return {
    monthDate: new Date(targetYear, targetMonth, 1),
    actualIncome,
    budgetBase,
    totalBudgeted,
    totalExpenses,
    remainingBalance,
    remainingBudget,
    usedPercentage,
    categories: categorySummaries,
  };
}

export function formatPercent(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}
