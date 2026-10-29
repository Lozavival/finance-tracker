import { toLocalDateString } from '@/data/dates';
import type { GoalCategory } from '@/data/goals';
import type { AccountConfig, PaymentMethodConfig, Settings, TransactionTypeConfig } from '@/data/settings';
import type { EditingTarget, Transaction, TransactionDraft } from '@/data/transactions';
import type { SupportedCurrency, SupportedLocale } from '@/i18n/types';
import { logger } from '@/lib/logger';
import {
  deserializeRecurringRule,
  deserializeSnapshot,
  deserializeTransaction,
  serializeAccount,
  serializeDraft,
  serializeEditingTarget,
  serializeTransaction,
  type SerializedRecurringRule,
  type SerializedTransaction,
  type SerializedWorkspaceSnapshot,
} from './serialization';
import type {
  FinanceRepository,
  SaveTransactionResult,
  TransactionQuery,
  TransactionSearchQuery,
  TransactionSearchResult,
  WorkspaceSnapshot,
} from './types';

export class HttpFinanceRepository implements FinanceRepository {
  private readonly logger = logger.child('HttpRepo');

  constructor(private readonly baseUrl = '/api') {}

  private async rpc<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
    const endTimer = this.logger.time(`RPC "${action}"`);
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/rpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
        keepalive: true,
      });
    } catch (err) {
      this.logger.error(`RPC "${action}" network request failed:`, err);
      throw err;
    }

    if (!res.ok) {
      let errBody: { error?: string } = {};
      try {
        errBody = (await res.json()) as { error?: string };
      } catch (parseErr) {
        this.logger.warn(`Failed to parse error response JSON for RPC "${action}":`, parseErr);
      }
      const errorMsg = errBody.error ?? `Repository RPC "${action}" failed (${res.status})`;
      this.logger.error(`RPC "${action}" rejected with status ${res.status}:`, errorMsg);
      throw new Error(errorMsg);
    }

    endTimer();
    return (await res.json()) as T;
  }

  async loadWorkspace(windowDays = 90): Promise<WorkspaceSnapshot> {
    const endTimer = this.logger.time(`loadWorkspace (windowDays=${windowDays})`);
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/workspace?windowDays=${encodeURIComponent(String(windowDays))}`);
    } catch (err) {
      this.logger.error('Failed to load workspace due to network error:', err);
      throw err;
    }

    if (!res.ok) {
      this.logger.error(`Failed to load workspace: HTTP ${res.status}`);
      throw new Error(`Failed to load workspace (${res.status})`);
    }

    const raw = (await res.json()) as SerializedWorkspaceSnapshot;
    const snapshot = deserializeSnapshot(raw);
    endTimer();
    this.logger.info(
      `Workspace snapshot loaded: ${snapshot.transactions.length} txs, ${snapshot.recurringRules.length} rules, ${snapshot.settings.accounts.length} accounts`,
    );
    return snapshot;
  }

  async fetchTransactions(query: TransactionQuery): Promise<Transaction[]> {
    const params = new URLSearchParams();
    if (query.fromDate) params.set('fromDate', toLocalDateString(query.fromDate));
    if (query.toDate) params.set('toDate', toLocalDateString(query.toDate));
    if (query.accountId) params.set('accountId', query.accountId);

    const qs = params.toString();
    const url = `${this.baseUrl}/transactions${qs ? `?${qs}` : ''}`;
    const endTimer = this.logger.time(`fetchTransactions (${qs || 'all'})`);

    let res: Response;
    try {
      res = await fetch(url);
    } catch (err) {
      this.logger.error('fetchTransactions network error:', err);
      throw err;
    }

    if (!res.ok) {
      this.logger.error(`fetchTransactions failed (${res.status})`);
      throw new Error(`Failed to fetch transactions (${res.status})`);
    }

    const data = (await res.json()) as { transactions: SerializedTransaction[] };
    endTimer();
    this.logger.debug(`fetchTransactions retrieved ${data.transactions.length} transactions`);
    return data.transactions.map(deserializeTransaction);
  }

  async searchTransactions(query: TransactionSearchQuery): Promise<TransactionSearchResult> {
    const params = new URLSearchParams();
    params.set('q', query.text);
    if (query.limit) params.set('limit', String(query.limit));

    const qs = params.toString();
    const res = await fetch(`${this.baseUrl}/transactions/search?${qs}`, {
      signal: query.signal,
    });
    if (!res.ok) {
      throw new Error(`Failed to search transactions (${res.status})`);
    }
    const data = (await res.json()) as { transactions: SerializedTransaction[]; totalCount: number };
    return {
      transactions: data.transactions.map(deserializeTransaction),
      totalCount: data.totalCount,
    };
  }

  async saveTransactionDraft(
    draft: TransactionDraft,
    editingTarget?: EditingTarget | null,
  ): Promise<SaveTransactionResult> {
    const data = await this.rpc<{
      transactions: SerializedTransaction[];
      recurringRules: SerializedRecurringRule[];
    }>('saveTransactionDraft', {
      draft: serializeDraft(draft),
      editingTarget: serializeEditingTarget(editingTarget),
    });

    return {
      transactions: data.transactions.map(deserializeTransaction),
      recurringRules: data.recurringRules.map(deserializeRecurringRule),
    };
  }

  async deleteTransactionTarget(
    target: Transaction,
    scope: 'only-this' | 'this-and-future' | 'all' = 'only-this',
  ): Promise<SaveTransactionResult> {
    const data = await this.rpc<{
      transactions: SerializedTransaction[];
      recurringRules: SerializedRecurringRule[];
    }>('deleteTransactionTarget', {
      target: serializeTransaction(target),
      scope,
    });

    return {
      transactions: data.transactions.map(deserializeTransaction),
      recurringRules: data.recurringRules.map(deserializeRecurringRule),
    };
  }

  async cancelRecurringRule(ruleId: string, effectiveDate: Date): Promise<SaveTransactionResult> {
    const data = await this.rpc<{
      transactions: SerializedTransaction[];
      recurringRules: SerializedRecurringRule[];
    }>('cancelRecurringRule', {
      ruleId,
      effectiveDate: toLocalDateString(effectiveDate),
    });

    return {
      transactions: data.transactions.map(deserializeTransaction),
      recurringRules: data.recurringRules.map(deserializeRecurringRule),
    };
  }

  async deleteRecurringRule(ruleId: string): Promise<SaveTransactionResult> {
    const data = await this.rpc<{
      transactions: SerializedTransaction[];
      recurringRules: SerializedRecurringRule[];
    }>('deleteRecurringRule', { ruleId });

    return {
      transactions: data.transactions.map(deserializeTransaction),
      recurringRules: data.recurringRules.map(deserializeRecurringRule),
    };
  }

  async createAccount(account: AccountConfig): Promise<void> {
    await this.rpc('createAccount', { account: serializeAccount(account) });
  }

  async updateAccount(id: string, changes: Partial<Omit<AccountConfig, 'id'>>): Promise<void> {
    const serializedChanges = {
      ...changes,
      ...(changes.openingDate ? { openingDate: toLocalDateString(changes.openingDate) } : {}),
    };
    await this.rpc('updateAccount', { id, changes: serializedChanges });
  }

  async archiveAccount(id: string, cancelRecurrences = false, effectiveDate?: Date): Promise<void> {
    await this.rpc('archiveAccount', {
      id,
      cancelRecurrences,
      ...(effectiveDate ? { effectiveDate: toLocalDateString(effectiveDate) } : {}),
    });
  }

  async restoreAccount(id: string): Promise<void> {
    await this.rpc('restoreAccount', { id });
  }

  async deleteAccount(id: string): Promise<void> {
    await this.rpc('deleteAccount', { id });
  }

  async createTransactionType(type: TransactionTypeConfig): Promise<void> {
    await this.rpc('createTransactionType', { type });
  }

  async updateTransactionType(id: string, changes: Partial<Omit<TransactionTypeConfig, 'id'>>): Promise<void> {
    await this.rpc('updateTransactionType', { id, changes });
  }

  async reorderTransactionTypes(direction: 'income' | 'expense', orderedIds: string[]): Promise<void> {
    await this.rpc('reorderTransactionTypes', { direction, orderedIds });
  }

  async reassignAndDeleteTransactionType(fromTypeId: string, toTypeId?: string): Promise<void> {
    await this.rpc('reassignAndDeleteTransactionType', { fromTypeId, toTypeId });
  }

  async createPaymentMethod(method: PaymentMethodConfig): Promise<void> {
    await this.rpc('createPaymentMethod', { method });
  }

  async updatePaymentMethod(id: string, changes: Partial<Omit<PaymentMethodConfig, 'id'>>): Promise<void> {
    await this.rpc('updatePaymentMethod', { id, changes });
  }

  async reorderPaymentMethods(orderedIds: string[]): Promise<void> {
    await this.rpc('reorderPaymentMethods', { orderedIds });
  }

  async reassignAndDeletePaymentMethod(fromMethodId: string, toMethodId?: string): Promise<void> {
    await this.rpc('reassignAndDeletePaymentMethod', { fromMethodId, toMethodId });
  }

  async updateReferenceIncome(incomeCents: number): Promise<void> {
    await this.rpc('updateReferenceIncome', { incomeCents });
  }

  async updateGoalsMode(mode: 'percentage' | 'currency'): Promise<void> {
    await this.rpc('updateGoalsMode', { mode });
  }

  async saveGoalCategories(categories: GoalCategory[], typeMappings: Record<string, string>): Promise<void> {
    await this.rpc('saveGoalCategories', { categories, typeMappings });
  }

  async updatePreferences(changes: {
    language?: SupportedLocale;
    currency?: SupportedCurrency;
    exchangeRate?: Partial<Settings['exchangeRate']>;
  }): Promise<void> {
    await this.rpc('updatePreferences', { changes });
  }

  async resetSettings(seedMode?: 'production' | 'development'): Promise<WorkspaceSnapshot> {
    const raw = await this.rpc<SerializedWorkspaceSnapshot>('resetSettings', { seedMode });
    return deserializeSnapshot(raw);
  }
}
