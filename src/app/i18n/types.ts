import type { Locale } from 'date-fns';
import { enUS, ptBR } from 'date-fns/locale';

export type SupportedLocale = 'en-US' | 'pt-BR';
export type SupportedCurrency = 'USD' | 'BRL';

export interface LocaleOption {
  code: SupportedLocale;
  label: string;
  nativeLabel: string;
  flag?: string;
}

export interface CurrencyOption {
  code: SupportedCurrency;
  symbol: string;
  label: string;
}

export const SUPPORTED_LOCALES: LocaleOption[] = [
  { code: 'en-US', label: 'English (US)', nativeLabel: 'English (US)', flag: '🇺🇸' },
  { code: 'pt-BR', label: 'Portuguese (Brazil)', nativeLabel: 'Português (Brasil)', flag: '🇧🇷' },
];

export const DATE_LOCALES: Record<SupportedLocale, Locale> = {
  'en-US': enUS,
  'pt-BR': ptBR,
};

export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'BRL', symbol: 'R$', label: 'BRL (R$)' },
];

export const DEFAULT_LOCALE: SupportedLocale = 'en-US';
export const DEFAULT_CURRENCY: SupportedCurrency = 'USD';

export type TranslationParams = Record<string, string | number>;

export type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & string]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & string];
