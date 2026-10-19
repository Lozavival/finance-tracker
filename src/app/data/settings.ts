import { type IconKey } from './icons';
import { parseLocalDate } from './dates';

export type Direction = 'income' | 'expense';

export type ColorToken =
  'cyan' | 'blue' | 'violet' | 'pink' | 'amber' | 'emerald' | 'teal' | 'indigo' | 'rose' | 'orange' | 'lime' | 'slate';

export type ColorInfo = {
  id: ColorToken;
  label: string;
  rawHex: string;
  dotColor: string;
  badgeBg: string;
  badgeBorder: string;
  textColor: string;
};

export const COLOR_CONFIG: Record<ColorToken, ColorInfo> = {
  cyan: {
    id: 'cyan',
    label: 'Cyan',
    rawHex: 'var(--accent-cyan-raw)',
    dotColor: 'var(--accent-cyan-dot)',
    badgeBg: 'var(--accent-cyan-badge-bg)',
    badgeBorder: 'var(--accent-cyan-badge-border)',
    textColor: 'var(--badge-text-cyan)',
  },
  blue: {
    id: 'blue',
    label: 'Blue',
    rawHex: 'var(--accent-blue-raw)',
    dotColor: 'var(--accent-blue-dot)',
    badgeBg: 'var(--accent-blue-badge-bg)',
    badgeBorder: 'var(--accent-blue-badge-border)',
    textColor: 'var(--badge-text-blue)',
  },
  violet: {
    id: 'violet',
    label: 'Violet',
    rawHex: 'var(--accent-violet-raw)',
    dotColor: 'var(--accent-violet-dot)',
    badgeBg: 'var(--accent-violet-badge-bg)',
    badgeBorder: 'var(--accent-violet-badge-border)',
    textColor: 'var(--badge-text-violet)',
  },
  pink: {
    id: 'pink',
    label: 'Pink',
    rawHex: 'var(--accent-pink-raw)',
    dotColor: 'var(--accent-pink-dot)',
    badgeBg: 'var(--accent-pink-badge-bg)',
    badgeBorder: 'var(--accent-pink-badge-border)',
    textColor: 'var(--badge-text-pink)',
  },
  amber: {
    id: 'amber',
    label: 'Amber',
    rawHex: 'var(--accent-amber-raw)',
    dotColor: 'var(--accent-amber-dot)',
    badgeBg: 'var(--accent-amber-badge-bg)',
    badgeBorder: 'var(--badge-border-amber)',
    textColor: 'var(--badge-text-amber)',
  },
  emerald: {
    id: 'emerald',
    label: 'Emerald',
    rawHex: 'var(--accent-emerald-raw)',
    dotColor: 'var(--accent-emerald-dot)',
    badgeBg: 'var(--accent-emerald-badge-bg)',
    badgeBorder: 'var(--accent-emerald-badge-border)',
    textColor: 'var(--badge-text-emerald)',
  },
  teal: {
    id: 'teal',
    label: 'Teal',
    rawHex: 'var(--accent-teal-raw)',
    dotColor: 'var(--accent-teal-dot)',
    badgeBg: 'var(--accent-teal-badge-bg)',
    badgeBorder: 'var(--accent-teal-badge-border)',
    textColor: 'var(--badge-text-teal)',
  },
  indigo: {
    id: 'indigo',
    label: 'Indigo',
    rawHex: 'var(--accent-indigo-raw)',
    dotColor: 'var(--accent-indigo-dot)',
    badgeBg: 'var(--accent-indigo-badge-bg)',
    badgeBorder: 'var(--accent-indigo-badge-border)',
    textColor: 'var(--badge-text-indigo)',
  },
  rose: {
    id: 'rose',
    label: 'Rose',
    rawHex: 'var(--accent-rose-raw)',
    dotColor: 'var(--accent-rose-dot)',
    badgeBg: 'var(--accent-rose-badge-bg)',
    badgeBorder: 'var(--accent-rose-badge-border)',
    textColor: 'var(--badge-text-rose)',
  },
  orange: {
    id: 'orange',
    label: 'Orange',
    rawHex: 'var(--accent-orange-raw)',
    dotColor: 'var(--accent-orange-dot)',
    badgeBg: 'var(--accent-orange-badge-bg)',
    badgeBorder: 'var(--accent-orange-badge-border)',
    textColor: 'var(--badge-text-orange)',
  },
  lime: {
    id: 'lime',
    label: 'Lime',
    rawHex: 'var(--accent-lime-raw)',
    dotColor: 'var(--accent-lime-dot)',
    badgeBg: 'var(--accent-lime-badge-bg)',
    badgeBorder: 'var(--accent-lime-badge-border)',
    textColor: 'var(--badge-text-lime)',
  },
  slate: {
    id: 'slate',
    label: 'Slate',
    rawHex: 'var(--accent-slate-raw)',
    dotColor: 'var(--accent-slate-dot)',
    badgeBg: 'var(--accent-slate-badge-bg)',
    badgeBorder: 'var(--accent-slate-badge-border)',
    textColor: 'var(--badge-text-slate)',
  },
};

export const COLOR_OPTIONS = Object.values(COLOR_CONFIG);

export function colorVar(colorToken: ColorToken): string {
  return COLOR_CONFIG[colorToken]?.dotColor ?? 'var(--accent-slate-dot)';
}

export type TransactionTypeConfig = {
  id: string;
  name: string;
  direction: Direction;
  color: ColorToken;
  icon: IconKey;
  system?: 'transfer';
};

export type PaymentMethodConfig = {
  id: string;
  name: string;
  icon: IconKey;
  behavior: 'standard' | 'credit-card';
};

import { type SupportedCurrency } from '@/i18n/types';
import { type ExchangeRateState, INITIAL_EXCHANGE_RATE_STATE } from './currency';

export type CreditCardConfig = {
  name: string;
  closingDay: number;
  dueDay: number;
  limit: number; // cents
};

export type AccountKind = 'Checking' | 'Savings' | 'Cash';

export type AccountConfig = {
  id: string;
  name: string;
  kind: AccountKind;
  currencies: SupportedCurrency[];
  openingBalances?: Partial<Record<SupportedCurrency, number>>; // cents per pocket
  openingDate: Date;
  initials: string;
  color: ColorToken;
  card?: CreditCardConfig;
  allowedPaymentMethods?: string[];
  archived?: boolean;
};

export function getAccountCurrencies(account?: AccountConfig): SupportedCurrency[] {
  if (!account) return ['USD'];
  if (account.currencies && account.currencies.length > 0) {
    return account.currencies;
  }
  return ['USD'];
}

export function getAccountOpeningBalance(account: AccountConfig, currency: SupportedCurrency): number {
  return account.openingBalances?.[currency] ?? 0;
}

import { type GoalsConfig, DEFAULT_GOALS_CONFIG } from './goals';

export type Settings = {
  transactionTypes: TransactionTypeConfig[];
  paymentMethods: PaymentMethodConfig[];
  accounts: AccountConfig[];
  goals: GoalsConfig;
  exchangeRate: ExchangeRateState;
};

export const TRANSFER_TYPE_ID = 'transfer';
export const CREDIT_CARD_METHOD_ID = 'credit-card';

export const DEFAULT_SETTINGS: Settings = {
  transactionTypes: [
    {
      id: 'income',
      name: 'Income',
      direction: 'income',
      color: 'emerald',
      icon: 'Banknote',
    },
    {
      id: 'refund',
      name: 'Refund',
      direction: 'income',
      color: 'teal',
      icon: 'Receipt',
    },
    {
      id: 'shopping',
      name: 'Shopping',
      direction: 'expense',
      color: 'cyan',
      icon: 'ShoppingBag',
    },
    {
      id: 'food-dining',
      name: 'Food & Dining',
      direction: 'expense',
      color: 'blue',
      icon: 'Utensils',
    },
    {
      id: 'transportation',
      name: 'Transportation',
      direction: 'expense',
      color: 'violet',
      icon: 'Car',
    },
    {
      id: 'entertainment',
      name: 'Entertainment',
      direction: 'expense',
      color: 'pink',
      icon: 'Film',
    },
    {
      id: 'bills',
      name: 'Bills',
      direction: 'expense',
      color: 'amber',
      icon: 'Receipt',
    },
    {
      id: TRANSFER_TYPE_ID,
      name: 'Transfer',
      direction: 'expense',
      color: 'indigo',
      icon: 'ArrowLeftRight',
      system: 'transfer',
    },
  ],
  paymentMethods: [
    {
      id: CREDIT_CARD_METHOD_ID,
      name: 'Credit card',
      icon: 'CreditCard',
      behavior: 'credit-card',
    },
    {
      id: 'debit-card',
      name: 'Debit card',
      icon: 'CreditCard',
      behavior: 'standard',
    },
    {
      id: 'cash',
      name: 'Cash',
      icon: 'Banknote',
      behavior: 'standard',
    },
    {
      id: 'pix',
      name: 'PIX',
      icon: 'QrCode',
      behavior: 'standard',
    },
    {
      id: 'bank-transfer',
      name: 'Bank transfer',
      icon: 'Landmark',
      behavior: 'standard',
    },
  ],
  accounts: [
    {
      id: 'boa',
      name: 'Bank of America',
      kind: 'Checking',
      currencies: ['USD'],
      openingBalances: { USD: 320000 }, // $3,200.00
      openingDate: parseLocalDate('2025-01-01'),
      initials: 'BA',
      color: 'blue',
      allowedPaymentMethods: ['credit-card', 'debit-card', 'pix', 'bank-transfer'],
      card: {
        name: 'BoA Visa',
        closingDay: 25,
        dueDay: 5,
        limit: 800000, // $8000
      },
    },
    {
      id: 'nubank',
      name: 'Nubank',
      kind: 'Checking',
      currencies: ['BRL'],
      openingBalances: { BRL: 450000 }, // R$ 4,500.00
      openingDate: parseLocalDate('2025-01-01'),
      initials: 'NU',
      color: 'violet',
      allowedPaymentMethods: ['pix', 'debit-card', 'bank-transfer'],
    },
    {
      id: 'wise',
      name: 'Wise',
      kind: 'Checking',
      currencies: ['BRL', 'USD'],
      openingBalances: { BRL: 250000, USD: 80000 }, // R$ 2,500.00 & $800.00
      openingDate: parseLocalDate('2025-01-01'),
      initials: 'WS',
      color: 'emerald',
      allowedPaymentMethods: ['pix', 'debit-card', 'bank-transfer'],
    },
    {
      id: 'citi',
      name: 'Citigroup',
      kind: 'Checking',
      currencies: ['USD'],
      openingBalances: { USD: 120000 }, // $1,200.00
      openingDate: parseLocalDate('2025-01-01'),
      initials: 'CI',
      color: 'cyan',
      allowedPaymentMethods: ['credit-card', 'debit-card', 'pix', 'bank-transfer'],
      card: {
        name: 'Citi Mastercard',
        closingDay: 1,
        dueDay: 10,
        limit: 300000, // $3000
      },
    },
    {
      id: 'cash-wallet',
      name: 'Cash / Wallet',
      kind: 'Cash',
      currencies: ['BRL'],
      openingBalances: { BRL: 20000 }, // R$ 200.00
      openingDate: parseLocalDate('2025-01-01'),
      initials: 'CW',
      color: 'teal',
      allowedPaymentMethods: ['cash'],
    },
  ],
  goals: DEFAULT_GOALS_CONFIG,
  exchangeRate: INITIAL_EXCHANGE_RATE_STATE,
};

export const PRODUCTION_DEFAULT_SETTINGS: Settings = {
  ...DEFAULT_SETTINGS,
  accounts: [
    {
      id: 'cash-wallet',
      name: 'Cash / Wallet',
      kind: 'Cash',
      currencies: ['BRL', 'USD'],
      openingBalances: { BRL: 0, USD: 0 },
      openingDate: parseLocalDate('2025-01-01'),
      initials: 'CW',
      color: 'teal',
      allowedPaymentMethods: ['cash'],
    },
  ],
};

export function findType(settings: Settings, id: string): TransactionTypeConfig | undefined {
  return settings.transactionTypes.find(t => t.id === id);
}

export function findMethod(settings: Settings, id?: string): PaymentMethodConfig | undefined {
  if (!id) return undefined;
  return settings.paymentMethods.find(m => m.id === id);
}

export function findAccount(settings: Settings, id: string): AccountConfig | undefined {
  return settings.accounts.find(a => a.id === id);
}

export function isCreditCard(settings: Settings, methodId?: string): boolean {
  if (!methodId) return false;
  const method = findMethod(settings, methodId);
  return method?.behavior === 'credit-card';
}

export function getAllowedPaymentMethodIds(account: AccountConfig | undefined, settings: Settings): string[] {
  if (!account) return settings.paymentMethods.map(m => m.id);
  // Dedicated physical cash account: strictly 'cash' only
  if (account.kind === 'Cash') {
    return ['cash'];
  }
  // Bank accounts (Checking, Savings): strictly non-cash methods only
  if (account.allowedPaymentMethods && account.allowedPaymentMethods.length > 0) {
    return account.allowedPaymentMethods.filter(id => id !== 'cash');
  }
  if (account.kind === 'Savings') {
    return ['bank-transfer'];
  }
  return settings.paymentMethods
    .filter(m => {
      if (m.id === 'cash') return false;
      if (m.behavior === 'credit-card') return Boolean(account.card);
      return true;
    })
    .map(m => m.id);
}

export function getAccountColor(colorToken: ColorToken): string {
  return COLOR_CONFIG[colorToken]?.rawHex ?? 'var(--accent-blue-raw)';
}
