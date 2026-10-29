import { parseLocalDate, toLocalDateString } from '../dates';
import type { AccountConfig, Settings } from '../settings';
import type { Transaction, TransactionDraft, EditingTarget } from '../transactions';
import type { RecurringRule } from '../recurring';
import type { WorkspaceSnapshot } from './types';
import { logger } from '../../lib/logger';

const serializationLogger = logger.child('Serialization');

export type SerializedAccountConfig = Omit<AccountConfig, 'openingDate'> & {
  openingDate: string;
};

export type SerializedSettings = Omit<Settings, 'accounts'> & {
  accounts: SerializedAccountConfig[];
};

export type SerializedTransaction = Omit<Transaction, 'date'> & {
  date: string;
};

export type SerializedRecurringRule = Omit<RecurringRule, 'startDate' | 'createdAt' | 'canceledAt'> & {
  startDate: string;
  createdAt: string;
  canceledAt?: string;
};

export type SerializedWorkspaceSnapshot = {
  settings: SerializedSettings;
  transactions: SerializedTransaction[];
  recurringRules: SerializedRecurringRule[];
  historicalRollups: Record<string, number>;
  loadedFromDate: string | null;
};

export type SerializedTransactionDraft =
  | {
      kind: 'single';
      transaction: Omit<Transaction, 'id' | 'date'> & { date: string };
    }
  | {
      kind: 'transfer';
      date: string;
      value: number;
      toValue?: number;
      fromAccountId: string;
      fromCurrency: Transaction['currency'];
      toAccountId: string;
      toCurrency: Transaction['currency'];
    }
  | {
      kind: 'installments';
      transaction: Omit<Transaction, 'id' | 'date' | 'value' | 'installment'>;
      firstDate: string;
      totalValue: number;
      count: number;
    }
  | {
      kind: 'recurring';
      transaction: Omit<Transaction, 'id' | 'date' | 'value' | 'recurring' | 'installment'>;
      startDate: string;
      value: number;
      frequency: 'monthly';
      limit: { kind: 'infinite' } | { kind: 'count'; count: number };
    };

export type SerializedEditingTarget =
  | { kind: 'single'; transaction: SerializedTransaction }
  | { kind: 'transfer'; outgoing: SerializedTransaction; incoming: SerializedTransaction }
  | { kind: 'installments'; series: SerializedTransaction[] }
  | { kind: 'recurring'; ruleId: string; series: SerializedTransaction[] };

export function serializeAccount(acc: AccountConfig): SerializedAccountConfig {
  return {
    ...acc,
    openingDate: toLocalDateString(acc.openingDate),
  };
}

export function deserializeAccount(acc: SerializedAccountConfig): AccountConfig {
  return {
    ...acc,
    openingDate: parseLocalDate(acc.openingDate),
  };
}

export function serializeTransaction(tx: Transaction): SerializedTransaction {
  return {
    ...tx,
    date: toLocalDateString(tx.date),
  };
}

export function deserializeTransaction(tx: SerializedTransaction): Transaction {
  const parsedDate = parseLocalDate(tx.date);
  if (isNaN(parsedDate.getTime())) {
    serializationLogger.warn(`Invalid date encountered while deserializing transaction "${tx.id}": "${tx.date}"`);
  }
  return {
    ...tx,
    date: parsedDate,
  };
}

export function serializeRecurringRule(rule: RecurringRule): SerializedRecurringRule {
  return {
    ...rule,
    startDate: toLocalDateString(rule.startDate),
    createdAt: toLocalDateString(rule.createdAt),
    canceledAt: rule.canceledAt ? toLocalDateString(rule.canceledAt) : undefined,
  };
}

export function deserializeRecurringRule(rule: SerializedRecurringRule): RecurringRule {
  return {
    ...rule,
    startDate: parseLocalDate(rule.startDate),
    createdAt: parseLocalDate(rule.createdAt),
    canceledAt: rule.canceledAt ? parseLocalDate(rule.canceledAt) : undefined,
  };
}

export function serializeSnapshot(snapshot: WorkspaceSnapshot): SerializedWorkspaceSnapshot {
  return {
    settings: {
      ...snapshot.settings,
      accounts: snapshot.settings.accounts.map(serializeAccount),
    },
    transactions: snapshot.transactions.map(serializeTransaction),
    recurringRules: snapshot.recurringRules.map(serializeRecurringRule),
    historicalRollups: snapshot.historicalRollups,
    loadedFromDate: snapshot.loadedFromDate ? toLocalDateString(snapshot.loadedFromDate) : null,
  };
}

export function deserializeSnapshot(raw: SerializedWorkspaceSnapshot): WorkspaceSnapshot {
  serializationLogger.trace('Workspace snapshot deserialized', {
    txCount: raw.transactions.length,
    rulesCount: raw.recurringRules.length,
    accountsCount: raw.settings.accounts.length,
  });
  return {
    settings: {
      ...raw.settings,
      accounts: raw.settings.accounts.map(deserializeAccount),
    },
    transactions: raw.transactions.map(deserializeTransaction),
    recurringRules: raw.recurringRules.map(deserializeRecurringRule),
    historicalRollups: raw.historicalRollups,
    loadedFromDate: raw.loadedFromDate ? parseLocalDate(raw.loadedFromDate) : null,
  };
}

export function serializeDraft(draft: TransactionDraft): SerializedTransactionDraft {
  if (draft.kind === 'single') {
    return {
      kind: 'single',
      transaction: {
        ...draft.transaction,
        date: toLocalDateString(draft.transaction.date),
      },
    };
  }
  if (draft.kind === 'transfer') {
    return {
      ...draft,
      date: toLocalDateString(draft.date),
    };
  }
  if (draft.kind === 'installments') {
    return {
      ...draft,
      firstDate: toLocalDateString(draft.firstDate),
    };
  }
  return {
    ...draft,
    startDate: toLocalDateString(draft.startDate),
  };
}

export function deserializeDraft(raw: SerializedTransactionDraft): TransactionDraft {
  if (raw.kind === 'single') {
    return {
      kind: 'single',
      transaction: {
        ...raw.transaction,
        date: parseLocalDate(raw.transaction.date),
      },
    };
  }
  if (raw.kind === 'transfer') {
    return {
      ...raw,
      date: parseLocalDate(raw.date),
    };
  }
  if (raw.kind === 'installments') {
    return {
      ...raw,
      firstDate: parseLocalDate(raw.firstDate),
    };
  }
  return {
    ...raw,
    startDate: parseLocalDate(raw.startDate),
  };
}

export function serializeEditingTarget(target?: EditingTarget | null): SerializedEditingTarget | null {
  if (!target) return null;
  if (target.kind === 'single') {
    return { kind: 'single', transaction: serializeTransaction(target.transaction) };
  }
  if (target.kind === 'transfer') {
    return {
      kind: 'transfer',
      outgoing: serializeTransaction(target.outgoing),
      incoming: serializeTransaction(target.incoming),
    };
  }
  if (target.kind === 'installments') {
    return {
      kind: 'installments',
      series: target.series.map(serializeTransaction),
    };
  }
  return {
    kind: 'recurring',
    ruleId: target.ruleId,
    series: target.series.map(serializeTransaction),
  };
}

export function deserializeEditingTarget(raw?: SerializedEditingTarget | null): EditingTarget | null {
  if (!raw) return null;
  if (raw.kind === 'single') {
    return { kind: 'single', transaction: deserializeTransaction(raw.transaction) };
  }
  if (raw.kind === 'transfer') {
    return {
      kind: 'transfer',
      outgoing: deserializeTransaction(raw.outgoing),
      incoming: deserializeTransaction(raw.incoming),
    };
  }
  if (raw.kind === 'installments') {
    return {
      kind: 'installments',
      series: raw.series.map(deserializeTransaction),
    };
  }
  return {
    kind: 'recurring',
    ruleId: raw.ruleId,
    series: raw.series.map(deserializeTransaction),
  };
}
