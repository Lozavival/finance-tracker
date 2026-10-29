import { describe, it, expect } from 'vitest';
import {
  COLOR_CONFIG,
  colorVar,
  getAccountColor,
  getAccountCurrencies,
  getAccountOpeningBalance,
  findType,
  findMethod,
  findAccount,
  isCreditCard,
  getAllowedPaymentMethodIds,
  type AccountConfig,
} from '@/data/settings';
import { createTestSettings } from '../../fixtures/test-workspace';
import { parseLocalDate } from '@/data/dates';

describe('Settings & Workspace Configuration Engine', () => {
  const settings = createTestSettings();

  describe('colors and CSS tokens', () => {
    it('provides CSS variable mappings for all color tokens without Tailwind palette leaks', () => {
      for (const [token, info] of Object.entries(COLOR_CONFIG)) {
        expect(info.id).toBe(token);
        expect(info.dotColor).toContain(`var(--accent-${token}-dot)`);
        expect(colorVar(token as keyof typeof COLOR_CONFIG)).toBe(info.dotColor);
        expect(getAccountColor(token as keyof typeof COLOR_CONFIG)).toBe(info.rawHex);
      }
    });

    it('falls back gracefully for unknown color token', () => {
      // @ts-expect-error testing invalid token fallback
      expect(colorVar('unknown')).toBe('var(--accent-slate-dot)');
      // @ts-expect-error testing invalid token fallback
      expect(getAccountColor('unknown')).toBe('var(--accent-blue-raw)');
    });
  });

  describe('account queries and helpers', () => {
    it('retrieves currencies and opening balances', () => {
      const multiCurrAcc: AccountConfig = {
        id: 'acc-multi',
        name: 'Multi Account',
        kind: 'Checking',
        currencies: ['USD', 'BRL'],
        openingBalances: { USD: 100000, BRL: 500000 },
        openingDate: parseLocalDate('2026-01-01'),
        initials: 'MA',
        color: 'cyan',
      };

      expect(getAccountCurrencies(multiCurrAcc)).toEqual(['USD', 'BRL']);
      expect(getAccountOpeningBalance(multiCurrAcc, 'USD')).toBe(100000);
      expect(getAccountOpeningBalance(multiCurrAcc, 'BRL')).toBe(500000);
      // Fallback if account is undefined
      expect(getAccountCurrencies(undefined)).toEqual(['USD']);
    });

    it('finds type, method, and account by id', () => {
      expect(findType(settings, 'transfer')?.id).toBe('transfer');
      expect(findType(settings, 'non-existent')).toBeUndefined();

      expect(findMethod(settings, 'credit-card')?.behavior).toBe('credit-card');
      expect(findMethod(settings, undefined)).toBeUndefined();

      expect(findAccount(settings, 'test-checking')?.kind).toBe('Checking');
      expect(findAccount(settings, 'missing')).toBeUndefined();
    });

    it('determines if a payment method is credit card', () => {
      expect(isCreditCard(settings, 'credit-card')).toBe(true);
      expect(isCreditCard(settings, 'debit')).toBe(false);
      expect(isCreditCard(settings, undefined)).toBe(false);
    });
  });

  describe('getAllowedPaymentMethodIds', () => {
    it('restricts Cash accounts strictly to cash only', () => {
      const cashAcc: AccountConfig = {
        id: 'cash-wallet',
        name: 'Wallet',
        kind: 'Cash',
        currencies: ['USD'],
        openingDate: parseLocalDate('2026-01-01'),
        initials: 'W',
        color: 'emerald',
      };

      const allowed = getAllowedPaymentMethodIds(cashAcc, settings);
      expect(allowed).toEqual(['cash']);
    });

    it('defaults Savings accounts without card to bank-transfer only', () => {
      const savingsAcc: AccountConfig = {
        id: 'savings-bank',
        name: 'Savings',
        kind: 'Savings',
        currencies: ['USD'],
        openingDate: parseLocalDate('2026-01-01'),
        initials: 'S',
        color: 'blue',
      };

      const allowed = getAllowedPaymentMethodIds(savingsAcc, settings);
      expect(allowed).toEqual(['bank-transfer']);
    });

    it('filters out cash from bank accounts and conditionally includes credit-card if account has card configured', () => {
      const checkingWithCard: AccountConfig = {
        id: 'chk-card',
        name: 'Checking With Card',
        kind: 'Checking',
        currencies: ['USD'],
        openingDate: parseLocalDate('2026-01-01'),
        initials: 'CC',
        color: 'cyan',
        card: {
          name: 'Debit/Credit Combo',
          closingDay: 15,
          dueDay: 25,
          limit: 500000,
        },
      };

      const allowed = getAllowedPaymentMethodIds(checkingWithCard, settings);
      expect(allowed).not.toContain('cash');
      expect(allowed).toContain('credit-card');

      const checkingNoCard: AccountConfig = {
        ...checkingWithCard,
        card: undefined,
      };

      const allowedNoCard = getAllowedPaymentMethodIds(checkingNoCard, settings);
      expect(allowedNoCard).not.toContain('cash');
      expect(allowedNoCard).not.toContain('credit-card');
    });
  });
});

