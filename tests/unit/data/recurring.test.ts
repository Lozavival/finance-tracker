import { describe, it, expect } from 'vitest';
import {
  buildRecurringTransactions,
  findRecurringSeries,
  formatRecurringLabel,
  RECURRING_PROJECTION_MONTHS,
  type RecurringRule,
} from '@/data/recurring';
import { parseLocalDate, toLocalDateString } from '@/data/dates';
import type { Transaction } from '@/data/transactions';

describe('Recurring Rules Engine', () => {
  const baseRule: RecurringRule = {
    id: 'rule-netflix',
    description: 'Netflix Subscription',
    value: 1999, // $19.99
    currency: 'USD',
    direction: 'expense',
    typeId: 'entertainment',
    accountId: 'test-checking',
    paymentMethodId: 'debit',
    startDate: parseLocalDate('2026-01-15'),
    frequency: 'monthly',
    limit: { kind: 'infinite' },
    status: 'active',
    createdAt: parseLocalDate('2026-01-01'),
  };

  describe('buildRecurringTransactions', () => {
    it('caps infinite recurring rules at RECURRING_PROJECTION_MONTHS (24 months)', () => {
      const txs = buildRecurringTransactions(baseRule, i => `tx-netflix-${i}`);
      expect(txs).toHaveLength(RECURRING_PROJECTION_MONTHS);
      expect(txs[0].id).toBe('tx-netflix-0');
      expect(toLocalDateString(txs[0].date)).toBe('2026-01-15');
      expect(txs[0].recurring).toEqual({
        ruleId: 'rule-netflix',
        iteration: 1,
        total: undefined,
        frequency: 'monthly',
      });

      // 24th month date
      expect(toLocalDateString(txs[23].date)).toBe('2027-12-15');
      expect(txs[23].recurring?.iteration).toBe(24);
    });

    it('generates exact count when limit is count-based', () => {
      const fixedRule: RecurringRule = {
        ...baseRule,
        limit: { kind: 'count', count: 6 },
      };

      const txs = buildRecurringTransactions(fixedRule, i => `tx-fixed-${i}`);
      expect(txs).toHaveLength(6);
      expect(txs[5].recurring).toEqual({
        ruleId: 'rule-netflix',
        iteration: 6,
        total: 6,
        frequency: 'monthly',
      });
      expect(toLocalDateString(txs[5].date)).toBe('2026-06-15');
    });

    it('stops generating transactions on or after canceledAt date', () => {
      const canceledRule: RecurringRule = {
        ...baseRule,
        status: 'canceled',
        canceledAt: parseLocalDate('2026-04-01'),
      };

      // Starts Jan 15, Feb 15, Mar 15. Apr 15 is >= 2026-04-01, so only 3 occurrences generated
      const txs = buildRecurringTransactions(canceledRule, i => `tx-canceled-${i}`);
      expect(txs).toHaveLength(3);
      expect(toLocalDateString(txs[0].date)).toBe('2026-01-15');
      expect(toLocalDateString(txs[1].date)).toBe('2026-02-15');
      expect(toLocalDateString(txs[2].date)).toBe('2026-03-15');
    });

    it('clamps monthly recurrence across variable length months (Jan 31)', () => {
      const endMonthRule: RecurringRule = {
        ...baseRule,
        startDate: parseLocalDate('2026-01-31'),
        limit: { kind: 'count', count: 4 },
      };

      const txs = buildRecurringTransactions(endMonthRule, i => `tx-end-${i}`);
      expect(txs).toHaveLength(4);
      expect(toLocalDateString(txs[0].date)).toBe('2026-01-31');
      expect(toLocalDateString(txs[1].date)).toBe('2026-02-28'); // Feb clamped
      expect(toLocalDateString(txs[2].date)).toBe('2026-03-31');
      expect(toLocalDateString(txs[3].date)).toBe('2026-04-30'); // Apr clamped
    });
  });

  describe('findRecurringSeries', () => {
    it('finds and sorts all transactions belonging to a recurring rule', () => {
      const txs: Transaction[] = [
        {
          id: 'tx-2',
          date: parseLocalDate('2026-02-15'),
          description: 'Sub',
          typeId: 'ent',
          direction: 'expense',
          value: 1000,
          currency: 'USD',
          accountId: 'acc-1',
          recurring: { ruleId: 'rule-sub', iteration: 2, frequency: 'monthly' },
        },
        {
          id: 'tx-1',
          date: parseLocalDate('2026-01-15'),
          description: 'Sub',
          typeId: 'ent',
          direction: 'expense',
          value: 1000,
          currency: 'USD',
          accountId: 'acc-1',
          recurring: { ruleId: 'rule-sub', iteration: 1, frequency: 'monthly' },
        },
      ];

      const found = findRecurringSeries(txs, txs[0]);
      expect(found).toHaveLength(2);
      expect(found![0].id).toBe('tx-1');
      expect(found![1].id).toBe('tx-2');

      const nonRecurringTx: Transaction = {
        id: 'tx-other',
        date: parseLocalDate('2026-01-10'),
        description: 'Other',
        typeId: 'food',
        direction: 'expense',
        value: 500,
        currency: 'USD',
        accountId: 'acc-1',
      };
      expect(findRecurringSeries(txs, nonRecurringTx)).toBeNull();
    });
  });

  describe('formatRecurringLabel', () => {
    it('formats infinite recurring rules with default label', () => {
      expect(formatRecurringLabel({ ruleId: 'r', iteration: 3, frequency: 'monthly' })).toBe('Monthly');
    });

    it('formats count-limited recurring rules with iteration fraction', () => {
      expect(formatRecurringLabel({ ruleId: 'r', iteration: 3, total: 12, frequency: 'monthly' })).toBe(
        '3/12 • Monthly',
      );
    });
  });
});

