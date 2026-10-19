import { getToday, addDays } from '../dates';
import type { RecurringRule } from '../recurring';

export function daysFromToday(days: number): Date {
  return addDays(getToday(), days);
}

export const SEEDED_RECURRING_RULES: RecurringRule[] = [
  {
    id: 'rule-salary',
    description: 'Salary Deposit',
    typeId: 'income',
    direction: 'income',
    value: 520000,
    currency: 'USD',
    accountId: 'boa',
    startDate: daysFromToday(-70),
    frequency: 'monthly',
    limit: { kind: 'infinite' },
    status: 'active',
    createdAt: daysFromToday(-70),
  },
  {
    id: 'rule-rent',
    description: 'Rent',
    typeId: 'bills',
    direction: 'expense',
    value: 180000,
    currency: 'USD',
    accountId: 'boa',
    paymentMethodId: 'bank-transfer',
    startDate: daysFromToday(-72),
    frequency: 'monthly',
    limit: { kind: 'infinite' },
    status: 'active',
    createdAt: daysFromToday(-72),
  },
];
