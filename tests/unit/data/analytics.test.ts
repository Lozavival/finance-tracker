import { describe, it, expect } from 'vitest';
import {
  calculateDashboardKpis,
  calculateMonthlyCashFlowHistory,
  calculateCumulativeSpendingPace,
  calculateCategoryBreakdown,
  generateSmartFinancialSignals,
  getUpcomingObligations,
} from '@/data/analytics';
import { parseLocalDate } from '@/data/dates';
import type { Transaction } from '@/data/transactions';
import type { CardStatement } from '@/data/cardStatements';
import { buildCashMovements, buildLedgers } from '@/data/ledger';
import { createTestSettings } from '../../fixtures/test-workspace';
import { EMPTY_GOALS_CONFIG } from '@/data/defaults/defaultGoals';

describe('Analytics & Smart Insights Engine', () => {
  const settings = createTestSettings();

  describe('calculateDashboardKpis', () => {
    it('computes total balance, monthly inflow, outflow, and net savings', () => {
      const today = parseLocalDate('2026-03-15');

      const txs: Transaction[] = [
        {
          id: 'tx-inc',
          date: parseLocalDate('2026-03-01'),
          description: 'Salary',
          typeId: 'salary',
          direction: 'income',
          value: 400000, // +$4,000.00
          currency: 'USD',
          accountId: 'test-checking',
          paymentMethodId: 'bank-transfer',
        },
        {
          id: 'tx-exp',
          date: parseLocalDate('2026-03-05'),
          description: 'Rent',
          typeId: 'housing',
          direction: 'expense',
          value: 150000, // -$1,500.00
          currency: 'USD',
          accountId: 'test-checking',
          paymentMethodId: 'debit',
        },
      ];

      const movements = buildCashMovements(txs, [], settings);
      const ledgers = buildLedgers(movements, settings);

      const kpis = calculateDashboardKpis(txs, ledgers, settings, EMPTY_GOALS_CONFIG, today, 0, 'USD');

      expect(kpis.monthlyInflowCents).toBe(400000);
      expect(kpis.monthlyOutflowCents).toBe(150000);
      expect(kpis.netSavingsCents).toBe(250000);
      // savings rate = 250,000 / 400,000 = 62.5%
      expect(kpis.savingsRate).toBe(62.5);
    });

    it('clamps savings rate to 0% when income is zero and expenses occur', () => {
      const today = parseLocalDate('2026-03-15');
      const txs: Transaction[] = [
        {
          id: 'tx-exp',
          date: parseLocalDate('2026-03-05'),
          description: 'Dining',
          typeId: 'food',
          direction: 'expense',
          value: 5000,
          currency: 'USD',
          accountId: 'test-checking',
          paymentMethodId: 'debit',
        },
      ];

      const movements = buildCashMovements(txs, [], settings);
      const ledgers = buildLedgers(movements, settings);
      const kpis = calculateDashboardKpis(txs, ledgers, settings, EMPTY_GOALS_CONFIG, today, 0, 'USD');

      expect(kpis.savingsRate).toBe(0);
    });
  });

  describe('calculateMonthlyCashFlowHistory', () => {
    it('aggregates income, expenses, and net cash flow across rolling months', () => {
      const today = parseLocalDate('2026-03-15');
      const txs: Transaction[] = [
        {
          id: 'tx-feb',
          date: parseLocalDate('2026-02-15'),
          description: 'Feb Income',
          typeId: 'salary',
          direction: 'income',
          value: 300000,
          currency: 'USD',
          accountId: 'test-checking',
        },
        {
          id: 'tx-mar',
          date: parseLocalDate('2026-03-10'),
          description: 'Mar Expense',
          typeId: 'food',
          direction: 'expense',
          value: 100000,
          currency: 'USD',
          accountId: 'test-checking',
        },
      ];

      const history = calculateMonthlyCashFlowHistory(txs, 3, today, 'en-US', 'all', 'USD');
      expect(history).toHaveLength(3);

      const febItem = history.find(h => h.monthKey === '2026-02');
      expect(febItem).toBeDefined();
      expect(febItem!.income).toBe(300000);

      const marItem = history.find(h => h.monthKey === '2026-03');
      expect(marItem).toBeDefined();
      expect(marItem!.expenses).toBe(100000);
    });
  });

  describe('calculateCategoryBreakdown', () => {
    it('calculates category spend totals and percentage shares', () => {
      const today = parseLocalDate('2026-03-15');
      const txs: Transaction[] = [
        {
          id: 'tx-1',
          date: parseLocalDate('2026-03-05'),
          description: 'Groceries',
          typeId: 'food-dining',
          direction: 'expense',
          value: 30000, // $300.00
          currency: 'USD',
          accountId: 'test-checking',
        },
        {
          id: 'tx-2',
          date: parseLocalDate('2026-03-08'),
          description: 'Cinema',
          typeId: 'entertainment',
          direction: 'expense',
          value: 10000, // $100.00
          currency: 'USD',
          accountId: 'test-checking',
        },
      ];

      const breakdown = calculateCategoryBreakdown(
        txs,
        settings,
        EMPTY_GOALS_CONFIG,
        'this-month',
        'types',
        today,
        'all',
        'USD',
      );
      expect(breakdown.totalSpend).toBe(40000);
      expect(breakdown.items.length).toBe(2);

      const foodCat = breakdown.items.find(c => c.id === 'food-dining');
      expect(foodCat).toBeDefined();
      expect(foodCat!.value).toBe(30000);
      expect(foodCat!.percentage).toBe(75); // 30,000 / 40,000 = 75%
    });
  });

  describe('calculateCumulativeSpendingPace', () => {
    it('generates pace points for each day of the month up to days in month', () => {
      const today = parseLocalDate('2026-03-15');
      const txs: Transaction[] = [
        {
          id: 'tx-1',
          date: parseLocalDate('2026-03-05'),
          description: 'Groceries',
          typeId: 'food',
          direction: 'expense',
          value: 15000,
          currency: 'USD',
          accountId: 'test-checking',
        },
      ];

      const pace = calculateCumulativeSpendingPace(txs, EMPTY_GOALS_CONFIG, today, 'USD');
      expect(pace).toHaveLength(31); // March has 31 days
      expect(pace[4].currentMonthSpent).toBe(15000); // Day 5 index 4
      expect(pace[14].currentMonthSpent).toBe(15000); // Day 15 index 14
      expect(pace[15].currentMonthSpent).toBeUndefined(); // Day 16 (future relative to today)
    });
  });

  describe('generateSmartFinancialSignals', () => {
    it('detects upcoming credit card statement bill obligations within threshold', () => {
      const today = parseLocalDate('2026-04-03');
      const statements: CardStatement[] = [
        {
          id: 'stmt-1',
          accountId: 'test-credit-card',
          account: 'test-credit-card',
          cardName: 'Platinum Card',
          currency: 'USD',
          periodStart: parseLocalDate('2026-02-21'),
          closingDate: parseLocalDate('2026-03-20'),
          dueDate: parseLocalDate('2026-04-05'), // 2 days away!
          items: [],
          charges: 50000,
          credits: 0,
          total: 50000,
          status: 'open',
        },
      ];

      const movements = buildCashMovements([], statements, settings);
      const ledgers = buildLedgers(movements, settings);

      const signals = generateSmartFinancialSignals(
        [],
        settings,
        EMPTY_GOALS_CONFIG,
        statements,
        [],
        ledgers,
        today,
        'USD',
      );

      const billSignal = signals.find(s => s.type === 'upcoming-bill');
      expect(billSignal).toBeDefined();
      expect(billSignal!.amountCents).toBe(50000);
    });
  });

  describe('getUpcomingObligations', () => {
    it('aggregates upcoming credit card bills and recurring subscription obligations', () => {
      const today = parseLocalDate('2026-03-10');
      const statements: CardStatement[] = [
        {
          id: 'stmt-1',
          accountId: 'test-credit-card',
          account: 'test-credit-card',
          cardName: 'Platinum Card',
          currency: 'USD',
          periodStart: parseLocalDate('2026-01-21'),
          closingDate: parseLocalDate('2026-02-20'),
          dueDate: parseLocalDate('2026-03-15'), // in 5 days
          items: [],
          charges: 45000,
          credits: 0,
          total: 45000,
          status: 'closed',
        },
      ];

      const obligations = getUpcomingObligations(statements, [], [], settings, today, 30);
      expect(obligations.length).toBeGreaterThanOrEqual(1);
      expect(obligations[0].amount).toBe(45000);
      expect(obligations[0].kind).toBe('card-bill');
      expect(obligations[0].daysRemaining).toBe(5);
    });
  });
});
