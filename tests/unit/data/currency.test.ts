import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  centsToDollars,
  dollarsToCents,
  formatCents,
  convertAmount,
  convertCents,
  fetchLiveExchangeRate,
  ExchangeRateFetchError,
  getExchangeRateErrorCode,
  getExchangeRateErrorDetails,
} from '@/data/currency';

describe('Currency & Exchange Rate Engine', () => {
  describe('cents and dollars conversions', () => {
    it('converts cents to dollars exactly', () => {
      expect(centsToDollars(100)).toBe(1);
      expect(centsToDollars(12345)).toBe(123.45);
      expect(centsToDollars(0)).toBe(0);
      expect(centsToDollars(-500)).toBe(-5);
    });

    it('converts dollars to cents rounding to nearest integer', () => {
      expect(dollarsToCents(1)).toBe(100);
      expect(dollarsToCents(123.45)).toBe(12345);
      expect(dollarsToCents(123.456)).toBe(12346);
      expect(dollarsToCents(0)).toBe(0);
    });

    it('formats cents according to currency and locale', () => {
      const formattedUsd = formatCents(123456, 'USD', 'en-US');
      expect(formattedUsd).toContain('1,234.56');

      const formattedBrl = formatCents(123456, 'BRL', 'pt-BR');
      expect(formattedBrl).toContain('1.234,56');
    });
  });

  describe('currency conversion', () => {
    it('returns the same amount when from and to currencies match', () => {
      expect(convertAmount(500, 'USD', 'USD', 5.5)).toBe(500);
      expect(convertAmount(500, 'BRL', 'BRL', 5.5)).toBe(500);
      expect(convertCents(500, 'USD', 'USD', null)).toBe(500);
    });

    it('returns null when rate is null, non-positive, or non-finite', () => {
      expect(convertAmount(500, 'USD', 'BRL', null)).toBeNull();
      expect(convertAmount(500, 'USD', 'BRL', 0)).toBeNull();
      expect(convertAmount(500, 'USD', 'BRL', -1.5)).toBeNull();
      expect(convertAmount(500, 'USD', 'BRL', Infinity)).toBeNull();
      expect(convertCents(500, 'USD', 'BRL', null)).toBeNull();
    });

    it('converts USD to BRL correctly', () => {
      // 100 USD at 5.50 = 550 BRL
      expect(convertAmount(100, 'USD', 'BRL', 5.5)).toBe(550);
      expect(convertCents(10000, 'USD', 'BRL', 5.5)).toBe(55000);
    });

    it('converts BRL to USD correctly with integer rounding in convertCents', () => {
      // 550 BRL at 5.50 = 100 USD
      expect(convertAmount(550, 'BRL', 'USD', 5.5)).toBe(100);
      expect(convertCents(55000, 'BRL', 'USD', 5.5)).toBe(10000);
      // 1000 cents BRL / 5.50 = 181.818... -> rounds to 182 cents
      expect(convertCents(1000, 'BRL', 'USD', 5.5)).toBe(182);
    });
  });

  describe('fetchLiveExchangeRate', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('successfully fetches and returns parsed rate and ISO timestamp', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ rates: { BRL: 5.67891 } }),
      } as unknown as Response);

      const result = await fetchLiveExchangeRate({ timeoutMs: 1000 });
      expect(result.rate).toBe(5.6789);
      expect(new Date(result.timestamp).getTime()).not.toBeNaN();
    });

    it('throws HTTP_ERROR when response is not ok', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      } as unknown as Response);

      await expect(fetchLiveExchangeRate({ timeoutMs: 1000 })).rejects.toThrow(ExchangeRateFetchError);
      try {
        await fetchLiveExchangeRate({ timeoutMs: 1000 });
      } catch (err) {
        expect(err).toBeInstanceOf(ExchangeRateFetchError);
        expect((err as ExchangeRateFetchError).code).toBe('HTTP_ERROR');
      }
    });

    it('throws INVALID_RATE when BRL rate is missing or invalid', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ rates: { EUR: 0.95 } }), // Missing BRL
      } as unknown as Response);

      try {
        await fetchLiveExchangeRate({ timeoutMs: 1000 });
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ExchangeRateFetchError);
        expect((err as ExchangeRateFetchError).code).toBe('INVALID_RATE');
      }
    });

    it('throws TIMEOUT when fetch is delayed past timeoutMs', async () => {
      globalThis.fetch = vi.fn().mockImplementation((_url, { signal }) => {
        return new Promise((_, reject) => {
          signal?.addEventListener('abort', () => {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        });
      });

      try {
        await fetchLiveExchangeRate({ timeoutMs: 20 });
        expect.unreachable('Should have timed out');
      } catch (err) {
        expect(err).toBeInstanceOf(ExchangeRateFetchError);
        expect((err as ExchangeRateFetchError).code).toBe('TIMEOUT');
      }
    });
  });

  describe('exchange rate error helpers', () => {
    it('resolves error codes and localized error detail keys', () => {
      const offlineErr = new ExchangeRateFetchError('OFFLINE', 'Offline');
      expect(getExchangeRateErrorCode(offlineErr)).toBe('OFFLINE');
      expect(getExchangeRateErrorDetails(offlineErr)).toEqual({
        key: 'settings.rateOfflineError',
      });

      const timeoutErr = new ExchangeRateFetchError('TIMEOUT', 'Timeout');
      expect(getExchangeRateErrorCode(timeoutErr)).toBe('TIMEOUT');
      expect(getExchangeRateErrorDetails(timeoutErr)).toEqual({
        key: 'settings.rateTimeoutError',
      });

      const genericErr = new Error('Boom');
      expect(getExchangeRateErrorCode(genericErr)).toBe('UNKNOWN');
      expect(getExchangeRateErrorDetails(genericErr)).toEqual({
        key: 'settings.rateFetchFailed',
        params: { error: 'Boom' },
      });
    });
  });
});

