import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDatabase, type TestDatabaseContext } from '../../helpers/db-test-helper';
import { InMemoryFinanceRepository } from '@/data/repository/inMemoryRepository';
import type { FinanceRepository } from '@/data/repository/types';
import { parseLocalDate } from '@/data/dates';
import type { AccountConfig } from '@/data/settings';
import type { TransactionDraft } from '@/data/transactions';

describe('FinanceRepository Contract Parity (InMemory vs SQLite)', () => {
  let dbCtx: TestDatabaseContext;
  let sqliteRepo: FinanceRepository;
  let memoryRepo: FinanceRepository;

  const testAccount: AccountConfig = {
    id: 'contract-card',
    name: 'Contract Card',
    kind: 'Checking',
    currencies: ['USD'],
    openingDate: parseLocalDate('2026-01-01'),
    initials: 'CC',
    color: 'cyan',
    card: {
      name: 'Credit Card',
      closingDay: 15,
      dueDay: 25,
      limit: 500000,
    },
  };

  const testChecking: AccountConfig = {
    id: 'contract-chk',
    name: 'Contract Checking',
    kind: 'Checking',
    currencies: ['USD'],
    openingDate: parseLocalDate('2026-01-01'),
    initials: 'CK',
    color: 'emerald',
  };

  beforeEach(async () => {
    dbCtx = createTestDatabase('production');
    sqliteRepo = dbCtx.repo;
    memoryRepo = new InMemoryFinanceRepository('production');

    // Create accounts in both
    await sqliteRepo.createAccount(testAccount);
    await sqliteRepo.createAccount(testChecking);

    await memoryRepo.createAccount(testAccount);
    await memoryRepo.createAccount(testChecking);
  });

  afterEach(() => {
    dbCtx.cleanup();
  });

  it('both repositories persist single transactions identically', async () => {
    const draft: TransactionDraft = {
      kind: 'single',
      transaction: {
        date: parseLocalDate('2026-03-15'),
        description: 'Parity Lunch',
        typeId: 'food-dining',
        direction: 'expense',
        value: 1850,
        currency: 'USD',
        accountId: 'contract-chk',
      },
    };

    const resSqlite = await sqliteRepo.saveTransactionDraft(draft);
    const resMemory = await memoryRepo.saveTransactionDraft(draft);

    expect(resSqlite.transactions).toHaveLength(1);
    expect(resMemory.transactions).toHaveLength(1);

    const txSqlite = resSqlite.transactions[0];
    const txMemory = resMemory.transactions[0];

    expect(txSqlite.description).toBe(txMemory.description);
    expect(txSqlite.value).toBe(txMemory.value);
    expect(txSqlite.direction).toBe(txMemory.direction);
    expect(txSqlite.currency).toBe(txMemory.currency);
  });

  it('both repositories split installments with identical cent-rounding', async () => {
    const draft: TransactionDraft = {
      kind: 'installments',
      firstDate: parseLocalDate('2026-02-10'),
      totalValue: 10000, // 100.00 split 3 ways -> 33.34, 33.33, 33.33
      count: 3,
      transaction: {
        description: 'New Monitor',
        typeId: 'shopping',
        direction: 'expense',
        currency: 'USD',
        accountId: 'contract-card',
        paymentMethodId: 'credit-card',
      },
    };

    const resSqlite = await sqliteRepo.saveTransactionDraft(draft);
    const resMemory = await memoryRepo.saveTransactionDraft(draft);

    const instSqlite = resSqlite.transactions.sort((a, b) => a.installment!.number - b.installment!.number);
    const instMemory = resMemory.transactions.sort((a, b) => a.installment!.number - b.installment!.number);

    expect(instSqlite).toHaveLength(3);
    expect(instMemory).toHaveLength(3);

    for (let i = 0; i < 3; i++) {
      expect(instSqlite[i].value).toBe(instMemory[i].value);
      expect(instSqlite[i].installment?.number).toBe(instMemory[i].installment?.number);
      expect(instSqlite[i].installment?.total).toBe(instMemory[i].installment?.total);
    }
  });

  it('both repositories delete transactions and update snapshot accordingly', async () => {
    const draft: TransactionDraft = {
      kind: 'single',
      transaction: {
        date: parseLocalDate('2026-03-01'),
        description: 'To Delete',
        typeId: 'food-dining',
        direction: 'expense',
        value: 500,
        currency: 'USD',
        accountId: 'contract-chk',
      },
    };

    const resSqlite = await sqliteRepo.saveTransactionDraft(draft);
    const resMemory = await memoryRepo.saveTransactionDraft(draft);

    const txSqlite = resSqlite.transactions[0];
    const txMemory = resMemory.transactions[0];

    const delSqlite = await sqliteRepo.deleteTransactionTarget(txSqlite, 'only-this');
    const delMemory = await memoryRepo.deleteTransactionTarget(txMemory, 'only-this');

    expect(delSqlite.transactions.some(t => t.id === txSqlite.id)).toBe(false);
    expect(delMemory.transactions.some(t => t.id === txMemory.id)).toBe(false);
  });
});

