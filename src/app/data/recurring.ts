import { addMonthsClamped } from './dates';
import type { Transaction, TransactionDirection } from './transactions';

import { type SupportedCurrency } from '@/i18n/types';

export const RECURRING_PROJECTION_MONTHS = 24;

export type RecurrenceFrequency = 'monthly';

export type RecurrenceLimit = { kind: 'infinite' } | { kind: 'count'; count: number };

export type RecurringRule = {
  id: string;
  description: string;
  value: number; // monthly amount (in dollars/currency units, matching Transaction.value)
  currency?: SupportedCurrency;
  direction: TransactionDirection;
  typeId: string;
  accountId: string;
  paymentMethodId?: string;
  startDate: Date;
  frequency: RecurrenceFrequency;
  limit: RecurrenceLimit;
  status: 'active' | 'canceled';
  createdAt: Date;
  canceledAt?: Date;
};

export type RecurringInfo = {
  ruleId: string;
  iteration: number; // 1-based index (1, 2, 3...)
  total?: number; // total count if fixed; undefined if infinite
  frequency: RecurrenceFrequency;
};

/**
 * Generates transaction instances for a recurring rule.
 * For fixed count: generates exactly `rule.limit.count` occurrences.
 * For infinite: generates `horizonMonths` occurrences (default 24) starting from `startDate`.
 */
export function buildRecurringTransactions(
  rule: RecurringRule,
  generateId: (index: number) => string,
  horizonMonths = RECURRING_PROJECTION_MONTHS,
): Transaction[] {
  const count = rule.limit.kind === 'count' ? Math.max(1, rule.limit.count) : horizonMonths;
  const transactions: Transaction[] = [];

  for (let i = 0; i < count; i++) {
    const txDate = addMonthsClamped(rule.startDate, i);

    // If the rule was canceled on a specific date, skip occurrences on or after that date
    if (rule.canceledAt && txDate.getTime() >= rule.canceledAt.getTime()) {
      break;
    }

    transactions.push({
      id: generateId(i),
      date: txDate,
      description: rule.description,
      typeId: rule.typeId,
      direction: rule.direction,
      value: rule.value,
      currency: rule.currency,
      accountId: rule.accountId,
      paymentMethodId: rule.paymentMethodId,
      recurring: {
        ruleId: rule.id,
        iteration: i + 1,
        total: rule.limit.kind === 'count' ? rule.limit.count : undefined,
        frequency: rule.frequency,
      },
    });
  }

  return transactions;
}

export function findRecurringSeries(transactions: Transaction[], tx: Transaction): Transaction[] | null {
  if (!tx.recurring) return null;
  const series = transactions.filter(t => t.recurring?.ruleId === tx.recurring!.ruleId);
  return series.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function formatRecurringLabel(info: RecurringInfo, defaultLabel = 'Monthly'): string {
  if (info.total && info.total > 0) {
    return `${info.iteration}/${info.total} • ${defaultLabel}`;
  }
  return defaultLabel;
}
