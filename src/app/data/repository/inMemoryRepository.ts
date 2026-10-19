import { addDays, getToday } from '@/data/dates';
import type { GoalCategory } from '@/data/goals';
import { buildInstallments } from '@/data/installments';
import { type RecurringRule, buildRecurringTransactions } from '@/data/recurring';
import { PRODUCTION_DEFAULT_SETTINGS } from '@/data/defaults';
import { DEV_DEFAULT_SETTINGS, SEEDED_RECURRING_RULES, SEEDED_TRANSACTIONS } from '@/data/fixtures';
import {
  type AccountConfig,
  type PaymentMethodConfig,
  type Settings,
  type TransactionTypeConfig,
  findAccount,
  isCreditCard,
} from '@/data/settings';
import {
  type EditingTarget,
  type Transaction,
  type TransactionDraft,
  buildTransferLegs,
  createTransactionId,
} from '@/data/transactions';
import type { SupportedCurrency, SupportedLocale } from '@/i18n/types';
import type { FinanceRepository, SaveTransactionResult, TransactionQuery, WorkspaceSnapshot } from './types';

export class InMemoryFinanceRepository implements FinanceRepository {
  private settings: Settings;
  private transactions: Transaction[];
  private recurringRules: RecurringRule[];

  constructor(mode: 'production' | 'development' = 'development') {
    if (mode === 'production') {
      this.settings = structuredClone(PRODUCTION_DEFAULT_SETTINGS);
      this.transactions = [];
      this.recurringRules = [];
    } else {
      this.settings = structuredClone(DEV_DEFAULT_SETTINGS);
      this.transactions = [...SEEDED_TRANSACTIONS];
      this.recurringRules = [...SEEDED_RECURRING_RULES];
    }
  }

  loadWorkspace(windowDays = 90): Promise<WorkspaceSnapshot> {
    const cutoffDate = windowDays > 0 ? addDays(getToday(), -windowDays) : null;
    if (!cutoffDate) {
      return Promise.resolve({
        settings: this.settings,
        transactions: [...this.transactions],
        recurringRules: [...this.recurringRules],
        historicalRollups: {},
        loadedFromDate: null,
      });
    }

    const historicalRollups: Record<string, number> = {};
    const windowed: Transaction[] = [];

    for (const tx of this.transactions) {
      if (tx.date.getTime() >= cutoffDate.getTime() || isCreditCard(this.settings, tx.paymentMethodId)) {
        windowed.push(tx);
      } else {
        const acc = findAccount(this.settings, tx.accountId);
        if (acc && tx.date.getTime() >= acc.openingDate.getTime()) {
          const key = `${tx.accountId}:${tx.currency}`;
          const delta = tx.direction === 'income' ? tx.value : -tx.value;
          historicalRollups[key] = (historicalRollups[key] ?? 0) + delta;
        }
      }
    }

    return Promise.resolve({
      settings: this.settings,
      transactions: windowed,
      recurringRules: [...this.recurringRules],
      historicalRollups,
      loadedFromDate: cutoffDate,
    });
  }

  fetchTransactions(query: TransactionQuery): Promise<Transaction[]> {
    return Promise.resolve(
      this.transactions.filter(tx => {
        if (query.fromDate && tx.date.getTime() < query.fromDate.getTime()) return false;
        if (query.toDate && tx.date.getTime() > query.toDate.getTime()) return false;
        if (query.accountId && tx.accountId !== query.accountId) return false;
        return true;
      }),
    );
  }

  saveTransactionDraft(draft: TransactionDraft, editingTarget?: EditingTarget | null): Promise<SaveTransactionResult> {
    let nextTransactions = [...this.transactions];
    let existingIds: string[] = [];
    let groupId = createTransactionId();
    let transferId = createTransactionId();

    if (editingTarget) {
      if (editingTarget.kind === 'single') {
        existingIds = [editingTarget.transaction.id];
        nextTransactions = nextTransactions.filter(t => t.id !== editingTarget.transaction.id);
      } else if (editingTarget.kind === 'transfer') {
        existingIds = [editingTarget.outgoing.id, editingTarget.incoming.id];
        transferId = editingTarget.outgoing.transferId ?? createTransactionId();
        nextTransactions = nextTransactions.filter(t => t.transferId !== transferId);
      } else if (editingTarget.kind === 'installments') {
        existingIds = editingTarget.series.map(t => t.id);
        groupId = editingTarget.series[0]?.installment?.groupId ?? createTransactionId();
        nextTransactions = nextTransactions.filter(t => t.installment?.groupId !== groupId);
      } else if (editingTarget.kind === 'recurring') {
        existingIds = editingTarget.series.map(t => t.id);
        nextTransactions = nextTransactions.filter(t => t.recurring?.ruleId !== editingTarget.ruleId);
        if (draft.kind !== 'recurring') {
          this.recurringRules = this.recurringRules.filter(r => r.id !== editingTarget.ruleId);
        }
      }
    }

    if (draft.kind === 'single') {
      const id = existingIds[0] ?? createTransactionId();
      nextTransactions.push({ ...draft.transaction, id });
    } else if (draft.kind === 'transfer') {
      const ids: [string, string] = [existingIds[0] ?? createTransactionId(), existingIds[1] ?? createTransactionId()];
      const fromAcc = findAccount(this.settings, draft.fromAccountId);
      const toAcc = findAccount(this.settings, draft.toAccountId);
      const legs = buildTransferLegs(draft, transferId, ids, {
        fromName: fromAcc?.name,
        toName: toAcc?.name,
      });
      nextTransactions.push(legs[0], legs[1]);
    } else if (draft.kind === 'installments') {
      if (!isCreditCard(this.settings, draft.transaction.paymentMethodId)) {
        const id = existingIds[0] ?? createTransactionId();
        nextTransactions.push({
          ...draft.transaction,
          id,
          date: draft.firstDate,
          value: draft.totalValue,
        });
      } else {
        const ids = Array.from({ length: draft.count }, (_, i) => existingIds[i] ?? createTransactionId());
        nextTransactions.push(...buildInstallments(draft, groupId, ids));
      }
    } else if (draft.kind === 'recurring') {
      const ruleId = editingTarget && editingTarget.kind === 'recurring' ? editingTarget.ruleId : createTransactionId();
      const newRule: RecurringRule = {
        id: ruleId,
        description: draft.transaction.description,
        value: draft.value,
        currency: draft.transaction.currency,
        direction: draft.transaction.direction,
        typeId: draft.transaction.typeId,
        accountId: draft.transaction.accountId,
        paymentMethodId: draft.transaction.paymentMethodId,
        startDate: draft.startDate,
        frequency: draft.frequency,
        limit: draft.limit,
        status: 'active',
        createdAt: getToday(),
      };
      this.recurringRules = [...this.recurringRules.filter(r => r.id !== ruleId), newRule];
      const newInstances = buildRecurringTransactions(newRule, i => existingIds[i] ?? createTransactionId());
      nextTransactions.push(...newInstances);
    }

    this.transactions = nextTransactions;
    return Promise.resolve({
      transactions: [...this.transactions],
      recurringRules: [...this.recurringRules],
    });
  }

  deleteTransactionTarget(
    target: Transaction,
    scope: 'only-this' | 'this-and-future' | 'all' = 'only-this',
  ): Promise<SaveTransactionResult> {
    if (target.transferId) {
      this.transactions = this.transactions.filter(t => t.transferId !== target.transferId);
    } else if (target.installment) {
      this.transactions = this.transactions.filter(t => t.installment?.groupId !== target.installment!.groupId);
    } else if (target.recurring) {
      const ruleId = target.recurring.ruleId;
      if (scope === 'all') {
        this.recurringRules = this.recurringRules.filter(r => r.id !== ruleId);
        this.transactions = this.transactions.filter(t => t.recurring?.ruleId !== ruleId);
      } else if (scope === 'this-and-future') {
        this.recurringRules = this.recurringRules.map(r =>
          r.id === ruleId ? { ...r, status: 'canceled', canceledAt: target.date } : r,
        );
        this.transactions = this.transactions.filter(
          t => !(t.recurring?.ruleId === ruleId && t.date.getTime() >= target.date.getTime()),
        );
      } else {
        this.transactions = this.transactions.filter(t => t.id !== target.id);
      }
    } else {
      this.transactions = this.transactions.filter(t => t.id !== target.id);
    }

    return Promise.resolve({
      transactions: [...this.transactions],
      recurringRules: [...this.recurringRules],
    });
  }

  cancelRecurringRule(ruleId: string, effectiveDate: Date): Promise<SaveTransactionResult> {
    this.recurringRules = this.recurringRules.map(r =>
      r.id === ruleId ? { ...r, status: 'canceled', canceledAt: effectiveDate } : r,
    );
    this.transactions = this.transactions.filter(
      t => !(t.recurring?.ruleId === ruleId && t.date.getTime() >= effectiveDate.getTime()),
    );
    return Promise.resolve({
      transactions: [...this.transactions],
      recurringRules: [...this.recurringRules],
    });
  }

  deleteRecurringRule(ruleId: string): Promise<SaveTransactionResult> {
    this.recurringRules = this.recurringRules.filter(r => r.id !== ruleId);
    this.transactions = this.transactions.filter(t => t.recurring?.ruleId !== ruleId);
    return Promise.resolve({
      transactions: [...this.transactions],
      recurringRules: [...this.recurringRules],
    });
  }

  createAccount(account: AccountConfig): Promise<void> {
    this.settings = {
      ...this.settings,
      accounts: [...this.settings.accounts, account],
    };
    return Promise.resolve();
  }

  updateAccount(id: string, changes: Partial<Omit<AccountConfig, 'id'>>): Promise<void> {
    this.settings = {
      ...this.settings,
      accounts: this.settings.accounts.map(a => (a.id === id ? { ...a, ...changes } : a)),
    };
    return Promise.resolve();
  }

  archiveAccount(id: string, cancelRecurrences = false, effectiveDate: Date = getToday()): Promise<void> {
    this.settings = {
      ...this.settings,
      accounts: this.settings.accounts.map(a => (a.id === id ? { ...a, archived: true } : a)),
    };
    if (cancelRecurrences) {
      const activeIds = new Set(
        this.recurringRules.filter(r => r.accountId === id && r.status === 'active').map(r => r.id),
      );
      this.recurringRules = this.recurringRules.map(r =>
        activeIds.has(r.id) ? { ...r, status: 'canceled', canceledAt: effectiveDate } : r,
      );
      this.transactions = this.transactions.filter(
        t => !(t.recurring && activeIds.has(t.recurring.ruleId) && t.date.getTime() >= effectiveDate.getTime()),
      );
    }
    return Promise.resolve();
  }

  restoreAccount(id: string): Promise<void> {
    this.settings = {
      ...this.settings,
      accounts: this.settings.accounts.map(a => (a.id === id ? { ...a, archived: false } : a)),
    };
    return Promise.resolve();
  }

  deleteAccount(id: string): Promise<void> {
    this.settings = {
      ...this.settings,
      accounts: this.settings.accounts.filter(a => a.id !== id),
    };
    this.recurringRules = this.recurringRules.filter(r => r.accountId !== id);
    this.transactions = this.transactions.filter(t => t.accountId !== id);
    return Promise.resolve();
  }

  createTransactionType(type: TransactionTypeConfig): Promise<void> {
    this.settings = {
      ...this.settings,
      transactionTypes: [...this.settings.transactionTypes, type],
    };
    return Promise.resolve();
  }

  updateTransactionType(id: string, changes: Partial<Omit<TransactionTypeConfig, 'id'>>): Promise<void> {
    this.settings = {
      ...this.settings,
      transactionTypes: this.settings.transactionTypes.map(t => (t.id === id ? { ...t, ...changes } : t)),
    };
    return Promise.resolve();
  }

  reorderTransactionTypes(_direction: 'income' | 'expense', orderedIds: string[]): Promise<void> {
    const orderMap = new Map(orderedIds.map((id, idx) => [id, idx]));
    this.settings = {
      ...this.settings,
      transactionTypes: [...this.settings.transactionTypes].sort(
        (a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999),
      ),
    };
    return Promise.resolve();
  }

  reassignAndDeleteTransactionType(fromTypeId: string, toTypeId?: string): Promise<void> {
    if (toTypeId) {
      this.transactions = this.transactions.map(t => (t.typeId === fromTypeId ? { ...t, typeId: toTypeId } : t));
      this.recurringRules = this.recurringRules.map(r => (r.typeId === fromTypeId ? { ...r, typeId: toTypeId } : r));
    }
    const nextMappings = { ...this.settings.goals.typeMappings };
    delete nextMappings[fromTypeId];
    this.settings = {
      ...this.settings,
      transactionTypes: this.settings.transactionTypes.filter(t => t.id !== fromTypeId),
      goals: {
        ...this.settings.goals,
        typeMappings: nextMappings,
      },
    };
    return Promise.resolve();
  }

  createPaymentMethod(method: PaymentMethodConfig): Promise<void> {
    this.settings = {
      ...this.settings,
      paymentMethods: [...this.settings.paymentMethods, method],
    };
    return Promise.resolve();
  }

  updatePaymentMethod(id: string, changes: Partial<Omit<PaymentMethodConfig, 'id'>>): Promise<void> {
    this.settings = {
      ...this.settings,
      paymentMethods: this.settings.paymentMethods.map(m => (m.id === id ? { ...m, ...changes } : m)),
    };
    return Promise.resolve();
  }

  reorderPaymentMethods(orderedIds: string[]): Promise<void> {
    const orderMap = new Map(orderedIds.map((id, idx) => [id, idx]));
    this.settings = {
      ...this.settings,
      paymentMethods: [...this.settings.paymentMethods].sort(
        (a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999),
      ),
    };
    return Promise.resolve();
  }

  reassignAndDeletePaymentMethod(fromMethodId: string, toMethodId?: string): Promise<void> {
    if (toMethodId) {
      this.transactions = this.transactions.map(t =>
        t.paymentMethodId === fromMethodId ? { ...t, paymentMethodId: toMethodId } : t,
      );
      this.recurringRules = this.recurringRules.map(r =>
        r.paymentMethodId === fromMethodId ? { ...r, paymentMethodId: toMethodId } : r,
      );
    }
    this.settings = {
      ...this.settings,
      paymentMethods: this.settings.paymentMethods.filter(m => m.id !== fromMethodId),
    };
    return Promise.resolve();
  }

  updateReferenceIncome(incomeCents: number): Promise<void> {
    this.settings = {
      ...this.settings,
      goals: {
        ...this.settings.goals,
        referenceMonthlyIncome: incomeCents,
      },
    };
    return Promise.resolve();
  }

  updateGoalsMode(mode: 'percentage' | 'currency'): Promise<void> {
    this.settings = {
      ...this.settings,
      goals: {
        ...this.settings.goals,
        mode,
      },
    };
    return Promise.resolve();
  }

  saveGoalCategories(categories: GoalCategory[], typeMappings: Record<string, string>): Promise<void> {
    this.settings = {
      ...this.settings,
      goals: {
        ...this.settings.goals,
        categories,
        typeMappings,
      },
    };
    return Promise.resolve();
  }

  updatePreferences(changes: {
    language?: SupportedLocale;
    currency?: SupportedCurrency;
    exchangeRate?: Partial<Settings['exchangeRate']>;
  }): Promise<void> {
    if (changes.exchangeRate) {
      this.settings = {
        ...this.settings,
        exchangeRate: {
          ...this.settings.exchangeRate,
          ...changes.exchangeRate,
        },
      };
    }
    return Promise.resolve();
  }

  resetSettings(seedMode: 'production' | 'development' = 'development'): Promise<WorkspaceSnapshot> {
    if (seedMode === 'production') {
      this.settings = structuredClone(PRODUCTION_DEFAULT_SETTINGS);
      this.transactions = [];
      this.recurringRules = [];
    } else {
      this.settings = structuredClone(DEV_DEFAULT_SETTINGS);
      this.transactions = [...SEEDED_TRANSACTIONS];
      this.recurringRules = [...SEEDED_RECURRING_RULES];
    }
    return this.loadWorkspace(90);
  }
}
