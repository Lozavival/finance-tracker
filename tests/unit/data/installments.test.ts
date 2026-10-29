import { describe, it, expect } from 'vitest';
import {
  splitInstallmentValues,
  buildInstallments,
  findInstallmentSeries,
  formatInstallmentLabel,
  MAX_INSTALLMENTS,
} from '@/data/installments';
import type { Transaction, TransactionDraft } from '@/data/transactions';
import { parseLocalDate, toLocalDateString } from '@/data/dates';

describe('Installments Domain Engine', () => {
  describe('splitInstallmentValues', () => {
    it('splits evenly divisible values with zero remainder', () => {
      const parts = splitInstallmentValues(300, 3);
      expect(parts).toEqual([100, 100, 100]);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(300);
    });

    it('allocates remainder cents exclusively to index 0', () => {
      // 100 cents / 3 = 33 cents each, remainder 1 cent -> [34, 33, 33]
      const parts3 = splitInstallmentValues(100, 3);
      expect(parts3).toEqual([34, 33, 33]);
      expect(parts3.reduce((a, b) => a + b, 0)).toBe(100);

      // 1000 cents / 6 = 166 * 6 = 996, remainder 4 -> [170, 166, 166, 166, 166, 166]
      const parts6 = splitInstallmentValues(1000, 6);
      expect(parts6).toEqual([170, 166, 166, 166, 166, 166]);
      expect(parts6.reduce((a, b) => a + b, 0)).toBe(1000);
    });

    it('handles 1 installment correctly', () => {
      expect(splitInstallmentValues(5432, 1)).toEqual([5432]);
    });

    it('handles max limit 48 installments without cent loss', () => {
      const total = 999999;
      const parts = splitInstallmentValues(total, MAX_INSTALLMENTS);
      expect(parts).toHaveLength(MAX_INSTALLMENTS);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
    });

    it('rounds floating point inputs to nearest integer cent', () => {
      const parts = splitInstallmentValues(100.4, 2);
      expect(parts).toEqual([50, 50]);
    });
  });

  describe('buildInstallments', () => {
    it('creates accurate installment transaction series with clamped monthly dates', () => {
      const draft: Extract<TransactionDraft, { kind: 'installments' }> = {
        kind: 'installments',
        transaction: {
          description: 'MacBook Pro',
          typeId: 'tech',
          direction: 'expense',
          currency: 'USD',
          accountId: 'card-1',
          paymentMethodId: 'credit-card',
        },
        firstDate: parseLocalDate('2026-01-31'),
        totalValue: 10000, // $100.00
        count: 4,
      };

      const ids = ['tx-1', 'tx-2', 'tx-3', 'tx-4'];
      const series = buildInstallments(draft, 'group-macbook', ids);

      expect(series).toHaveLength(4);
      expect(series[0].id).toBe('tx-1');
      expect(series[0].value).toBe(2500);
      expect(toLocalDateString(series[0].date)).toBe('2026-01-31');
      expect(series[0].installment).toEqual({ groupId: 'group-macbook', number: 1, total: 4 });

      // February clamping (2026 is non-leap year -> Feb 28)
      expect(toLocalDateString(series[1].date)).toBe('2026-02-28');
      expect(toLocalDateString(series[2].date)).toBe('2026-03-31');
      // April clamping (30 days)
      expect(toLocalDateString(series[3].date)).toBe('2026-04-30');
    });
  });

  describe('findInstallmentSeries', () => {
    it('finds and sorts all installments belonging to group', () => {
      const txs: Transaction[] = [
        {
          id: 'tx-2',
          date: parseLocalDate('2026-02-28'),
          description: 'Phone',
          typeId: 'tech',
          direction: 'expense',
          value: 5000,
          currency: 'USD',
          accountId: 'card-1',
          installment: { groupId: 'g1', number: 2, total: 2 },
        },
        {
          id: 'tx-1',
          date: parseLocalDate('2026-01-31'),
          description: 'Phone',
          typeId: 'tech',
          direction: 'expense',
          value: 5000,
          currency: 'USD',
          accountId: 'card-1',
          installment: { groupId: 'g1', number: 1, total: 2 },
        },
        {
          id: 'tx-unrelated',
          date: parseLocalDate('2026-01-15'),
          description: 'Coffee',
          typeId: 'dining',
          direction: 'expense',
          value: 400,
          currency: 'USD',
          accountId: 'card-1',
        },
      ];

      const found = findInstallmentSeries(txs, txs[0]);
      expect(found).toHaveLength(2);
      expect(found![0].id).toBe('tx-1');
      expect(found![1].id).toBe('tx-2');

      const notFound = findInstallmentSeries(txs, txs[2]);
      expect(notFound).toBeNull();
    });
  });

  describe('formatInstallmentLabel', () => {
    it('formats normal installment fractions', () => {
      expect(formatInstallmentLabel({ groupId: 'g', number: 1, total: 12 })).toBe('1/12');
    });

    it('formats accrual basis label when number is -1', () => {
      expect(formatInstallmentLabel({ groupId: 'g', number: -1, total: 6 })).toBe('6 Installments');
    });
  });
});
