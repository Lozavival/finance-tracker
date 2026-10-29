import { describe, it, expect } from 'vitest';
import { calculateMonthlyBudget, formatPercent, type GoalsConfig } from '@/data/goals';
import { parseLocalDate } from '@/data/dates';
import type { Transaction } from '@/data/transactions';

describe('Goals & Budget Engine', () => {
  const sampleGoalsConfig: GoalsConfig = {
    referenceMonthlyIncome: 500000, // $5,000.00
    mode: 'percentage',
    categories: [
      {
        id: 'needs',
        name: 'Needs (50%)',
        percentage: 50,
        color: 'emerald',
        icon: 'Home',
      },
      {
        id: 'wants',
        name: 'Wants (30%)',
        percentage: 30,
        color: 'blue',
        icon: 'Sparkles',
      },
      {
        id: 'savings',
        name: 'Savings (20%)',
        percentage: 20,
        color: 'purple',
        icon: 'PiggyBank',
      },
    ],
    typeMappings: {
      housing: 'needs',
      'food-dining': 'needs',
      shopping: 'wants',
      entertainment: 'wants',
    },
  };

  it('calculates monthly budget based on reference monthly income', () => {
    const targetDate = parseLocalDate('2026-03-15');
    const transactions: Transaction[] = [
      {
        id: 'tx-1',
        date: parseLocalDate('2026-03-01'),
        description: 'Salary',
        typeId: 'salary',
        direction: 'income',
        value: 520000,
        currency: 'USD',
        accountId: 'acc-1',
      },
      {
        id: 'tx-2',
        date: parseLocalDate('2026-03-05'),
        description: 'Rent',
        typeId: 'housing',
        direction: 'expense',
        value: 150000, // Needs: $1,500
        currency: 'USD',
        accountId: 'acc-1',
      },
      {
        id: 'tx-3',
        date: parseLocalDate('2026-03-10'),
        description: 'Gadget',
        typeId: 'shopping',
        direction: 'expense',
        value: 50000, // Wants: $500
        currency: 'USD',
        accountId: 'acc-1',
      },
    ];

    const budget = calculateMonthlyBudget(transactions, sampleGoalsConfig, targetDate, 'USD');

    expect(budget.actualIncome).toBe(520000);
    expect(budget.budgetBase).toBe(500000); // Uses referenceMonthlyIncome
    expect(budget.totalExpenses).toBe(200000);
    expect(budget.remainingBudget).toBe(300000);
    expect(budget.remainingBalance).toBe(320000);
    expect(budget.usedPercentage).toBe(40); // 200,000 / 500,000 = 40%

    // Needs category: 50% of 500,000 = 250,000 budgeted, 150,000 spent
    const needs = budget.categories.find(c => c.category.id === 'needs');
    expect(needs).toBeDefined();
    expect(needs!.budgeted).toBe(250000);
    expect(needs!.spent).toBe(150000);
    expect(needs!.remaining).toBe(100000);
    expect(needs!.percentageUsed).toBe(60);

    // Wants category: 30% of 500,000 = 150,000 budgeted, 50,000 spent
    const wants = budget.categories.find(c => c.category.id === 'wants');
    expect(wants).toBeDefined();
    expect(wants!.budgeted).toBe(150000);
    expect(wants!.spent).toBe(50000);
    expect(wants!.remaining).toBe(100000);
  });

  it('falls back to actual income as budgetBase when referenceMonthlyIncome is 0', () => {
    const configWithZeroRef: GoalsConfig = {
      ...sampleGoalsConfig,
      referenceMonthlyIncome: 0,
    };
    const targetDate = parseLocalDate('2026-03-15');
    const transactions: Transaction[] = [
      {
        id: 'tx-inc',
        date: parseLocalDate('2026-03-01'),
        description: 'Freelance',
        typeId: 'salary',
        direction: 'income',
        value: 300000,
        currency: 'USD',
        accountId: 'acc-1',
      },
      {
        id: 'tx-exp',
        date: parseLocalDate('2026-03-05'),
        description: 'Rent',
        typeId: 'housing',
        direction: 'expense',
        value: 120000,
        currency: 'USD',
        accountId: 'acc-1',
      },
    ];

    const budget = calculateMonthlyBudget(transactions, configWithZeroRef, targetDate, 'USD');
    expect(budget.budgetBase).toBe(300000);
    const needs = budget.categories.find(c => c.category.id === 'needs');
    expect(needs!.budgeted).toBe(150000); // 50% of 300,000
    expect(needs!.spent).toBe(120000);
  });

  it('excludes internal transfers from income and expenses', () => {
    const targetDate = parseLocalDate('2026-03-15');
    const transactions: Transaction[] = [
      {
        id: 'tx-transfer-out',
        date: parseLocalDate('2026-03-02'),
        description: 'Transfer Out',
        typeId: 'transfer',
        direction: 'expense',
        value: 100000,
        currency: 'USD',
        accountId: 'acc-1',
        transferId: 'transfer-1',
      },
      {
        id: 'tx-transfer-in',
        date: parseLocalDate('2026-03-02'),
        description: 'Transfer In',
        typeId: 'transfer',
        direction: 'income',
        value: 100000,
        currency: 'USD',
        accountId: 'acc-2',
        transferId: 'transfer-1',
      },
    ];

    const budget = calculateMonthlyBudget(transactions, sampleGoalsConfig, targetDate, 'USD');
    expect(budget.actualIncome).toBe(0);
    expect(budget.totalExpenses).toBe(0);
  });

  it('converts multi-currency transactions using exchange rate', () => {
    const targetDate = parseLocalDate('2026-03-15');
    const transactions: Transaction[] = [
      {
        id: 'tx-brl-exp',
        date: parseLocalDate('2026-03-04'),
        description: 'BRL expense',
        typeId: 'shopping',
        direction: 'expense',
        value: 50000, // 500.00 BRL
        currency: 'BRL',
        accountId: 'acc-brl',
      },
    ];

    // Exchange rate 5.0: 500 BRL / 5 = 100 USD = 10000 cents
    const budget = calculateMonthlyBudget(transactions, sampleGoalsConfig, targetDate, 'USD', 5.0);
    expect(budget.totalExpenses).toBe(10000);
    const wants = budget.categories.find(c => c.category.id === 'wants');
    expect(wants!.spent).toBe(10000);
  });

  it('formats percentages correctly', () => {
    expect(formatPercent(45.678)).toBe('45.68%');
    expect(formatPercent(50, 0)).toBe('50%');
    expect(formatPercent(12.3456, 1)).toBe('12.3%');
  });
});

