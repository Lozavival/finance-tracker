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
  date: string;
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
      date: string;
      value: number;
      fromAccount: Account;
      toAccount: Account;
    }
  | {
      kind: 'installments';
      transaction: Omit<Transaction, 'id' | 'date' | 'value' | 'installment'>;
      firstDate: string;
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

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export function parseTransactionDate(date: string) {
  return new Date(`${date}T00:00:00`);
}

export function toTransactionDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTransactionDate(date: string) {
  return dateFormatter.format(parseTransactionDate(date));
}

export function formatCurrency(amount: number) {
  return currencyFormatter.format(amount);
}

export function formatSignedValue(transaction: Transaction) {
  const sign = transaction.direction === 'income' ? '+' : '−';
  return `${sign}${formatCurrency(transaction.value)}`;
}

export function getLatestMonthRange(transactions: Transaction[]) {
  const latestDate = transactions.reduce(
    (latest, transaction) => (transaction.date > latest ? transaction.date : latest),
    transactions[0]?.date ?? toTransactionDate(new Date()),
  );
  const date = parseTransactionDate(latestDate);
  return {
    from: new Date(date.getFullYear(), date.getMonth(), 1),
    to: new Date(date.getFullYear(), date.getMonth() + 1, 0),
  };
}

export function sortTransactionsAscending(transactions: Transaction[]) {
  return [...transactions].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
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
  | { kind: 'custom'; from: string; to: string };

export function resolvePeriodRange(period: PeriodFilter, today = new Date()) {
  if (period.kind === 'all') return null;

  if (period.kind === 'up-to-today') {
    return {
      from: '1970-01-01',
      to: toTransactionDate(today),
    };
  }

  if (period.kind === 'preset') {
    const fromDate = new Date(today);
    fromDate.setDate(today.getDate() - (period.days - 1));
    return {
      from: toTransactionDate(fromDate),
      to: toTransactionDate(today),
    };
  }

  return { from: period.from, to: period.to };
}

export function sortTransactionsDescending(transactions: Transaction[]) {
  return [...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

export function groupTransactionsByMonth(transactions: Transaction[]) {
  const groups = new Map<string, { key: string; label: string; transactions: Transaction[] }>();

  for (const transaction of transactions) {
    // extract YYYY-MM
    const key = transaction.date.slice(0, 7);
    if (!groups.has(key)) {
      const date = parseTransactionDate(transaction.date);
      const label = new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric',
      }).format(date);
      groups.set(key, { key, label, transactions: [] });
    }
    groups.get(key)!.transactions.push(transaction);
  }

  return Array.from(groups.values());
}

export function formatRowDate(dateString: string) {
  const date = parseTransactionDate(dateString);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatPeriodLabel(from: Date | string, to: Date | string) {
  const fromDate = typeof from === 'string' ? parseTransactionDate(from) : from;
  const toDate = typeof to === 'string' ? parseTransactionDate(to) : to;

  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return `${formatter.format(fromDate)} – ${formatter.format(toDate)}`;
}
