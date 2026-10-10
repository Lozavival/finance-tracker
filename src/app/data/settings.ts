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
    rawHex: '#06b6d4',
    dotColor: '#22d3ee',
    badgeBg: 'rgba(6, 182, 212, 0.15)',
    badgeBorder: 'rgba(34, 211, 238, 0.3)',
    textColor: '#22d3ee',
  },
  blue: {
    id: 'blue',
    label: 'Blue',
    rawHex: '#3b82f6',
    dotColor: '#60a5fa',
    badgeBg: 'rgba(59, 130, 246, 0.15)',
    badgeBorder: 'rgba(96, 165, 250, 0.3)',
    textColor: '#60a5fa',
  },
  violet: {
    id: 'violet',
    label: 'Violet',
    rawHex: '#8b5cf6',
    dotColor: '#a78bfa',
    badgeBg: 'rgba(139, 92, 246, 0.15)',
    badgeBorder: 'rgba(167, 139, 250, 0.3)',
    textColor: '#a78bfa',
  },
  pink: {
    id: 'pink',
    label: 'Pink',
    rawHex: '#ec4899',
    dotColor: '#f472b6',
    badgeBg: 'rgba(236, 72, 153, 0.15)',
    badgeBorder: 'rgba(244, 114, 182, 0.3)',
    textColor: '#f472b6',
  },
  amber: {
    id: 'amber',
    label: 'Amber',
    rawHex: '#f59e0b',
    dotColor: '#fbbf24',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    badgeBorder: 'rgba(251, 191, 36, 0.3)',
    textColor: '#fbbf24',
  },
  emerald: {
    id: 'emerald',
    label: 'Emerald',
    rawHex: '#10b981',
    dotColor: '#34d399',
    badgeBg: 'rgba(16, 185, 129, 0.15)',
    badgeBorder: 'rgba(52, 211, 153, 0.3)',
    textColor: '#34d399',
  },
  teal: {
    id: 'teal',
    label: 'Teal',
    rawHex: '#14b8a6',
    dotColor: '#2dd4bf',
    badgeBg: 'rgba(20, 184, 166, 0.15)',
    badgeBorder: 'rgba(45, 212, 191, 0.3)',
    textColor: '#2dd4bf',
  },
  indigo: {
    id: 'indigo',
    label: 'Indigo',
    rawHex: '#6366f1',
    dotColor: '#818cf8',
    badgeBg: 'rgba(99, 102, 241, 0.15)',
    badgeBorder: 'rgba(129, 140, 248, 0.3)',
    textColor: '#818cf8',
  },
  rose: {
    id: 'rose',
    label: 'Rose',
    rawHex: '#f43f5e',
    dotColor: '#fb7185',
    badgeBg: 'rgba(244, 63, 94, 0.15)',
    badgeBorder: 'rgba(251, 113, 133, 0.3)',
    textColor: '#fb7185',
  },
  orange: {
    id: 'orange',
    label: 'Orange',
    rawHex: '#f97316',
    dotColor: '#fb923c',
    badgeBg: 'rgba(249, 115, 22, 0.15)',
    badgeBorder: 'rgba(251, 146, 60, 0.3)',
    textColor: '#fb923c',
  },
  lime: {
    id: 'lime',
    label: 'Lime',
    rawHex: '#84cc16',
    dotColor: '#a3e635',
    badgeBg: 'rgba(132, 204, 22, 0.15)',
    badgeBorder: 'rgba(163, 230, 53, 0.3)',
    textColor: '#a3e635',
  },
  slate: {
    id: 'slate',
    label: 'Slate',
    rawHex: '#64748b',
    dotColor: '#94a3b8',
    badgeBg: 'rgba(100, 116, 139, 0.15)',
    badgeBorder: 'rgba(148, 163, 184, 0.3)',
    textColor: '#94a3b8',
  },
};

export const COLOR_OPTIONS = Object.values(COLOR_CONFIG);

export function colorVar(colorToken: ColorToken): string {
  return COLOR_CONFIG[colorToken]?.dotColor ?? '#94a3b8';
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

export type AccountKind = 'Checking' | 'Savings';

export type AccountConfig = {
  id: string;
  name: string;
  kind: AccountKind;
  openingBalance: number; // cents
  openingDate: Date;
  initials: string;
  color: ColorToken;
  card?: CreditCardConfig;
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

export function getAccountColor(colorToken: ColorToken): string {
  return COLOR_CONFIG[colorToken]?.rawHex ?? '#3b82f6';
}
