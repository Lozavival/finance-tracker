import { describe, it, expect } from 'vitest';
import {
  serializeAccount,
  deserializeAccount,
  serializeTransaction,
  deserializeTransaction,
  serializeRecurringRule,
  deserializeRecurringRule,
  serializeSnapshot,
  deserializeSnapshot,
  serializeDraft,
  deserializeDraft,
  serializeEditingTarget,
  deserializeEditingTarget,
} from '@/data/repository/serialization';
import { parseLocalDate } from '@/data/dates';
import { createTestSettings, createTestSnapshot } from '../../fixtures/test-workspace';
import type { AccountConfig } from '@/data/settings';
import type { Transaction, TransactionDraft, EditingTarget } from '@/data/transactions';
import type { RecurringRule } from '@/data/recurring';

describe('Data Serialization & Deserialization Engine', () => {
  it('round-trips AccountConfig preserving dates and properties', () => {
    const account: AccountConfig = {
      id: 'acc-1',
      name: 'Checking',
      kind: 'Checking',
      currencies: ['USD'],
      openingBalances: { USD: 50000 },
      openingDate: parseLocalDate('2026-01-15'),
      initials: 'CK',
      color: 'cyan',
    };

    const serialized = serializeAccount(account);
    expect(serialized.openingDate).toBe('2026-01-15');

    const deserialized = deserializeAccount(serialized);
    expect(deserialized).toEqual(account);
  });

  it('round-trips Transaction preserving dates and properties', () => {
    const tx: Transaction = {
      id: 'tx-1',
      date: parseLocalDate('2026-03-20'),
      description: 'Coffee',
      typeId: 'food-dining',
      direction: 'expense',
      value: 450,
      currency: 'USD',
      accountId: 'acc-1',
    };

    const serialized = serializeTransaction(tx);
    expect(serialized.date).toBe('2026-03-20');

    const deserialized = deserializeTransaction(serialized);
    expect(deserialized).toEqual(tx);
  });

  it('round-trips RecurringRule preserving all date fields', () => {
    const rule: RecurringRule = {
      id: 'rule-1',
      startDate: parseLocalDate('2026-01-01'),
      createdAt: parseLocalDate('2025-12-20'),
      canceledAt: parseLocalDate('2026-06-01'),
      frequency: 'monthly',
      limit: { kind: 'count', count: 12 },
      template: {
        description: 'Gym',
        typeId: 'entertainment',
        direction: 'expense',
        value: 5000,
        currency: 'USD',
        accountId: 'acc-1',
      },
    };

    const serialized = serializeRecurringRule(rule);
    expect(serialized.startDate).toBe('2026-01-01');
    expect(serialized.createdAt).toBe('2025-12-20');
    expect(serialized.canceledAt).toBe('2026-06-01');

    const deserialized = deserializeRecurringRule(serialized);
    expect(deserialized).toEqual(rule);
  });

  it('round-trips WorkspaceSnapshot', () => {
    const snapshot = createTestSnapshot({
      loadedFromDate: parseLocalDate('2026-01-01'),
    });

    const serialized = serializeSnapshot(snapshot);
    expect(serialized.loadedFromDate).toBe('2026-01-01');

    const deserialized = deserializeSnapshot(serialized);
    expect(deserialized.loadedFromDate).toEqual(parseLocalDate('2026-01-01'));
    expect(deserialized.transactions).toHaveLength(snapshot.transactions.length);
    expect(deserialized.settings.accounts).toHaveLength(snapshot.settings.accounts.length);
  });

  it('round-trips TransactionDraft variants (single, transfer, installments, recurring)', () => {
    const singleDraft: TransactionDraft = {
      kind: 'single',
      transaction: {
        date: parseLocalDate('2026-03-10'),
        description: 'Dinner',
        typeId: 'food-dining',
        direction: 'expense',
        value: 5000,
        currency: 'USD',
        accountId: 'acc-1',
      },
    };
    expect(deserializeDraft(serializeDraft(singleDraft))).toEqual(singleDraft);

    const transferDraft: TransactionDraft = {
      kind: 'transfer',
      date: parseLocalDate('2026-03-11'),
      value: 10000,
      fromAccountId: 'acc-1',
      fromCurrency: 'USD',
      toAccountId: 'acc-2',
      toCurrency: 'USD',
    };
    expect(deserializeDraft(serializeDraft(transferDraft))).toEqual(transferDraft);

    const installmentDraft: TransactionDraft = {
      kind: 'installments',
      firstDate: parseLocalDate('2026-04-01'),
      totalValue: 30000,
      count: 3,
      transaction: {
        description: 'Headphones',
        typeId: 'shopping',
        direction: 'expense',
        currency: 'USD',
        accountId: 'acc-1',
      },
    };
    expect(deserializeDraft(serializeDraft(installmentDraft))).toEqual(installmentDraft);

    const recurringDraft: TransactionDraft = {
      kind: 'recurring',
      startDate: parseLocalDate('2026-05-01'),
      value: 1500,
      frequency: 'monthly',
      limit: { kind: 'infinite' },
      transaction: {
        description: 'iCloud',
        typeId: 'bills',
        direction: 'expense',
        currency: 'USD',
        accountId: 'acc-1',
      },
    };
    expect(deserializeDraft(serializeDraft(recurringDraft))).toEqual(recurringDraft);
  });

  it('round-trips EditingTarget variants and handles null', () => {
    expect(serializeEditingTarget(null)).toBeNull();
    expect(deserializeEditingTarget(null)).toBeNull();

    const tx: Transaction = {
      id: 'tx-1',
      date: parseLocalDate('2026-03-10'),
      description: 'Single',
      typeId: 'food-dining',
      direction: 'expense',
      value: 1000,
      currency: 'USD',
      accountId: 'acc-1',
    };

    const singleTarget: EditingTarget = { kind: 'single', transaction: tx };
    expect(deserializeEditingTarget(serializeEditingTarget(singleTarget))).toEqual(singleTarget);
  });
});

