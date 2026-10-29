import { describe, it, expect } from 'vitest';
import { getStatementDates, buildStatements, getCardUsage } from '@/data/cardStatements';
import type { CreditCardConfig } from '@/data/settings';
import type { Transaction } from '@/data/transactions';
import { parseLocalDate, toLocalDateString } from '@/data/dates';
import { createTestSettings } from '../../fixtures/test-workspace';

describe('Credit Card Statements Engine', () => {
  const sampleCard: CreditCardConfig = {
    name: 'Nubank Platinum',
    closingDay: 20,
    dueDay: 5,
    limit: 500000, // $5,000.00
  };

  describe('getStatementDates', () => {
    it('handles purchase before closing day in the same month', () => {
      // Purchase on Mar 15: closes Mar 20, due Apr 5
      const dates = getStatementDates(sampleCard, parseLocalDate('2026-03-15'));
      expect(toLocalDateString(dates.closingDate)).toBe('2026-03-20');
      expect(toLocalDateString(dates.dueDate)).toBe('2026-04-05');
    });

    it('handles purchase exactly on closing day', () => {
      // Purchase on Mar 20: closes Mar 20, due Apr 5
      const dates = getStatementDates(sampleCard, parseLocalDate('2026-03-20'));
      expect(toLocalDateString(dates.closingDate)).toBe('2026-03-20');
      expect(toLocalDateString(dates.dueDate)).toBe('2026-04-05');
    });

    it('handles purchase after closing day (rolls over to next billing cycle)', () => {
      // Purchase on Mar 21: closes Apr 20, due May 5
      const dates = getStatementDates(sampleCard, parseLocalDate('2026-03-21'));
      expect(toLocalDateString(dates.closingDate)).toBe('2026-04-20');
      expect(toLocalDateString(dates.dueDate)).toBe('2026-05-05');
    });

    it('handles year rollover (December purchase closing in January/February)', () => {
      // Purchase on Dec 25: closes Jan 20, due Feb 5
      const dates = getStatementDates(sampleCard, parseLocalDate('2026-12-25'));
      expect(toLocalDateString(dates.closingDate)).toBe('2027-01-20');
      expect(toLocalDateString(dates.dueDate)).toBe('2027-02-05');
    });

    it('clamps closing day and due day to last day of shorter months (Feb 28 non-leap)', () => {
      const endMonthCard: CreditCardConfig = {
        name: 'End Month Card',
        closingDay: 31,
        dueDay: 31,
        limit: 100000,
      };

      // Purchase in February: closes Feb 28, due Mar 31
      const febDates = getStatementDates(endMonthCard, parseLocalDate('2026-02-10'));
      expect(toLocalDateString(febDates.closingDate)).toBe('2026-02-28');
      expect(toLocalDateString(febDates.dueDate)).toBe('2026-03-31');

      // Purchase in April (30 days): closes Apr 30, due May 31
      const aprDates = getStatementDates(endMonthCard, parseLocalDate('2026-04-10'));
      expect(toLocalDateString(aprDates.closingDate)).toBe('2026-04-30');
      expect(toLocalDateString(aprDates.dueDate)).toBe('2026-05-31');
    });

    it('handles card where dueDay > closingDay (due date falls in the same month as closing)', () => {
      const midMonthCard: CreditCardConfig = {
        name: 'Mid Month Card',
        closingDay: 10,
        dueDay: 25,
        limit: 200000,
      };

      const dates = getStatementDates(midMonthCard, parseLocalDate('2026-04-05'));
      expect(toLocalDateString(dates.closingDate)).toBe('2026-04-10');
      expect(toLocalDateString(dates.dueDate)).toBe('2026-04-25');
    });
  });

  describe('buildStatements', () => {
    it('aggregates charges and payments into statement cycles and assigns status', () => {
      const settings = createTestSettings();
      // April 2 is between Mar 20 closing and Apr 5 due date
      const today = parseLocalDate('2026-04-02');

      const txs: Transaction[] = [
        // March Statement (closes 2026-03-20, due 2026-04-05) -> closed as of 2026-04-02
        {
          id: 'tx-1',
          date: parseLocalDate('2026-03-10'),
          description: 'Groceries',
          typeId: 'food',
          direction: 'expense',
          value: 15000, // $150.00
          currency: 'USD',
          accountId: 'test-credit-card',
          paymentMethodId: 'credit-card',
        },
        // April Statement (closes 2026-04-20, due 2026-05-05) -> open as of 2026-04-02
        {
          id: 'tx-2',
          date: parseLocalDate('2026-03-25'),
          description: 'Electronics',
          typeId: 'tech',
          direction: 'expense',
          value: 20000, // $200.00
          currency: 'USD',
          accountId: 'test-credit-card',
          paymentMethodId: 'credit-card',
        },
      ];

      const statements = buildStatements(txs, settings, today);
      const cardStatements = statements.filter(s => s.accountId === 'test-credit-card');

      expect(cardStatements.length).toBeGreaterThanOrEqual(2);

      const marStatement = cardStatements.find(s => toLocalDateString(s.closingDate) === '2026-03-20');
      expect(marStatement).toBeDefined();
      expect(marStatement!.charges).toBe(15000);
      expect(marStatement!.total).toBe(15000);
      expect(marStatement!.status).toBe('closed');

      const aprStatement = cardStatements.find(s => toLocalDateString(s.closingDate) === '2026-04-20');
      expect(aprStatement).toBeDefined();
      expect(aprStatement!.charges).toBe(20000);
      expect(aprStatement!.total).toBe(20000);
      expect(aprStatement!.status).toBe('open');

      // Test 'paid' status transition when today is on/after dueDate
      const laterStatements = buildStatements(txs, settings, parseLocalDate('2026-04-06'));
      const paidStatement = laterStatements.find(s => toLocalDateString(s.closingDate) === '2026-03-20');
      expect(paidStatement!.status).toBe('paid');
    });
  });

  describe('getCardUsage', () => {
    it('computes total balance, available credit, and used amount', () => {
      const settings = createTestSettings();
      // Statement closes Apr 20, so on Apr 10 it is open and unpaid
      const today = parseLocalDate('2026-04-10');

      const txs: Transaction[] = [
        {
          id: 'tx-1',
          date: parseLocalDate('2026-04-05'),
          description: 'Charge 1',
          typeId: 'food',
          direction: 'expense',
          value: 100000, // $1,000.00
          currency: 'USD',
          accountId: 'test-credit-card',
          paymentMethodId: 'credit-card',
        },
      ];

      const statements = buildStatements(txs, settings, today);
      const usage = getCardUsage(statements, 'test-credit-card', settings);

      expect(usage).toBeDefined();
      expect(usage.limit).toBe(500000); // $5,000.00
      expect(usage.used).toBe(100000);
      expect(usage.available).toBe(400000);
    });
  });
});
