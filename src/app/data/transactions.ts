import { parseLocalDate, getToday, formatShort, formatMonthYear } from './dates';
import { type TransactionTypeConfig, TRANSFER_TYPE_ID, colorVar } from './settings';
import { type RecurringInfo, type RecurrenceLimit } from './recurring';

export type TransactionDirection = 'income' | 'expense';
export const TRANSACTION_DIRECTIONS = ['income', 'expense'] as const;

// Backward-compat aliases
export type TransactionType = string;
export type Account = string;
export type PaymentMethod = string;

export type InstallmentInfo = {
  groupId: string;
  number: number;
  total: number;
};

import { type SupportedCurrency } from '@/i18n/types';
import { convertCents, formatCents } from './currency';
import { logger } from '../lib/logger';

const txLogger = logger.child('Transactions');

export type Transaction = {
  id: string;
  date: Date;
  description: string;
  typeId: string;
  direction: TransactionDirection;
  value: number; // integer cents
  currency: SupportedCurrency;
  accountId: string;
  paymentMethodId?: string;
  transferId?: string;
  installment?: InstallmentInfo;
  recurring?: RecurringInfo;
};

export type TransactionDraft =
  | { kind: 'single'; transaction: Omit<Transaction, 'id'> }
  | {
      kind: 'transfer';
      date: Date;
      value: number; // sent value in integer cents (fromCurrency)
      toValue?: number; // received value in integer cents (toCurrency)
      fromAccountId: string;
      fromCurrency: SupportedCurrency;
      toAccountId: string;
      toCurrency: SupportedCurrency;
    }
  | {
      kind: 'installments';
      transaction: Omit<Transaction, 'id' | 'date' | 'value' | 'installment'>;
      firstDate: Date;
      totalValue: number; // integer cents
      count: number;
    }
  | {
      kind: 'recurring';
      transaction: Omit<Transaction, 'id' | 'date' | 'value' | 'installment' | 'recurring'>;
      startDate: Date;
      value: number; // integer cents
      frequency: 'monthly';
      limit: RecurrenceLimit;
    };

export type EditingTarget =
  | { kind: 'single'; transaction: Transaction }
  | { kind: 'transfer'; outgoing: Transaction; incoming: Transaction }
  | { kind: 'installments'; series: Transaction[] }
  | { kind: 'recurring'; series: Transaction[]; ruleId: string };

export function buildTransferLegs(
  draft: Extract<TransactionDraft, { kind: 'transfer' }>,
  transferId: string,
  ids: [string, string],
  accountNames?: { fromName?: string; toName?: string },
): [Transaction, Transaction] {
  const { fromCurrency, toCurrency } = draft;
  const toValue = draft.toValue ?? draft.value;
  const isCross = fromCurrency !== toCurrency;

  const toLabel = accountNames?.toName ? ` to ${accountNames.toName}` : '';
  const fromLabel = accountNames?.fromName ? ` from ${accountNames.fromName}` : '';
  const rateLabel =
    isCross && toValue > 0
      ? ` (${(toValue / 100).toFixed(2)} ${toCurrency} @ ${(draft.value / toValue).toFixed(2)} ${fromCurrency}/${toCurrency})`
      : '';

  return [
    {
      id: ids[0],
      date: draft.date,
      description: `Transfer${toLabel}${rateLabel}`,
      typeId: TRANSFER_TYPE_ID,
      direction: 'expense',
      value: draft.value,
      currency: fromCurrency,
      accountId: draft.fromAccountId,
      transferId,
    },
    {
      id: ids[1],
      date: draft.date,
      description: `Transfer${fromLabel}`,
      typeId: TRANSFER_TYPE_ID,
      direction: 'income',
      value: toValue,
      currency: toCurrency,
      accountId: draft.toAccountId,
      transferId,
    },
  ];
}

export function findTransferLegs(
  transactions: Transaction[],
  tx: Transaction,
): { outgoing: Transaction; incoming: Transaction } | null {
  if (!tx.transferId) return null;
  const related = transactions.filter(t => t.transferId === tx.transferId);
  if (related.length !== 2) return null;
  const outgoing = related.find(t => t.direction === 'expense');
  const incoming = related.find(t => t.direction === 'income');
  if (!outgoing || !incoming) return null;
  return { outgoing, incoming };
}

export type CategoryTotal = {
  typeId: string;
  name: string;
  value: number;
  color: string;
  dotClassName?: string;
};

export function formatCurrency(amount: number, currency: SupportedCurrency = 'USD', locale = 'en-US') {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(amount);
  } catch (err) {
    txLogger.warn('Intl.NumberFormat failed in formatCurrency, using fallback formatting:', {
      amount,
      currency,
      locale,
      error: err,
    });
    const symbol = currency === 'BRL' ? 'R$' : '$';
    return `${symbol}${amount.toFixed(2)}`;
  }
}

export function formatSignedValue(transaction: Transaction, locale = 'en-US') {
  const sign = transaction.direction === 'income' ? '+' : '−';
  return `${sign}${formatCents(transaction.value, transaction.currency, locale)}`;
}

export function getLatestMonthRange(transactions: Transaction[]) {
  const latestDate = transactions.reduce(
    (latest, transaction) => (transaction.date.getTime() > latest.getTime() ? transaction.date : latest),
    transactions[0]?.date ?? getToday(),
  );
  return {
    from: new Date(latestDate.getFullYear(), latestDate.getMonth(), 1, 0, 0, 0, 0),
    to: new Date(latestDate.getFullYear(), latestDate.getMonth() + 1, 0, 0, 0, 0, 0),
  };
}

export function sortTransactionsAscending(transactions: Transaction[]) {
  return [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime() || a.id.localeCompare(b.id));
}

export function aggregateExpensesByCategory(
  transactions: Transaction[],
  types: TransactionTypeConfig[],
  targetCurrency?: SupportedCurrency,
  exchangeRate?: number | null,
): CategoryTotal[] {
  const totals = new Map<string, number>();

  transactions.forEach(transaction => {
    if (transaction.direction === 'expense' && !transaction.transferId) {
      let val = transaction.value;
      if (targetCurrency && transaction.currency !== targetCurrency) {
        const converted = convertCents(transaction.value, transaction.currency, targetCurrency, exchangeRate ?? null);
        if (converted !== null) {
          val = converted;
        }
      }
      totals.set(transaction.typeId, (totals.get(transaction.typeId) ?? 0) + val);
    }
  });

  return types.flatMap(typeConfig => {
    const value = totals.get(typeConfig.id) ?? 0;
    if (value === 0) return [];
    return [
      {
        typeId: typeConfig.id,
        name: typeConfig.name,
        value,
        color: colorVar(typeConfig.color),
      },
    ];
  });
}

export function createTransactionId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `transaction-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const PERIOD_PRESETS = [7, 30, 90] as const;

export type PeriodFilter =
  | { kind: 'up-to-today' }
  | { kind: 'all' }
  | { kind: 'preset'; days: (typeof PERIOD_PRESETS)[number] }
  | { kind: 'custom'; from: Date; to: Date };

export function resolvePeriodRange(period: PeriodFilter, today = getToday()) {
  if (period.kind === 'all') return null;

  if (period.kind === 'up-to-today') {
    return {
      from: parseLocalDate('1970-01-01'),
      to: today,
    };
  }

  if (period.kind === 'preset') {
    const fromDate = new Date(today);
    fromDate.setDate(today.getDate() - (period.days - 1));
    return {
      from: fromDate,
      to: today,
    };
  }

  return { from: period.from, to: period.to };
}

export function sortTransactionsDescending(transactions: Transaction[]) {
  return [...transactions].sort((a, b) => b.date.getTime() - a.date.getTime() || b.id.localeCompare(a.id));
}

export function groupTransactionsByMonth(transactions: Transaction[], locale = 'en-US') {
  const groups = new Map<string, { key: string; label: string; transactions: Transaction[] }>();

  for (const transaction of transactions) {
    const key = `${transaction.date.getFullYear()}-${String(transaction.date.getMonth() + 1).padStart(2, '0')}`;
    if (!groups.has(key)) {
      const label = formatMonthYear(transaction.date, locale);
      groups.set(key, { key, label, transactions: [] });
    }
    groups.get(key)!.transactions.push(transaction);
  }

  return Array.from(groups.values());
}

export function formatPeriodLabel(from: Date, to: Date) {
  return `${formatShort(from)} – ${formatShort(to)}`;
}

export function groupToAccrualBasis(transactions: Transaction[]): Transaction[] {
  const grouped = new Map<string, Transaction[]>();
  const results: Transaction[] = [];

  for (const t of transactions) {
    if (t.installment) {
      const g = grouped.get(t.installment.groupId) || [];
      g.push(t);
      grouped.set(t.installment.groupId, g);
    } else {
      results.push(t);
    }
  }

  for (const group of grouped.values()) {
    group.sort((a, b) => a.installment!.number - b.installment!.number);
    const first = group[0];
    const totalValue = group.reduce((sum, t) => sum + t.value, 0);

    results.push({
      ...first,
      value: totalValue,
      installment: {
        ...first.installment!,
        number: -1, // -1 indicates accrual view
      },
    });
  }

  return results;
}
