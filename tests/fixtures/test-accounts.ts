import type { AccountConfig } from '@/data/settings';
import { parseLocalDate } from '@/data/dates';

export const TEST_CHECKING_ACCOUNT: AccountConfig = {
  id: 'test-checking',
  name: 'Checking Account',
  kind: 'Checking',
  currencies: ['USD'],
  openingBalances: { USD: 100000 }, // $1,000.00
  openingDate: parseLocalDate('2026-01-01'),
  initials: 'CA',
  color: 'cyan',
  allowedPaymentMethods: ['debit', 'bank-transfer'],
};

export const TEST_SAVINGS_ACCOUNT: AccountConfig = {
  id: 'test-savings',
  name: 'Savings Fund',
  kind: 'Savings',
  currencies: ['USD', 'BRL'],
  openingBalances: { USD: 500000, BRL: 250000 },
  openingDate: parseLocalDate('2026-01-01'),
  initials: 'SF',
  color: 'emerald',
  allowedPaymentMethods: ['bank-transfer'],
};

export const TEST_CREDIT_CARD_ACCOUNT: AccountConfig = {
  id: 'test-credit-card',
  name: 'Platinum Card',
  kind: 'Checking',
  currencies: ['USD'],
  openingBalances: { USD: 0 },
  openingDate: parseLocalDate('2026-01-01'),
  initials: 'PC',
  color: 'violet',
  allowedPaymentMethods: ['credit-card'],
  card: {
    name: 'Platinum Card',
    closingDay: 20,
    dueDay: 5,
    limit: 500000, // $5,000.00
  },
};

export const TEST_CASH_ACCOUNT: AccountConfig = {
  id: 'test-cash-wallet',
  name: 'Cash Wallet',
  kind: 'Cash',
  currencies: ['USD'],
  openingBalances: { USD: 15000 }, // $150.00
  openingDate: parseLocalDate('2026-01-01'),
  initials: 'CW',
  color: 'amber',
  allowedPaymentMethods: ['cash'],
};

export const TEST_ACCOUNTS: AccountConfig[] = [
  TEST_CHECKING_ACCOUNT,
  TEST_SAVINGS_ACCOUNT,
  TEST_CREDIT_CARD_ACCOUNT,
  TEST_CASH_ACCOUNT,
];
