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
    rawHex: 'var(--color-cyan-raw)',
    dotColor: 'var(--color-cyan-dot)',
    badgeBg: 'var(--color-cyan-badge-bg)',
    badgeBorder: 'var(--color-cyan-badge-border)',
    textColor: 'var(--badge-text-cyan)',
  },
  blue: {
    id: 'blue',
    label: 'Blue',
    rawHex: 'var(--color-blue-raw)',
    dotColor: 'var(--color-blue-dot)',
    badgeBg: 'var(--color-blue-badge-bg)',
    badgeBorder: 'var(--color-blue-badge-border)',
    textColor: 'var(--badge-text-blue)',
  },
  violet: {
    id: 'violet',
    label: 'Violet',
    rawHex: 'var(--color-violet-raw)',
    dotColor: 'var(--color-violet-dot)',
    badgeBg: 'var(--color-violet-badge-bg)',
    badgeBorder: 'var(--color-violet-badge-border)',
    textColor: 'var(--badge-text-violet)',
  },
  pink: {
    id: 'pink',
    label: 'Pink',
    rawHex: 'var(--color-pink-raw)',
    dotColor: 'var(--color-pink-dot)',
    badgeBg: 'var(--color-pink-badge-bg)',
    badgeBorder: 'var(--color-pink-badge-border)',
    textColor: 'var(--badge-text-pink)',
  },
  amber: {
    id: 'amber',
    label: 'Amber',
    rawHex: 'var(--color-amber-raw)',
    dotColor: 'var(--color-amber-dot)',
    badgeBg: 'var(--color-amber-badge-bg)',
    badgeBorder: 'var(--badge-border-amber)',
    textColor: 'var(--badge-text-amber)',
  },
  emerald: {
    id: 'emerald',
    label: 'Emerald',
    rawHex: 'var(--color-emerald-raw)',
    dotColor: 'var(--color-emerald-dot)',
    badgeBg: 'var(--color-emerald-badge-bg)',
    badgeBorder: 'var(--color-emerald-badge-border)',
    textColor: 'var(--badge-text-emerald)',
  },
  teal: {
    id: 'teal',
    label: 'Teal',
    rawHex: 'var(--color-teal-raw)',
    dotColor: 'var(--color-teal-dot)',
    badgeBg: 'var(--color-teal-badge-bg)',
    badgeBorder: 'var(--color-teal-badge-border)',
    textColor: 'var(--badge-text-teal)',
  },
  indigo: {
    id: 'indigo',
    label: 'Indigo',
    rawHex: 'var(--color-indigo-raw)',
    dotColor: 'var(--color-indigo-dot)',
    badgeBg: 'var(--color-indigo-badge-bg)',
    badgeBorder: 'var(--color-indigo-badge-border)',
    textColor: 'var(--badge-text-indigo)',
  },
  rose: {
    id: 'rose',
    label: 'Rose',
    rawHex: 'var(--color-rose-raw)',
    dotColor: 'var(--color-rose-dot)',
    badgeBg: 'var(--color-rose-badge-bg)',
    badgeBorder: 'var(--color-rose-badge-border)',
    textColor: 'var(--badge-text-rose)',
  },
  orange: {
    id: 'orange',
    label: 'Orange',
    rawHex: 'var(--color-orange-raw)',
    dotColor: 'var(--color-orange-dot)',
    badgeBg: 'var(--color-orange-badge-bg)',
    badgeBorder: 'var(--color-orange-badge-border)',
    textColor: 'var(--badge-text-orange)',
  },
  lime: {
    id: 'lime',
    label: 'Lime',
    rawHex: 'var(--color-lime-raw)',
    dotColor: 'var(--color-lime-dot)',
    badgeBg: 'var(--color-lime-badge-bg)',
    badgeBorder: 'var(--color-lime-badge-border)',
    textColor: 'var(--badge-text-lime)',
  },
  slate: {
    id: 'slate',
    label: 'Slate',
    rawHex: 'var(--color-slate-raw)',
    dotColor: 'var(--color-slate-dot)',
    badgeBg: 'var(--color-slate-badge-bg)',
    badgeBorder: 'var(--color-slate-badge-border)',
    textColor: 'var(--badge-text-slate)',
  },
};

export const COLOR_OPTIONS = Object.values(COLOR_CONFIG);

export function colorVar(colorToken: ColorToken): string {
  return COLOR_CONFIG[colorToken]?.dotColor ?? 'var(--color-slate-dot)';
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
  openingBalance: number; // cents
  openingDate: Date;
  initials: string;
  color: ColorToken;
  card?: CreditCardConfig;
  allowedPaymentMethods?: string[];
};

export type Settings = {
  transactionTypes: TransactionTypeConfig[];
  paymentMethods: PaymentMethodConfig[];
  accounts: AccountConfig[];
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
      openingBalance: 320000, // $3200
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
      id: 'citi',
      name: 'Citigroup',
      kind: 'Checking',
      openingBalance: 120000, // $1200
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
      id: 'gs',
      name: 'Goldman Sachs',
      kind: 'Savings',
      openingBalance: 1800000, // $18000
      openingDate: parseLocalDate('2025-01-01'),
      initials: 'GS',
      color: 'slate',
      allowedPaymentMethods: ['bank-transfer'],
    },
    {
      id: 'cash-wallet',
      name: 'Cash / Wallet',
      kind: 'Cash',
      openingBalance: 15000, // $150.00
      openingDate: parseLocalDate('2025-01-01'),
      initials: 'CW',
      color: 'emerald',
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
  return COLOR_CONFIG[colorToken]?.rawHex ?? 'var(--color-blue-raw)';
}
