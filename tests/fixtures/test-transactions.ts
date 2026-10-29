import type { Transaction } from '@/data/transactions';
import { parseLocalDate } from '@/data/dates';

export const TEST_SINGLE_EXPENSE: Transaction = {
  id: 'tx-single-expense',
  date: parseLocalDate('2026-03-15'),
  description: 'Grocery Shopping',
  typeId: 'food',
  direction: 'expense',
  value: 4500, // $45.00
  currency: 'USD',
  accountId: 'test-checking',
  paymentMethodId: 'debit',
};

export const TEST_SINGLE_INCOME: Transaction = {
  id: 'tx-single-income',
  date: parseLocalDate('2026-03-01'),
  description: 'Monthly Salary',
  typeId: 'salary',
  direction: 'income',
  value: 300000, // $3,000.00
  currency: 'USD',
  accountId: 'test-checking',
  paymentMethodId: 'bank-transfer',
};

export const TEST_TRANSFER_LEGS: [Transaction, Transaction] = [
  {
    id: 'tx-transfer-out',
    date: parseLocalDate('2026-03-10'),
    description: 'Transfer to Savings Fund',
    typeId: 'transfer',
    direction: 'expense',
    value: 50000, // $500.00
    currency: 'USD',
    accountId: 'test-checking',
    transferId: 'transfer-uuid-1',
  },
  {
    id: 'tx-transfer-in',
    date: parseLocalDate('2026-03-10'),
    description: 'Transfer from Checking Account',
    typeId: 'transfer',
    direction: 'income',
    value: 50000, // $500.00
    currency: 'USD',
    accountId: 'test-savings',
    transferId: 'transfer-uuid-1',
  },
];

export const TEST_INSTALLMENT_SERIES: Transaction[] = [
  {
    id: 'tx-inst-1',
    date: parseLocalDate('2026-01-31'),
    description: 'New Laptop',
    typeId: 'electronics',
    direction: 'expense',
    value: 3334,
    currency: 'USD',
    accountId: 'test-credit-card',
    paymentMethodId: 'credit-card',
    installment: {
      groupId: 'inst-laptop-1',
      number: 1,
      total: 3,
    },
  },
  {
    id: 'tx-inst-2',
    date: parseLocalDate('2026-02-28'),
    description: 'New Laptop',
    typeId: 'electronics',
    direction: 'expense',
    value: 3333,
    currency: 'USD',
    accountId: 'test-credit-card',
    paymentMethodId: 'credit-card',
    installment: {
      groupId: 'inst-laptop-1',
      number: 2,
      total: 3,
    },
  },
  {
    id: 'tx-inst-3',
    date: parseLocalDate('2026-03-31'),
    description: 'New Laptop',
    typeId: 'electronics',
    direction: 'expense',
    value: 3333,
    currency: 'USD',
    accountId: 'test-credit-card',
    paymentMethodId: 'credit-card',
    installment: {
      groupId: 'inst-laptop-1',
      number: 3,
      total: 3,
    },
  },
];

export const TEST_TRANSACTIONS: Transaction[] = [
  TEST_SINGLE_EXPENSE,
  TEST_SINGLE_INCOME,
  TEST_TRANSFER_LEGS[0],
  TEST_TRANSFER_LEGS[1],
  ...TEST_INSTALLMENT_SERIES,
];
