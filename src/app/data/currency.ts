import { type SupportedCurrency } from '@/i18n/types';

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

export async function fetchLiveExchangeRate(): Promise<{ rate: number; timestamp: string }> {
  const res = await fetch('https://open.er-api.com/v6/latest/USD');
  if (!res.ok) {
    throw new Error(`Failed to fetch exchange rate (${res.status})`);
  }
  const data = (await res.json()) as { rates?: Record<string, number> };
  const brlRate = data.rates?.BRL;
  if (typeof brlRate !== 'number' || brlRate <= 0) {
    throw new Error('Invalid BRL rate received');
  }
  return {
    rate: Number(brlRate.toFixed(4)),
    timestamp: new Date().toISOString(),
  };
}
