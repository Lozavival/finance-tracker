import type { Settings, AccountConfig, TransactionTypeConfig, PaymentMethodConfig } from '@/data/settings';
import type { Transaction, TransactionDraft, EditingTarget } from '@/data/transactions';
import type { RecurringRule } from '@/data/recurring';
import type { GoalCategory } from '@/data/goals';
import type { SupportedLocale, SupportedCurrency } from '@/i18n/types';

export interface WorkspaceSnapshot {
  settings: Settings;
  transactions: Transaction[];
  recurringRules: RecurringRule[];
  /**
   * Pre-aggregated net sum of transactions prior to `loadedFromDate`
   * keyed by `${accountId}:${currency}` (in integer cents).
   */
  historicalRollups: Record<string, number>;
  /**
   * Earliest date loaded in `transactions` (or null if all history is loaded).
   */
  loadedFromDate: Date | null;
}

export interface TransactionQuery {
  fromDate?: Date;
  toDate?: Date;
  accountId?: string;
}

export interface SaveTransactionResult {
  transactions: Transaction[];
  recurringRules: RecurringRule[];
}

export interface FinanceRepository {
  /**
   * Initial bootstrap: loads workspace settings, accounts, categories, payment methods,
   * goals, recurring rules, and recent + future transactions (e.g. last 90 days + future),
   * along with pre-window balance rollups per account pocket.
   */
  loadWorkspace(windowDays?: number): Promise<WorkspaceSnapshot>;

  /**
   * On-demand historical query for Transaction History / Account Detail when a user
   * selects a period older than `loadedFromDate` (e.g., "Up to today" or custom date range).
   */
  fetchTransactions(query: TransactionQuery): Promise<Transaction[]>;

  // Transactions & Recurring Rules
  saveTransactionDraft(draft: TransactionDraft, editingTarget?: EditingTarget | null): Promise<SaveTransactionResult>;
  deleteTransactionTarget(
    target: Transaction,
    scope?: 'only-this' | 'this-and-future' | 'all',
  ): Promise<SaveTransactionResult>;
  cancelRecurringRule(ruleId: string, effectiveDate: Date): Promise<SaveTransactionResult>;
  deleteRecurringRule(ruleId: string): Promise<SaveTransactionResult>;

  // Accounts
  createAccount(account: AccountConfig): Promise<void>;
  updateAccount(id: string, changes: Partial<Omit<AccountConfig, 'id'>>): Promise<void>;
  archiveAccount(id: string, cancelRecurrences?: boolean, effectiveDate?: Date): Promise<void>;
  restoreAccount(id: string): Promise<void>;
  deleteAccount(id: string): Promise<void>;

  // Categories (Transaction Types) & Atomic Reassignment
  createTransactionType(type: TransactionTypeConfig): Promise<void>;
  updateTransactionType(id: string, changes: Partial<Omit<TransactionTypeConfig, 'id'>>): Promise<void>;
  reorderTransactionTypes(direction: 'income' | 'expense', orderedIds: string[]): Promise<void>;
  reassignAndDeleteTransactionType(fromTypeId: string, toTypeId?: string): Promise<void>;

  // Payment Methods & Atomic Reassignment
  createPaymentMethod(method: PaymentMethodConfig): Promise<void>;
  updatePaymentMethod(id: string, changes: Partial<Omit<PaymentMethodConfig, 'id'>>): Promise<void>;
  reorderPaymentMethods(orderedIds: string[]): Promise<void>;
  reassignAndDeletePaymentMethod(fromMethodId: string, toMethodId?: string): Promise<void>;

  // Goals & Preferences
  updateReferenceIncome(incomeCents: number): Promise<void>;
  updateGoalsMode(mode: 'percentage' | 'currency'): Promise<void>;
  saveGoalCategories(categories: GoalCategory[], typeMappings: Record<string, string>): Promise<void>;
  updatePreferences(changes: {
    language?: SupportedLocale;
    currency?: SupportedCurrency;
    exchangeRate?: Partial<Settings['exchangeRate']>;
  }): Promise<void>;
  resetSettings(seedMode?: 'production' | 'development'): Promise<WorkspaceSnapshot>;
}
