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
  referenceMonthlyIncome: number; // e.g. 1000000 ($1,000,000.00)
  mode: 'percentage' | 'currency';
  categories: GoalCategory[];
  typeMappings: Record<string, string>; // transaction typeId -> goalCategoryId
};

export const DEFAULT_GOAL_CATEGORIES: GoalCategory[] = [
  {
    id: 'fixed-costs',
    name: 'Fixed Costs',
    percentage: 30,
    color: 'blue',
    icon: 'Home',
    description: 'Housing, bills, utilities, essential healthcare and groceries',
  },
  {
    id: 'comfort',
    name: 'Comfort',
    percentage: 15,
    color: 'pink',
    icon: 'Coffee',
    description: 'Dining out, lifestyle conveniences, subscriptions, personal care',
  },
  {
    id: 'goals',
    name: 'Goals',
    percentage: 15,
    color: 'violet',
    icon: 'Target',
    description: 'Targeted savings, emergency cushion, medium-term projects',
  },
  {
    id: 'pleasures',
    name: 'Pleasures',
    percentage: 10,
    color: 'orange',
    icon: 'Sparkles',
    description: 'Leisure, entertainment, travel, hobbies and fun activities',
  },
  {
    id: 'knowledge',
    name: 'Knowledge',
    percentage: 5,
    color: 'amber',
    icon: 'BookOpen',
    description: 'Books, courses, workshops, training and personal development',
  },
  {
    id: 'financial-freedom',
    name: 'Financial Freedom',
    percentage: 25,
    color: 'indigo',
    icon: 'TrendingUp',
    description: 'Long-term investment portfolio, equity, retirement planning',
  },
];

export const DEFAULT_TYPE_MAPPINGS: Record<string, string> = {
  bills: 'fixed-costs',
  transportation: 'fixed-costs',
  'food-dining': 'comfort',
  shopping: 'goals',
  entertainment: 'pleasures',
};

export const DEFAULT_GOALS_CONFIG: GoalsConfig = {
  referenceMonthlyIncome: 1000000, // $1,000,000.00
  mode: 'percentage',
  categories: DEFAULT_GOAL_CATEGORIES,
  typeMappings: DEFAULT_TYPE_MAPPINGS,
};

export type CategoryBudgetSummary = {
  category: GoalCategory;
  budgeted: number;
  spent: number;
  remaining: number;
  percentageUsed: number; // spent / budgeted * 100
  txCount: number;
  transactions: Transaction[];
};

export type MonthlyBudgetSummary = {
  monthDate: Date;
  actualIncome: number;
  totalExpenses: number;
  remainingBalance: number;
  usedPercentage: number; // totalExpenses / actualIncome * 100
  categories: CategoryBudgetSummary[];
};

export function calculateMonthlyBudget(
  transactions: Transaction[],
  goalsConfig: GoalsConfig,
  targetDate: Date,
): MonthlyBudgetSummary {
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();

  // Filter transactions belonging to the target month & year
  const monthTransactions = transactions.filter(t => {
    return t.date.getFullYear() === targetYear && t.date.getMonth() === targetMonth;
  });

  // Calculate actual income (exclude internal transfers)
  let actualIncome = 0;
  for (const t of monthTransactions) {
    if (t.direction === 'income' && !t.transferId) {
      actualIncome += t.value;
    }
  }

  // Base for computing category targets:
  // If actual income is positive, use actual income; otherwise fallback to reference monthly income
  const budgetBase = actualIncome > 0 ? actualIncome : goalsConfig.referenceMonthlyIncome;

  // Map transactions to categories
  const categoryTransactionsMap = new Map<string, Transaction[]>();
  for (const cat of goalsConfig.categories) {
    categoryTransactionsMap.set(cat.id, []);
  }

  let totalExpenses = 0;
  const unmappedExpenses: Transaction[] = [];

  for (const t of monthTransactions) {
    if (t.direction === 'expense' && !t.transferId) {
      totalExpenses += t.value;
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
    const spent = txs.reduce((sum, tx) => sum + tx.value, 0);
    const budgeted = (budgetBase * cat.percentage) / 100;
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

  const remainingBalance = actualIncome - totalExpenses;
  const usedPercentage = actualIncome > 0 ? (totalExpenses / actualIncome) * 100 : 0;

  return {
    monthDate: new Date(targetYear, targetMonth, 1),
    actualIncome,
    totalExpenses,
    remainingBalance,
    usedPercentage,
    categories: categorySummaries,
  };
}

export function formatPercent(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}
