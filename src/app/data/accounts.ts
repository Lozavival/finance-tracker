import { type Account } from './transactions';

export type AccountKind = 'Checking' | 'Savings';

export type CreditCardConfig = {
  name: string;
  closingDay: number;
  dueDay: number;
  limit: number;
};

export type AccountDetails = {
  name: Account;
  kind: AccountKind;
  openingBalance: number; // cents
  openingDate: string;
  initials: string;
  color: string;
  card?: CreditCardConfig;
};

export const ACCOUNT_DETAILS: Record<Account, AccountDetails> = {
  'Bank of America': {
    name: 'Bank of America',
    kind: 'Checking',
    openingBalance: 320000, // $3200
    openingDate: '2025-01-01',
    initials: 'BA',
    color: 'var(--color-blue-500)',
    card: {
      name: 'BoA Visa',
      closingDay: 25,
      dueDay: 5,
      limit: 800000, // $8000
    },
  },
  Citigroup: {
    name: 'Citigroup',
    kind: 'Checking',
    openingBalance: 120000, // $1200
    openingDate: '2025-01-01',
    initials: 'CI',
    color: 'var(--color-cyan-500)',
    card: {
      name: 'Citi Mastercard',
      closingDay: 1,
      dueDay: 10,
      limit: 300000, // $3000
    },
  },
  'Goldman Sachs': {
    name: 'Goldman Sachs',
    kind: 'Savings',
    openingBalance: 1800000, // $18000
    openingDate: '2025-01-01',
    initials: 'GS',
    color: 'var(--color-slate-500)',
  },
};
