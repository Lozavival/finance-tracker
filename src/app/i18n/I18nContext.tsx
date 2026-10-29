import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { Locale } from 'date-fns';
import {
  type SupportedLocale,
  type SupportedCurrency,
  type TranslationParams,
  type NestedKeyOf,
  SUPPORTED_LOCALES,
  SUPPORTED_CURRENCIES,
  DATE_LOCALES,
  DEFAULT_LOCALE,
  DEFAULT_CURRENCY,
} from './types';
import { dictionaries, en, type Translations } from './locales';
import { logger } from '@/lib/logger';

const i18nLogger = logger.child('I18n');

export type TranslationKey = NestedKeyOf<Translations>;

export interface I18nContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  currency: SupportedCurrency;
  setCurrency: (currency: SupportedCurrency) => void;
  supportedLocales: typeof SUPPORTED_LOCALES;
  supportedCurrencies: typeof SUPPORTED_CURRENCIES;
  dateLocale: Locale;
  t: (key: TranslationKey, params?: TranslationParams) => string;
  formatCurrency: (amount: number, overrideCurrency?: SupportedCurrency) => string;
  formatCents: (cents: number, overrideCurrency?: SupportedCurrency) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
  formatShort: (date: Date) => string;
  formatRowDate: (date: Date) => string;
  formatMonthYear: (date: Date) => string;
  formatFull: (date: Date) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_LOCALE_KEY = 'finance-tracker_locale';
const STORAGE_CURRENCY_KEY = 'finance-tracker_currency';

function getStoredLocale(): SupportedLocale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  try {
    const stored = localStorage.getItem(STORAGE_LOCALE_KEY);
    if (stored && SUPPORTED_LOCALES.some(l => l.code === stored)) {
      return stored as SupportedLocale;
    }
  } catch (err) {
    i18nLogger.warn('Failed to read locale from storage:', err);
  }
  return DEFAULT_LOCALE;
}

function getStoredCurrency(): SupportedCurrency {
  if (typeof window === 'undefined') return DEFAULT_CURRENCY;
  try {
    const stored = localStorage.getItem(STORAGE_CURRENCY_KEY);
    if (stored && SUPPORTED_CURRENCIES.some(c => c.code === stored)) {
      return stored as SupportedCurrency;
    }
  } catch (err) {
    i18nLogger.warn('Failed to read currency from storage:', err);
  }
  return DEFAULT_CURRENCY;
}

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof current === 'string' ? current : undefined;
}

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return key in params ? String(params[key]) : match;
  });
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(getStoredLocale);
  const [currency, setCurrencyState] = useState<SupportedCurrency>(getStoredCurrency);

  const setLocale = useCallback((newLocale: SupportedLocale) => {
    i18nLogger.info('Switched active locale:', newLocale);
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_LOCALE_KEY, newLocale);
      } catch (err) {
        i18nLogger.warn('Failed to write locale preference to localStorage:', err);
      }
      document.documentElement.lang = newLocale;
    }
  }, []);

  const setCurrency = useCallback((newCurrency: SupportedCurrency) => {
    i18nLogger.info('Switched preferred currency:', newCurrency);
    setCurrencyState(newCurrency);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_CURRENCY_KEY, newCurrency);
      } catch (err) {
        i18nLogger.warn('Failed to write currency preference to localStorage:', err);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const dictionary = useMemo(() => {
    return dictionaries[locale] || dictionaries[DEFAULT_LOCALE] || en;
  }, [locale]);

  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams): string => {
      const template =
        getNestedValue(dictionary as unknown as Record<string, unknown>, key) ??
        getNestedValue(en as unknown as Record<string, unknown>, key) ??
        key;
      return interpolate(template, params);
    },
    [dictionary],
  );

  const formatCurrency = useCallback(
    (amount: number, overrideCurrency?: SupportedCurrency): string => {
      const activeCurr = overrideCurrency || currency;
      try {
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: activeCurr,
        }).format(amount);
      } catch (err) {
        i18nLogger.warn('Intl.NumberFormat currency failed, using fallback:', err);
        return `$${amount.toFixed(2)}`;
      }
    },
    [locale, currency],
  );

  const formatCents = useCallback(
    (cents: number, overrideCurrency?: SupportedCurrency): string => {
      return formatCurrency(cents / 100, overrideCurrency);
    },
    [formatCurrency],
  );

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions): string => {
      try {
        return new Intl.NumberFormat(locale, options).format(value);
      } catch (err) {
        i18nLogger.warn('Intl.NumberFormat number failed, using fallback:', err);
        return String(value);
      }
    },
    [locale],
  );

  const formatDate = useCallback(
    (date: Date, options?: Intl.DateTimeFormatOptions): string => {
      try {
        return new Intl.DateTimeFormat(locale, options).format(date);
      } catch (err) {
        i18nLogger.warn('Intl.DateTimeFormat date failed, using fallback:', err);
        return date.toLocaleDateString();
      }
    },
    [locale],
  );

  const formatShort = useCallback(
    (date: Date): string => {
      return formatDate(date, { month: 'short', day: 'numeric' });
    },
    [formatDate],
  );

  const formatRowDate = useCallback(
    (date: Date): string => {
      return formatDate(date, { weekday: 'short', month: 'short', day: 'numeric' });
    },
    [formatDate],
  );

  const formatMonthYear = useCallback(
    (date: Date): string => {
      return formatDate(date, { month: 'long', year: 'numeric' });
    },
    [formatDate],
  );

  const formatFull = useCallback(
    (date: Date): string => {
      return formatDate(date, { month: 'short', day: 'numeric', year: 'numeric' });
    },
    [formatDate],
  );

  const contextValue = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      currency,
      setCurrency,
      supportedLocales: SUPPORTED_LOCALES,
      supportedCurrencies: SUPPORTED_CURRENCIES,
      dateLocale: DATE_LOCALES[locale] ?? DATE_LOCALES[DEFAULT_LOCALE],
      t,
      formatCurrency,
      formatCents,
      formatNumber,
      formatDate,
      formatShort,
      formatRowDate,
      formatMonthYear,
      formatFull,
    }),
    [
      locale,
      setLocale,
      currency,
      setCurrency,
      t,
      formatCurrency,
      formatCents,
      formatNumber,
      formatDate,
      formatShort,
      formatRowDate,
      formatMonthYear,
      formatFull,
    ],
  );

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
