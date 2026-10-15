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
  getTranslatedTypeName: (typeId: string, fallbackName: string) => string;
  getTranslatedMethodName: (methodId: string, fallbackName: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_LOCALE_KEY = 'finance-tracker_locale';
const STORAGE_CURRENCY_KEY = 'finance-tracker_currency';

function getStoredLocale(): SupportedLocale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const stored = localStorage.getItem(STORAGE_LOCALE_KEY);
  if (stored && SUPPORTED_LOCALES.some(l => l.code === stored)) {
    return stored as SupportedLocale;
  }
  return DEFAULT_LOCALE;
}

function getStoredCurrency(): SupportedCurrency {
  if (typeof window === 'undefined') return DEFAULT_CURRENCY;
  const stored = localStorage.getItem(STORAGE_CURRENCY_KEY);
  if (stored && SUPPORTED_CURRENCIES.some(c => c.code === stored)) {
    return stored as SupportedCurrency;
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
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_LOCALE_KEY, newLocale);
      document.documentElement.lang = newLocale;
    }
  }, []);

  const setCurrency = useCallback((newCurrency: SupportedCurrency) => {
    setCurrencyState(newCurrency);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_CURRENCY_KEY, newCurrency);
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
      } catch {
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
      } catch {
        return String(value);
      }
    },
    [locale],
  );

  const formatDate = useCallback(
    (date: Date, options?: Intl.DateTimeFormatOptions): string => {
      try {
        return new Intl.DateTimeFormat(locale, options).format(date);
      } catch {
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

  const getTranslatedTypeName = useCallback(
    (typeId: string, fallbackName: string): string => {
      const keyMap: Record<string, TranslationKey> = {
        income: 'defaults.types.income',
        refund: 'defaults.types.refund',
        shopping: 'defaults.types.shopping',
        'food-dining': 'defaults.types.foodDining',
        transportation: 'defaults.types.transportation',
        entertainment: 'defaults.types.entertainment',
        bills: 'defaults.types.bills',
        transfer: 'defaults.types.transfer',
      };
      const key = keyMap[typeId];
      if (key) {
        return t(key);
      }
      return fallbackName;
    },
    [t],
  );

  const getTranslatedMethodName = useCallback(
    (methodId: string, fallbackName: string): string => {
      const keyMap: Record<string, TranslationKey> = {
        'credit-card': 'defaults.methods.creditCard',
        'debit-card': 'defaults.methods.debitCard',
        cash: 'defaults.methods.cash',
        pix: 'defaults.methods.pix',
        'bank-transfer': 'defaults.methods.bankTransfer',
      };
      const key = keyMap[methodId];
      if (key) {
        return t(key);
      }
      return fallbackName;
    },
    [t],
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
      getTranslatedTypeName,
      getTranslatedMethodName,
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
      getTranslatedTypeName,
      getTranslatedMethodName,
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
