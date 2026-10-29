import { describe, it, expect } from 'vitest';
import {
  localDateStringSchema,
  transactionSearchQuerySchema,
  serializedTransactionDraftSchema,
  serializedTransactionSchema,
  directionSchema,
} from '@/../../src/server/rpcSchemas';

describe('Server RPC Zod Validation Schemas', () => {
  describe('localDateStringSchema', () => {
    it('accepts valid YYYY-MM-DD calendar dates', () => {
      expect(localDateStringSchema.safeParse('2026-03-15').success).toBe(true);
      expect(localDateStringSchema.safeParse('2024-02-29').success).toBe(true); // leap year
    });

    it('rejects invalid formatting and non-existent dates', () => {
      expect(localDateStringSchema.safeParse('2026/03/15').success).toBe(false);
      expect(localDateStringSchema.safeParse('2026-3-15').success).toBe(false);
      expect(localDateStringSchema.safeParse('2026-02-30').success).toBe(false); // Feb 30 does not exist
      expect(localDateStringSchema.safeParse('2025-02-29').success).toBe(false); // 2025 is not leap
      expect(localDateStringSchema.safeParse('2026-04-31').success).toBe(false); // April has 30 days
    });
  });

  describe('transactionSearchQuerySchema', () => {
    it('accepts valid search queries with length >= 2', () => {
      const res = transactionSearchQuerySchema.safeParse({ q: 'coffee' });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.limit).toBe(500); // default limit
      }
    });

    it('rejects queries shorter than SEARCH_MIN_LENGTH (2 chars)', () => {
      expect(transactionSearchQuerySchema.safeParse({ q: 'a' }).success).toBe(false);
      expect(transactionSearchQuerySchema.safeParse({ q: '   ' }).success).toBe(false);
    });
  });

  describe('serializedTransactionSchema', () => {
    it('validates transaction with integer cents and rejects floating point cents', () => {
      const valid = {
        id: 'tx-1',
        date: '2026-03-15',
        direction: 'expense',
        value: 1550, // 1550 integer cents
        currency: 'USD',
        description: 'Coffee',
        accountId: 'acc-1',
        typeId: 'food-dining',
      };
      expect(serializedTransactionSchema.safeParse(valid).success).toBe(true);

      const invalidFloat = {
        ...valid,
        value: 15.5, // float rejected
      };
      expect(serializedTransactionSchema.safeParse(invalidFloat).success).toBe(false);
    });
  });

  describe('serializedTransactionDraftSchema', () => {
    it('validates single draft', () => {
      const draft = {
        kind: 'single',
        transaction: {
          date: '2026-03-15',
          direction: 'expense',
          value: 2000,
          currency: 'USD',
          description: 'Lunch',
          accountId: 'acc-1',
          typeId: 'food-dining',
        },
      };
      expect(serializedTransactionDraftSchema.safeParse(draft).success).toBe(true);
    });

    it('validates transfer draft requiring positive integer amounts', () => {
      const validTransfer = {
        kind: 'transfer',
        date: '2026-03-15',
        value: 10000,
        fromAccountId: 'acc-from',
        toAccountId: 'acc-to',
      };
      expect(serializedTransactionDraftSchema.safeParse(validTransfer).success).toBe(true);

      const invalidNonPositive = {
        ...validTransfer,
        value: -500,
      };
      expect(serializedTransactionDraftSchema.safeParse(invalidNonPositive).success).toBe(false);
    });

    it('validates installments draft requiring count >= 1 and positive totalValue', () => {
      const validInstallments = {
        kind: 'installments',
        firstDate: '2026-03-15',
        count: 3,
        totalValue: 9000,
        transaction: {
          direction: 'expense',
          currency: 'USD',
          description: 'Keyboard',
          accountId: 'card-1',
          typeId: 'shopping',
        },
      };
      expect(serializedTransactionDraftSchema.safeParse(validInstallments).success).toBe(true);

      const invalidCount = {
        ...validInstallments,
        count: 0,
      };
      expect(serializedTransactionDraftSchema.safeParse(invalidCount).success).toBe(false);
    });

    it('validates recurring draft with monthly frequency and recurrence limit', () => {
      const validRecurring = {
        kind: 'recurring',
        startDate: '2026-04-01',
        value: 1200,
        frequency: 'monthly',
        limit: { kind: 'infinite' },
        transaction: {
          direction: 'expense',
          currency: 'USD',
          description: 'Streaming',
          accountId: 'card-1',
          typeId: 'bills',
        },
      };
      expect(serializedTransactionDraftSchema.safeParse(validRecurring).success).toBe(true);
    });
  });
});

