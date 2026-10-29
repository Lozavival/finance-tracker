import { describe, it, expect } from 'vitest';
import {
  buildCashMovements,
  buildLedgers,
  balanceAt,
  resolveHorizonEnd,
  buildDailySeries,
  getAccountForecast,
  getAccountLedger,
} from '@/data/ledger';
import { parseLocalDate, toLocalDateString } from '@/data/dates';
import type { Transaction } from '@/data/transactions';
import type { CardStatement } from '@/data/cardStatements';
import { createTestSettings } from '../../fixtures/test-workspace';

describe('Ledger & Cash Flow Forecasting Engine', () => {
  const settings = createTestSettings();

  describe('buildCashMovements & buildLedgers', () => {
    it('aggregates opening balances, transactions, and card bills into running ledger balance', () => {
      // Checking opening balance is 100,000 cents ($1,000.00) on 2026-01-01
      const txs: Transaction[] = [
        {
          id: 'tx-salary',
          date: parseLocalDate('2026-01-05'),
          description: 'Salary',
          typeId: 'salary',
          direction: 'income',
          value: 200000, // +$2,000.00
          currency: 'USD',
          accountId: 'test-checking',
          paymentMethodId: 'bank-transfer',
        },
        {
          id: 'tx-groceries',
          date: parseLocalDate('2026-01-10'),
          description: 'Groceries',
          typeId: 'food',
          direction: 'expense',
          value: 50000, // -$500.00
          currency: 'USD',
          accountId: 'test-checking',
          paymentMethodId: 'debit',
        },
      ];

      const statements: CardStatement[] = [];
      const movements = buildCashMovements(txs, statements, settings);
      const ledgers = buildLedgers(movements, settings);

      const checkingLedger = getAccountLedger(ledgers, 'test-checking', 'USD');
      expect(checkingLedger).toBeDefined();

      // Points progression:
      // 2026-01-01: 100000 (opening)
      // 2026-01-05: 300000 (+200000)
      // 2026-01-10: 250000 (-50000)
      expect(balanceAt(checkingLedger!, parseLocalDate('2025-12-31'))).toBe(0);
      expect(balanceAt(checkingLedger!, parseLocalDate('2026-01-01'))).toBe(100000);
      expect(balanceAt(checkingLedger!, parseLocalDate('2026-01-07'))).toBe(300000);
      expect(balanceAt(checkingLedger!, parseLocalDate('2026-01-15'))).toBe(250000);
    });

    it('incorporates historical rollups when provided', () => {
      const historicalRollups = { 'test-checking:USD': 50000 };
      const movements = buildCashMovements([], [], settings, historicalRollups, parseLocalDate('2026-01-01'));
      const ledgers = buildLedgers(movements, settings);

      const checkingLedger = getAccountLedger(ledgers, 'test-checking', 'USD');
      expect(checkingLedger).toBeDefined();
      // Opening 100000 + Rollup 50000 = 150000
      expect(balanceAt(checkingLedger!, parseLocalDate('2026-01-02'))).toBe(150000);
    });

    it('excludes credit card purchases from cash movements (card bills handle payment at due date)', () => {
      const txs: Transaction[] = [
        {
          id: 'tx-cc-purchase',
          date: parseLocalDate('2026-01-10'),
          description: 'Online purchase',
          typeId: 'shopping',
          direction: 'expense',
          value: 12000,
          currency: 'USD',
          accountId: 'test-credit-card',
          paymentMethodId: 'credit-card',
        },
      ];

      const movements = buildCashMovements(txs, [], settings);
      const ccTxMovement = movements.find(m => m.transactionId === 'tx-cc-purchase');
      expect(ccTxMovement).toBeUndefined();
    });
  });

  describe('resolveHorizonEnd', () => {
    it('resolves 30d, 90d, and end-of-month horizons', () => {
      const today = parseLocalDate('2026-02-10');

      expect(toLocalDateString(resolveHorizonEnd('30d', today))).toBe('2026-03-12');
      expect(toLocalDateString(resolveHorizonEnd('90d', today))).toBe('2026-05-11');
      // End of February 2026 (non-leap) is 2026-02-28
      expect(toLocalDateString(resolveHorizonEnd('end-of-month', today))).toBe('2026-02-28');
    });
  });

  describe('buildDailySeries & getAccountForecast', () => {
    it('generates a day-by-day continuous balance forecast series', () => {
      const txs: Transaction[] = [
        {
          id: 'tx-future-expense',
          date: parseLocalDate('2026-03-20'),
          description: 'Car Service',
          typeId: 'auto',
          direction: 'expense',
          value: 20000, // -$200.00
          currency: 'USD',
          accountId: 'test-checking',
          paymentMethodId: 'debit',
        },
      ];

      const movements = buildCashMovements(txs, [], settings);
      const ledgers = buildLedgers(movements, settings);
      const checkingLedger = getAccountLedger(ledgers, 'test-checking', 'USD')!;

      const today = parseLocalDate('2026-03-18');
      const fromDate = parseLocalDate('2026-03-18');
      const toDate = parseLocalDate('2026-03-22');
      const series = buildDailySeries(checkingLedger, fromDate, toDate, today);

      expect(series).toHaveLength(5);
      // Balance on today (03-18): both actual and projected set
      expect(series[0].actual).toBe(100000);
      expect(series[0].projected).toBe(100000);
      // Tomorrow (03-19): projected is 100000
      expect(series[1].projected).toBe(100000);
      // Expense date (03-20): projected drops to 80000
      expect(series[2].projected).toBe(80000);
      expect(series[3].projected).toBe(80000);
      expect(series[4].projected).toBe(80000);

      // Test getAccountForecast summary
      const horizonEnd = resolveHorizonEnd('30d', today);
      const forecast = getAccountForecast(checkingLedger, today, horizonEnd);
      expect(forecast.current).toBe(100000);
      expect(forecast.upcomingOut).toBe(-20000);
      expect(forecast.projected).toBe(80000);
    });
  });
});
