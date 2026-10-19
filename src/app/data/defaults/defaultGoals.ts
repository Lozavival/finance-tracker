import type { GoalCategory, GoalsConfig } from '../goals';

/**
 * Standard 6-bucket distribution preset available for users who want to load
 * recommended defaults or use as a template.
 */
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

/**
 * Production factory default: clean initial slate with no pre-defined goals.
 */
export const EMPTY_GOALS_CONFIG: GoalsConfig = {
  referenceMonthlyIncome: 0,
  mode: 'percentage',
  categories: [],
  typeMappings: {},
};

export const DEFAULT_GOALS_CONFIG: GoalsConfig = EMPTY_GOALS_CONFIG;

/**
 * Demo preset configuration matching dev mock transactions.
 */
export const DEMO_GOALS_CONFIG: GoalsConfig = {
  referenceMonthlyIncome: 100000000, // $1,000,000.00 in cents
  mode: 'percentage',
  categories: DEFAULT_GOAL_CATEGORIES,
  typeMappings: DEFAULT_TYPE_MAPPINGS,
};
