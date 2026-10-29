import { type SupportedCurrency } from '@/i18n/types';
import { logger } from '../lib/logger';

const currencyLogger = logger.child('Currency');

export type ExchangeRateState = {
  rate: number | null; // USD to BRL rate (e.g. 5.65). null if not set
  lastUpdated: string | null;
  source: 'api' | 'manual' | 'none';
  isLoading?: boolean;
  error?: string | null;
};

export const INITIAL_EXCHANGE_RATE_STATE: ExchangeRateState = {
  rate: null,
  lastUpdated: null,
  source: 'none',
  isLoading: false,
  error: null,
};

export function centsToDollars(cents: number): number {
  return cents / 100;
}

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function formatCents(cents: number, currency: SupportedCurrency = 'USD', locale = 'en-US'): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(cents / 100);
  } catch {
    const symbol = currency === 'BRL' ? 'R$' : '$';
    return `${symbol}${(cents / 100).toFixed(2)}`;
  }
}

export function convertAmount(
  amount: number,
  from: SupportedCurrency,
  to: SupportedCurrency,
  rate: number | null,
): number | null {
  if (from === to) return amount;
  if (rate === null || rate <= 0 || !Number.isFinite(rate)) return null;

  // Conversion between USD and BRL
  if (from === 'USD' && to === 'BRL') {
    return amount * rate;
  }
  if (from === 'BRL' && to === 'USD') {
    return amount / rate;
  }
  return null;
}

export function convertCents(
  cents: number,
  from: SupportedCurrency,
  to: SupportedCurrency,
  rate: number | null,
): number | null {
  const converted = convertAmount(cents, from, to, rate);
  return converted !== null ? Math.round(converted) : null;
}

export type ExchangeRateErrorCode = 'OFFLINE' | 'TIMEOUT' | 'HTTP_ERROR' | 'INVALID_RATE' | 'UNKNOWN';

export class ExchangeRateFetchError extends Error {
  readonly code: ExchangeRateErrorCode;

  constructor(code: ExchangeRateErrorCode, message: string) {
    super(message);
    this.name = 'ExchangeRateFetchError';
    this.code = code;
  }
}

export async function fetchLiveExchangeRate(options?: {
  timeoutMs?: number;
  signal?: AbortSignal;
}): Promise<{ rate: number; timestamp: string }> {
  const timeoutMs = options?.timeoutMs ?? 5000;

  // Immediate offline check for browsers with navigator.onLine
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new ExchangeRateFetchError('OFFLINE', 'Connection offline');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new ExchangeRateFetchError('TIMEOUT', 'Request timed out'));
  }, timeoutMs);

  if (options?.signal) {
    options.signal.addEventListener('abort', () => {
      controller.abort(options.signal?.reason);
    });
  }

  currencyLogger.debug('Fetching live USD/BRL exchange rate...');

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new ExchangeRateFetchError('HTTP_ERROR', `Failed to fetch exchange rate (${res.status})`);
    }
    const data = (await res.json()) as { rates?: Record<string, number> };
    const brlRate = data.rates?.BRL;
    if (typeof brlRate !== 'number' || brlRate <= 0) {
      throw new ExchangeRateFetchError('INVALID_RATE', 'Invalid BRL rate received');
    }
    const rateResult = {
      rate: Number(brlRate.toFixed(4)),
      timestamp: new Date().toISOString(),
    };
    currencyLogger.info('Live USD/BRL exchange rate received:', rateResult.rate);
    return rateResult;
  } catch (err) {
    currencyLogger.warn('Failed to fetch live USD/BRL exchange rate:', err);
    if (err instanceof ExchangeRateFetchError) {
      throw err;
    }

    if (controller.signal.aborted) {
      const reason = controller.signal.reason;
      if (reason instanceof ExchangeRateFetchError) {
        throw reason;
      }
      throw new ExchangeRateFetchError('TIMEOUT', 'Request timed out');
    }

    if (
      (typeof navigator !== 'undefined' && navigator.onLine === false) ||
      (err instanceof TypeError && /failed to fetch|networkerror|load failed/i.test(err.message))
    ) {
      throw new ExchangeRateFetchError('OFFLINE', 'Connection offline');
    }

    throw new ExchangeRateFetchError('UNKNOWN', err instanceof Error ? err.message : 'Unknown network error');
  } finally {
    clearTimeout(timer);
  }
}

export function getExchangeRateErrorCode(err: unknown): ExchangeRateErrorCode {
  if (err instanceof ExchangeRateFetchError) {
    return err.code;
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'OFFLINE';
  }
  if (err instanceof TypeError && /failed to fetch|networkerror|load failed/i.test(err.message)) {
    return 'OFFLINE';
  }
  return 'UNKNOWN';
}

export type ExchangeRateErrorKey =
  'settings.rateOfflineError' | 'settings.rateTimeoutError' | 'settings.rateFetchFailed';

export function getExchangeRateErrorDetails(err: unknown): {
  key: ExchangeRateErrorKey;
  params?: { error: string };
} {
  const code = getExchangeRateErrorCode(err);
  if (code === 'OFFLINE') {
    return { key: 'settings.rateOfflineError' };
  }
  if (code === 'TIMEOUT') {
    return { key: 'settings.rateTimeoutError' };
  }
  return {
    key: 'settings.rateFetchFailed',
    params: { error: err instanceof Error ? err.message : 'Unknown error' },
  };
}
