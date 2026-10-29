import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDatabase, type TestDatabaseContext } from '../../helpers/db-test-helper';
import { seedWorkspaceIfNeeded, resetAndSeedWorkspace } from '@/../../src/db/seedDatabase';
import * as schema from '@/../../src/db/schema';
import { eq } from 'drizzle-orm';

describe('Database Seeding Engine (Isolated Dev & Prod)', () => {
  let devCtx: TestDatabaseContext;
  let prodCtx: TestDatabaseContext;

  beforeEach(() => {
    devCtx = createTestDatabase('development');
    prodCtx = createTestDatabase('production');
  });

  afterEach(() => {
    devCtx.cleanup();
    prodCtx.cleanup();
  });

  it('seeds development database with mock accounts, transactions, and rules', () => {
    const devTxs = devCtx.conn.db.select().from(schema.transactions).all();
    expect(devTxs.length).toBeGreaterThan(0);

    const devRules = devCtx.conn.db.select().from(schema.recurringRules).all();
    expect(devRules.length).toBeGreaterThan(0);

    const devAccounts = devCtx.conn.db.select().from(schema.accounts).all();
    expect(devAccounts.length).toBeGreaterThan(0);
  });

  it('seeds production database with zero transactions, zero rules, and clean defaults', () => {
    const prodTxs = prodCtx.conn.db.select().from(schema.transactions).all();
    expect(prodTxs).toHaveLength(0);

    const prodRules = prodCtx.conn.db.select().from(schema.recurringRules).all();
    expect(prodRules).toHaveLength(0);

    // Production accounts start with zero user accounts (or minimal defaults)
    const prodAccounts = prodCtx.conn.db.select().from(schema.accounts).all();
    expect(prodAccounts.length).toBeLessThanOrEqual(devCtx.conn.db.select().from(schema.accounts).all().length);

    // Production goals start with empty categories
    const prodGoals = prodCtx.conn.db.select().from(schema.goalCategories).all();
    expect(prodGoals).toHaveLength(0);
  });

  it('guarantees idempotency: seedWorkspaceIfNeeded skips when workspace already exists', () => {
    const seededAgain = seedWorkspaceIfNeeded(devCtx.conn, 'development', 'default');
    expect(seededAgain).toBe(false);
  });

  it('resets and reseeds workspace atomically', () => {
    // Add custom transaction to dev DB
    devCtx.conn.db
      .insert(schema.transactions)
      .values({
        id: 'tx-temporary',
        workspaceId: 'default',
        date: '2026-03-01',
        description: 'Temporary Tx',
        typeId: 'shopping',
        direction: 'expense',
        amountCents: 500,
        currency: 'USD',
        accountId: 'boa',
        createdAt: '2026-03-01',
      })
      .run();

    const beforeReset = devCtx.conn.db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.id, 'tx-temporary'))
      .get();
    expect(beforeReset).toBeDefined();

    // Reset and reseed
    resetAndSeedWorkspace(devCtx.conn, 'development', 'default');

    const afterReset = devCtx.conn.db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.id, 'tx-temporary'))
      .get();
    expect(afterReset).toBeUndefined();
  });
});

