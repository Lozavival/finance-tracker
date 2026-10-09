export const INCOME_TYPES = ['Income', 'Refund'] as const;
export const EXPENSE_TYPES = [
  'Shopping',
  'Entertainment',
  'Transportation',
  'Transfer',
  'Food & Dining',
  'Bills',
] as const;

export const TRANSACTION_TYPES = [...INCOME_TYPES, ...EXPENSE_TYPES] as const;

import { ACCOUNT_DETAILS } from './accounts';
import { parseLocalDate, getToday, formatShort, formatMonthYear } from './dates';

export const ACCOUNTS = Object.keys(ACCOUNT_DETAILS) as any as ['Bank of America', 'Citigroup', 'Goldman Sachs'];

export const TRANSACTION_DIRECTIONS = ['income', 'expense'] as const;

export const PAYMENT_METHODS = ['Credit card', 'Debit card', 'Cash', 'PIX', 'Bank transfer'] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];
export type Account = (typeof ACCOUNTS)[number];
export type TransactionDirection = (typeof TRANSACTION_DIRECTIONS)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type InstallmentInfo = {
  groupId: string;
  number: number;
  total: number;
};

export type Transaction = {
  id: string;
  date: Date;
  description: string;
  type: TransactionType;
  direction: TransactionDirection;
  value: number;
  account: Account;
  paymentMethod?: PaymentMethod;
  transferId?: string;
  installment?: InstallmentInfo;
};

export type TransactionDraft =
  | { kind: 'single'; transaction: Omit<Transaction, 'id'> }
  | {
      kind: 'transfer';
      date: Date;
      value: number;
      fromAccount: Account;
      toAccount: Account;
    }
  | {
      kind: 'installments';
      transaction: Omit<Transaction, 'id' | 'date' | 'value' | 'installment'>;
      firstDate: Date;
      totalValue: number;
      count: number;
    };

export function buildTransferLegs(
  draft: Extract<TransactionDraft, { kind: 'transfer' }>,
  transferId: string,
  ids: [string, string],
): [Transaction, Transaction] {
  return [
    {
      id: ids[0],
      date: draft.date,
      description: `Transfer to ${draft.toAccount}`,
      type: 'Transfer',
      direction: 'expense',
      value: draft.value,
      account: draft.fromAccount,
      transferId,
    },
    {
      id: ids[1],
      date: draft.date,
      description: `Transfer from ${draft.fromAccount}`,
      type: 'Transfer',
      direction: 'income',
      value: draft.value,
      account: draft.toAccount,
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
  name: TransactionType;
  value: number;
  color: string;
  dotClassName: string;
};

export const CATEGORY_STYLES: Record<TransactionType, { color: string; dotClassName: string }> = {
  Shopping: {
    color: 'var(--color-cyan-400)',
    dotClassName: 'bg-cyan-400',
  },
  'Food & Dining': {
    color: 'var(--color-blue-400)',
    dotClassName: 'bg-blue-400',
  },
  Transportation: {
    color: 'var(--color-violet-400)',
    dotClassName: 'bg-violet-400',
  },
  Entertainment: {
    color: 'var(--color-pink-400)',
    dotClassName: 'bg-pink-400',
  },
  Bills: {
    color: 'var(--color-amber-400)',
    dotClassName: 'bg-amber-400',
  },
  Income: {
    color: 'var(--color-emerald-400)',
    dotClassName: 'bg-emerald-400',
  },
  Refund: {
    color: 'var(--color-teal-400)',
    dotClassName: 'bg-teal-400',
  },
  Transfer: {
    color: 'var(--color-indigo-400)',
    dotClassName: 'bg-indigo-400',
  },
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export function formatCurrency(amount: number) {
  return currencyFormatter.format(amount);
}

export function formatSignedValue(transaction: Transaction) {
  const sign = transaction.direction === 'income' ? '+' : '−';
  return `${sign}${formatCurrency(transaction.value)}`;
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

export function aggregateExpensesByCategory(transactions: Transaction[]): CategoryTotal[] {
  const totals = new Map<TransactionType, number>();

  transactions.forEach(transaction => {
    if (transaction.direction === 'expense' && !transaction.transferId) {
      totals.set(transaction.type, (totals.get(transaction.type) ?? 0) + transaction.value);
    }
  });

  return TRANSACTION_TYPES.flatMap(name => {
    const value = totals.get(name) ?? 0;
    if (value === 0) return [];
    return [{ name, value, ...CATEGORY_STYLES[name] }];
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

export function groupTransactionsByMonth(transactions: Transaction[]) {
  const groups = new Map<string, { key: string; label: string; transactions: Transaction[] }>();

  for (const transaction of transactions) {
    const key = `${transaction.date.getFullYear()}-${String(transaction.date.getMonth() + 1).padStart(2, '0')}`;
    if (!groups.has(key)) {
      const label = formatMonthYear(transaction.date);
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
