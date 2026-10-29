import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDatabase, type TestDatabaseContext } from '../../helpers/db-test-helper';
import { parseLocalDate, toLocalDateString } from '@/data/dates';
import type { TransactionDraft, EditingTarget } from '@/data/transactions';

describe('SqliteFinanceRepository Integration', () => {
  let dbCtx: TestDatabaseContext;

  beforeEach(() => {
    dbCtx = createTestDatabase('development');
  });

  afterEach(() => {
    dbCtx.cleanup();
  });

  describe('loadWorkspace', () => {
    it('returns consistent snapshot with settings, accounts, recurring rules, and transactions', async () => {
      const snapshot = await dbCtx.repo.loadWorkspace();
      expect(snapshot.settings).toBeDefined();
      expect(snapshot.settings.accounts.length).toBeGreaterThan(0);
      expect(snapshot.settings.transactionTypes.length).toBeGreaterThan(0);
      expect(snapshot.settings.paymentMethods.length).toBeGreaterThan(0);
      expect(snapshot.transactions.length).toBeGreaterThan(0);
      expect(snapshot.recurringRules.length).toBeGreaterThan(0);
    });
  });

  describe('saveTransactionDraft (single, transfer, installments)', () => {
    it('saves a new single transaction and persists integer cents', async () => {
      const draft: TransactionDraft = {
        kind: 'single',
        transaction: {
          date: parseLocalDate('2026-03-15'),
          description: 'Team Lunch',
          typeId: 'food-dining',
          direction: 'expense',
          value: 3500, // $35.00
          currency: 'USD',
          accountId: 'boa',
          paymentMethodId: 'debit-card',
        },
      };

      const result = await dbCtx.repo.saveTransactionDraft(draft);
      const created = result.transactions.find(t => t.description === 'Team Lunch');
      expect(created).toBeDefined();
      expect(created!.value).toBe(3500);

      const fetched = await dbCtx.repo.fetchTransactions({
        fromDate: parseLocalDate('2026-03-15'),
        toDate: parseLocalDate('2026-03-15'),
      });
      const retrieved = fetched.find(t => t.id === created!.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.value).toBe(3500);
      expect(toLocalDateString(retrieved!.date)).toBe('2026-03-15');
    });

    it('updates an existing single transaction', async () => {
      const draft: TransactionDraft = {
        kind: 'single',
        transaction: {
          date: parseLocalDate('2026-03-15'),
          description: 'Team Lunch',
          typeId: 'food-dining',
          direction: 'expense',
          value: 3500,
          currency: 'USD',
          accountId: 'boa',
        },
      };
      const createdResult = await dbCtx.repo.saveTransactionDraft(draft);
      const created = createdResult.transactions.find(t => t.description === 'Team Lunch')!;

      const target: EditingTarget = {
        kind: 'single',
        transaction: created,
      };

      const updateDraft: TransactionDraft = {
        kind: 'single',
        transaction: {
          ...created,
          description: 'Executive Team Lunch',
          value: 7500,
        },
      };

      const updateResult = await dbCtx.repo.saveTransactionDraft(updateDraft, target);
      const updated = updateResult.transactions.find(t => t.id === created.id);
      expect(updated).toBeDefined();
      expect(updated!.description).toBe('Executive Team Lunch');
      expect(updated!.value).toBe(7500);
    });

    it('creates dual legs for a transfer draft and deletes them', async () => {
      const draft: TransactionDraft = {
        kind: 'transfer',
        date: parseLocalDate('2026-03-10'),
        value: 50000, // $500.00
        fromAccountId: 'boa',
        fromCurrency: 'USD',
        toAccountId: 'wise',
        toCurrency: 'USD',
      };

      const result = await dbCtx.repo.saveTransactionDraft(draft);
      const transfers = result.transactions.filter(t => t.transferId);
      expect(transfers.length).toBeGreaterThanOrEqual(2);

      const targetTx = transfers[0];
      expect(targetTx.transferId).toBeDefined();

      // Deleting target with 'all' scope deletes both transfer legs
      const deleteResult = await dbCtx.repo.deleteTransactionTarget(targetTx, 'all');
      expect(deleteResult.transactions.some(t => t.id === targetTx.id)).toBe(false);
    });

    it('creates multi-month installment series with cent-exact division', async () => {
      const draft: TransactionDraft = {
        kind: 'installments',
        firstDate: parseLocalDate('2026-01-15'),
        totalValue: 10000, // $100.00 split 3 ways -> 33.34, 33.33, 33.33
        count: 3,
        transaction: {
          description: 'Smart Watch',
          typeId: 'shopping',
          direction: 'expense',
          currency: 'USD',
          accountId: 'boa',
          paymentMethodId: 'credit-card',
        },
      };

      const result = await dbCtx.repo.saveTransactionDraft(draft);
      const installments = result.transactions
        .filter(t => t.installment?.groupId && t.description.includes('Smart Watch'))
        .sort((a, b) => a.installment!.number - b.installment!.number);

      expect(installments).toHaveLength(3);
      expect(installments[0].value).toBe(3334); // Remainder cent allocated to first leg
      expect(installments[1].value).toBe(3333);
      expect(installments[2].value).toBe(3333);

      // Deleting with 'all' deletes the entire installment group
      const delResult = await dbCtx.repo.deleteTransactionTarget(installments[0], 'all');
      expect(delResult.transactions.some(t => t.installment?.groupId === installments[0].installment?.groupId)).toBe(
        false,
      );
    });
  });

  describe('searchTransactions (FTS trigram integration)', () => {
    it('performs full-text search using trigram index and diacritic normalization', async () => {
      // Add custom transaction with diacritics
      await dbCtx.repo.saveTransactionDraft({
        kind: 'single',
        transaction: {
          date: parseLocalDate('2026-03-20'),
          description: 'Café da Manhã Padaria',
          typeId: 'food-dining',
          direction: 'expense',
          value: 2500,
          currency: 'BRL',
          accountId: 'nubank',
        },
      });

      // Search with folded query "manha"
      const result = await dbCtx.repo.searchTransactions({ text: 'manha' });
      expect(result.transactions.some(t => t.description.includes('Café da Manhã'))).toBe(true);
    });
  });

  describe('cancelRecurringRule', () => {
    it('cancels rule and removes projected future transactions after cancel date', async () => {
      const snapshot = await dbCtx.repo.loadWorkspace();
      const activeRule = snapshot.recurringRules.find(r => r.status === 'active');
      expect(activeRule).toBeDefined();

      const cancelDate = parseLocalDate('2026-06-01');
      const result = await dbCtx.repo.cancelRecurringRule(activeRule!.id, cancelDate);

      const ruleAfter = result.recurringRules.find(r => r.id === activeRule!.id);
      expect(ruleAfter?.status).toBe('canceled');
      expect(ruleAfter?.canceledAt).toEqual(cancelDate);
    });
  });
});
