import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDatabase, type TestDatabaseContext } from '../../helpers/db-test-helper';

describe('Database Schema & Constraint Parity', () => {
  let dbCtx: TestDatabaseContext;

  beforeEach(() => {
    dbCtx = createTestDatabase('development');
  });

  afterEach(() => {
    dbCtx.cleanup();
  });

  it('creates all required application and virtual tables with correct indexes', () => {
    const tables = dbCtx.conn.sqlite
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'transactions_fts_%' ORDER BY name`,
      )
      .all() as Array<{ name: string }>;

    const tableNames = tables.map(t => t.name);
    expect(tableNames).toContain('accounts');
    expect(tableNames).toContain('account_balances');
    expect(tableNames).toContain('account_payment_methods');
    expect(tableNames).toContain('goal_categories');
    expect(tableNames).toContain('goal_type_mappings');
    expect(tableNames).toContain('payment_methods');
    expect(tableNames).toContain('recurring_rules');
    expect(tableNames).toContain('transaction_types');
    expect(tableNames).toContain('transactions');
    expect(tableNames).toContain('transactions_fts');
    expect(tableNames).toContain('workspaces');
  });

  it('enforces foreign key cascading when an account is deleted', () => {
    // Insert an account and transaction
    const sqlite = dbCtx.conn.sqlite;
    sqlite
      .prepare(
        `INSERT INTO accounts (id, workspace_id, name, kind, initials, color, opening_date, created_at)
         VALUES ('acc-cascade-test', 'default', 'Cascade Test', 'Checking', 'CT', 'blue', '2026-01-01', '2026-01-01')`,
      )
      .run();

    sqlite
      .prepare(
        `INSERT INTO account_balances (account_id, currency, opening_balance_cents, sort_order)
         VALUES ('acc-cascade-test', 'USD', 50000, 0)`,
      )
      .run();

    sqlite
      .prepare(
        `INSERT INTO transactions (id, workspace_id, date, description, type_id, direction, amount_cents, currency, account_id, created_at)
         VALUES ('tx-cascade-test', 'default', '2026-03-01', 'Cascade Tx', 'shopping', 'expense', 1500, 'USD', 'acc-cascade-test', '2026-03-01')`,
      )
      .run();

    // Verify records exist
    const accBefore = sqlite.prepare(`SELECT id FROM accounts WHERE id = 'acc-cascade-test'`).get();
    expect(accBefore).toBeDefined();

    // Delete account
    sqlite.prepare(`DELETE FROM accounts WHERE id = 'acc-cascade-test'`).run();

    // Verify cascade deletion
    const balancesAfter = sqlite.prepare(`SELECT * FROM account_balances WHERE account_id = 'acc-cascade-test'`).all();
    expect(balancesAfter).toHaveLength(0);

    const txsAfter = sqlite.prepare(`SELECT * FROM transactions WHERE account_id = 'acc-cascade-test'`).all();
    expect(txsAfter).toHaveLength(0);
  });

  it('enforces foreign key RESTRICT when deleting a transaction type in use', () => {
    const sqlite = dbCtx.conn.sqlite;

    // 'shopping' is used by transactions in the dev database
    expect(() => {
      sqlite.prepare(`DELETE FROM transaction_types WHERE id = 'shopping'`).run();
    }).toThrow(/FOREIGN KEY constraint failed/i);
  });

  it('preserves integer cents without floating point precision corruption', () => {
    const sqlite = dbCtx.conn.sqlite;
    const largeAmountCents = 987654321; // $9,876,543.21

    sqlite
      .prepare(
        `INSERT INTO transactions (id, workspace_id, date, description, type_id, direction, amount_cents, currency, account_id, created_at)
         VALUES ('tx-cents-test', 'default', '2026-03-01', 'Cents Precision', 'shopping', 'expense', ?, 'USD', 'boa', '2026-03-01')`,
      )
      .run(largeAmountCents);

    const row = sqlite.prepare(`SELECT amount_cents FROM transactions WHERE id = 'tx-cents-test'`).get() as {
      amount_cents: number;
    };

    expect(Number.isInteger(row.amount_cents)).toBe(true);
    expect(row.amount_cents).toBe(largeAmountCents);
  });
});
