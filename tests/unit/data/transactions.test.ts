import { describe, it, expect } from 'vitest';
import {
  buildTransferLegs,
  findTransferLegs,
  groupToAccrualBasis,
  groupTransactionsByMonth,
  sortTransactionsAscending,
  sortTransactionsDescending,
  resolvePeriodRange,
  aggregateExpensesByCategory,
  formatSignedValue,
  type Transaction,
} from '@/data/transactions';
import { parseLocalDate } from '@/data/dates';
import { DEFAULT_TRANSACTION_TYPES } from '@/data/defaults/defaultTypes';

describe('Transactions Data Engine', () => {
  describe('buildTransferLegs and findTransferLegs', () => {
    it('builds matched outgoing and incoming legs for single currency transfer', () => {
      const date = parseLocalDate('2026-03-10');
      const legs = buildTransferLegs(
        {
          kind: 'transfer',
          date,
          value: 10000, // $100.00
          fromAccountId: 'checking-1',
          fromCurrency: 'USD',
          toAccountId: 'savings-1',
          toCurrency: 'USD',
        },
        'transfer-123',
        ['tx-out', 'tx-in'],
        { fromName: 'Main Checking', toName: 'High Yield Savings' },
      );

      const [outLeg, inLeg] = legs;
      expect(outLeg.id).toBe('tx-out');
      expect(outLeg.direction).toBe('expense');
      expect(outLeg.value).toBe(10000);
      expect(outLeg.accountId).toBe('checking-1');
      expect(outLeg.transferId).toBe('transfer-123');
      expect(outLeg.description).toContain('to High Yield Savings');

      expect(inLeg.id).toBe('tx-in');
      expect(inLeg.direction).toBe('income');
      expect(inLeg.value).toBe(10000);
      expect(inLeg.accountId).toBe('savings-1');
      expect(inLeg.transferId).toBe('transfer-123');
      expect(inLeg.description).toContain('from Main Checking');

      // findTransferLegs can reconstruct them from a list
      const found = findTransferLegs(legs, outLeg);
      expect(found).not.toBeNull();
      expect(found!.outgoing.id).toBe('tx-out');
      expect(found!.incoming.id).toBe('tx-in');
    });

    it('builds dual currency cross-currency transfer legs with custom toValue and rate label', () => {
      const date = parseLocalDate('2026-03-10');
      const legs = buildTransferLegs(
        {
          kind: 'transfer',
          date,
          value: 10000, // 100.00 USD
          toValue: 55000, // 550.00 BRL
          fromAccountId: 'checking-usd',
          fromCurrency: 'USD',
          toAccountId: 'checking-brl',
          toCurrency: 'BRL',
        },
        'transfer-cross',
        ['tx-usd', 'tx-brl'],
      );

      expect(legs[0].currency).toBe('USD');
      expect(legs[0].value).toBe(10000);
      expect(legs[1].currency).toBe('BRL');
      expect(legs[1].value).toBe(55000);
      expect(legs[0].description).toContain('550.00 BRL');
    });

    it('returns null when finding transfer legs for non-transfer transaction', () => {
      const tx: Transaction = {
        id: 'tx-solo',
        date: parseLocalDate('2026-03-01'),
        description: 'Groceries',
        typeId: 'food-dining',
        direction: 'expense',
        value: 2000,
        currency: 'USD',
        accountId: 'acc-1',
      };
      expect(findTransferLegs([tx], tx)).toBeNull();
    });
  });

  describe('groupToAccrualBasis', () => {
    it('aggregates multi-month installment series back to single purchase with number = -1', () => {
      const installments: Transaction[] = [
        {
          id: 'inst-1',
          date: parseLocalDate('2026-01-10'),
          description: 'MacBook (1/3)',
          typeId: 'shopping',
          direction: 'expense',
          value: 40000,
          currency: 'USD',
          accountId: 'card-1',
          installment: { groupId: 'mac-group', number: 1, total: 3 },
        },
        {
          id: 'inst-2',
          date: parseLocalDate('2026-02-10'),
          description: 'MacBook (2/3)',
          typeId: 'shopping',
          direction: 'expense',
          value: 30000,
          currency: 'USD',
          accountId: 'card-1',
          installment: { groupId: 'mac-group', number: 2, total: 3 },
        },
        {
          id: 'inst-3',
          date: parseLocalDate('2026-03-10'),
          description: 'MacBook (3/3)',
          typeId: 'shopping',
          direction: 'expense',
          value: 30000,
          currency: 'USD',
          accountId: 'card-1',
          installment: { groupId: 'mac-group', number: 3, total: 3 },
        },
        {
          id: 'tx-regular',
          date: parseLocalDate('2026-03-15'),
          description: 'Lunch',
          typeId: 'food-dining',
          direction: 'expense',
          value: 1500,
          currency: 'USD',
          accountId: 'card-1',
        },
      ];

      const accrual = groupToAccrualBasis(installments);
      expect(accrual).toHaveLength(2); // 1 grouped installment + 1 regular

      const groupedMac = accrual.find(t => t.installment?.groupId === 'mac-group');
      expect(groupedMac).toBeDefined();
      expect(groupedMac!.value).toBe(100000); // 40000 + 30000 + 30000
      expect(groupedMac!.installment?.number).toBe(-1);
    });
  });

  describe('groupTransactionsByMonth and sorting', () => {
    it('groups transactions chronologically by month key', () => {
      const txs: Transaction[] = [
        {
          id: 'tx-jan',
          date: parseLocalDate('2026-01-15'),
          description: 'Jan',
          typeId: 'shopping',
          direction: 'expense',
          value: 1000,
          currency: 'USD',
          accountId: 'acc-1',
        },
        {
          id: 'tx-feb',
          date: parseLocalDate('2026-02-10'),
          description: 'Feb',
          typeId: 'shopping',
          direction: 'expense',
          value: 2000,
          currency: 'USD',
          accountId: 'acc-1',
        },
      ];

      const groups = groupTransactionsByMonth(txs);
      expect(groups).toHaveLength(2);
      expect(groups[0].key).toBe('2026-01');
      expect(groups[1].key).toBe('2026-02');
    });

    it('sorts transactions ascending and descending with id tiebreaker', () => {
      const d = parseLocalDate('2026-03-01');
      const tx1: Transaction = {
        id: 'tx-a',
        date: d,
        description: 'A',
        typeId: 'food-dining',
        direction: 'expense',
        value: 100,
        currency: 'USD',
        accountId: 'acc',
      };
      const tx2: Transaction = {
        id: 'tx-b',
        date: d,
        description: 'B',
        typeId: 'food-dining',
        direction: 'expense',
        value: 200,
        currency: 'USD',
        accountId: 'acc',
      };

      const asc = sortTransactionsAscending([tx2, tx1]);
      expect(asc[0].id).toBe('tx-a');
      expect(asc[1].id).toBe('tx-b');

      const desc = sortTransactionsDescending([tx1, tx2]);
      expect(desc[0].id).toBe('tx-b');
      expect(desc[1].id).toBe('tx-a');
    });
  });

  describe('resolvePeriodRange', () => {
    const today = parseLocalDate('2026-03-15');

    it('returns null for "all" period', () => {
      expect(resolvePeriodRange({ kind: 'all' }, today)).toBeNull();
    });

    it('resolves "up-to-today"', () => {
      const range = resolvePeriodRange({ kind: 'up-to-today' }, today);
      expect(range).not.toBeNull();
      expect(range!.to).toEqual(today);
    });

    it('resolves preset day counts', () => {
      const range = resolvePeriodRange({ kind: 'preset', days: 7 }, today);
      expect(range).not.toBeNull();
      expect(range!.to).toEqual(today);
      expect(range!.from).toEqual(parseLocalDate('2026-03-09'));
    });
  });

  describe('aggregateExpensesByCategory and formatSignedValue', () => {
    it('aggregates expenses per category, omitting zero balances and transfers', () => {
      const txs: Transaction[] = [
        {
          id: 'tx-1',
          date: parseLocalDate('2026-03-01'),
          description: 'Groceries',
          typeId: 'food-dining',
          direction: 'expense',
          value: 5000,
          currency: 'USD',
          accountId: 'acc',
        },
        {
          id: 'tx-2',
          date: parseLocalDate('2026-03-02'),
          description: 'Dining',
          typeId: 'food-dining',
          direction: 'expense',
          value: 3000,
          currency: 'USD',
          accountId: 'acc',
        },
        {
          id: 'tx-trans',
          date: parseLocalDate('2026-03-03'),
          description: 'Transfer',
          typeId: 'transfer',
          direction: 'expense',
          value: 50000,
          currency: 'USD',
          accountId: 'acc',
          transferId: 't-1',
        },
      ];

      const totals = aggregateExpensesByCategory(txs, DEFAULT_TRANSACTION_TYPES, 'USD');
      const foodTotal = totals.find(t => t.typeId === 'food-dining');
      expect(foodTotal).toBeDefined();
      expect(foodTotal!.value).toBe(8000);
      // Transfer type should not be aggregated
      const transTotal = totals.find(t => t.typeId === 'transfer');
      expect(transTotal).toBeUndefined();
    });

    it('formats signed values with + for income and − for expense', () => {
      const inc: Transaction = {
        id: 'inc',
        date: parseLocalDate('2026-03-01'),
        description: 'Pay',
        typeId: 'salary',
        direction: 'income',
        value: 10000,
        currency: 'USD',
        accountId: 'acc',
      };
      const exp: Transaction = {
        id: 'exp',
        date: parseLocalDate('2026-03-01'),
        description: 'Snack',
        typeId: 'food-dining',
        direction: 'expense',
        value: 450,
        currency: 'USD',
        accountId: 'acc',
      };

      expect(formatSignedValue(inc, 'en-US')).toContain('+$100.00');
      expect(formatSignedValue(exp, 'en-US')).toContain('−$4.50');
    });
  });
});

