import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDatabase, type TestDatabaseContext } from '../../helpers/db-test-helper';

describe('SQLite FTS5 Trigram Triggers & Synchronization', () => {
  let dbCtx: TestDatabaseContext;

  beforeEach(() => {
    dbCtx = createTestDatabase('production');
    // Ensure an account exists in the clean production database
    dbCtx.conn.sqlite
      .prepare(
        `INSERT INTO accounts (id, workspace_id, name, kind, initials, color, opening_date, created_at)
         VALUES ('prod-test-acc', 'default', 'Production Test Account', 'Checking', 'PT', 'cyan', '2026-01-01', '2026-01-01')`,
      )
      .run();
  });

  afterEach(() => {
    dbCtx.cleanup();
  });

  it('automatically synchronizes inserted transactions to transactions_fts with diacritic-insensitive matching', () => {
    const sqlite = dbCtx.conn.sqlite;

    sqlite
      .prepare(
        `INSERT INTO transactions (id, workspace_id, date, description, type_id, direction, amount_cents, currency, account_id, created_at)
         VALUES ('tx-fts-1', 'default', '2026-03-01', 'Café & Pão Francês', 'shopping', 'expense', 1200, 'BRL', 'prod-test-acc', '2026-03-01')`,
      )
      .run();

    // Query transactions_fts using diacritic-free trigram match
    const matchPao = sqlite
      .prepare(
        `SELECT t.id, t.description
         FROM transactions t
         JOIN transactions_fts fts ON t.rowid = fts.rowid
         WHERE transactions_fts MATCH '"pao"'`,
      )
      .all() as Array<{ id: string; description: string }>;

    expect(matchPao).toHaveLength(1);
    expect(matchPao[0].id).toBe('tx-fts-1');
    expect(matchPao[0].description).toBe('Café & Pão Francês');

    const matchCafe = sqlite
      .prepare(
        `SELECT t.id
         FROM transactions t
         JOIN transactions_fts fts ON t.rowid = fts.rowid
         WHERE transactions_fts MATCH '"cafe"'`,
      )
      .all() as Array<{ id: string }>;

    expect(matchCafe).toHaveLength(1);
    expect(matchCafe[0].id).toBe('tx-fts-1');
  });

  it('automatically updates transactions_fts when transaction description is updated', () => {
    const sqlite = dbCtx.conn.sqlite;

    sqlite
      .prepare(
        `INSERT INTO transactions (id, workspace_id, date, description, type_id, direction, amount_cents, currency, account_id, created_at)
         VALUES ('tx-fts-update', 'default', '2026-03-01', 'Supermarket Grocery Run', 'shopping', 'expense', 4500, 'USD', 'prod-test-acc', '2026-03-01')`,
      )
      .run();

    // Verify initial match
    const beforeMatch = sqlite
      .prepare(
        `SELECT t.id FROM transactions t JOIN transactions_fts fts ON t.rowid = fts.rowid WHERE transactions_fts MATCH '"grocery"'`,
      )
      .all();
    expect(beforeMatch).toHaveLength(1);

    // Update description to Electronics
    sqlite
      .prepare(`UPDATE transactions SET description = 'Electronics and Gadgets Store' WHERE id = 'tx-fts-update'`)
      .run();

    // Old description should no longer match
    const oldMatch = sqlite
      .prepare(
        `SELECT t.id FROM transactions t JOIN transactions_fts fts ON t.rowid = fts.rowid WHERE transactions_fts MATCH '"grocery"'`,
      )
      .all();
    expect(oldMatch).toHaveLength(0);

    // New description matches
    const newMatch = sqlite
      .prepare(
        `SELECT t.id FROM transactions t JOIN transactions_fts fts ON t.rowid = fts.rowid WHERE transactions_fts MATCH '"gadget"'`,
      )
      .all();
    expect(newMatch).toHaveLength(1);
  });

  it('automatically purges transactions_fts entries when transactions are deleted', () => {
    const sqlite = dbCtx.conn.sqlite;

    sqlite
      .prepare(
        `INSERT INTO transactions (id, workspace_id, date, description, type_id, direction, amount_cents, currency, account_id, created_at)
         VALUES ('tx-fts-del', 'default', '2026-03-01', 'UniqueBookStorePurchase', 'shopping', 'expense', 2500, 'USD', 'prod-test-acc', '2026-03-01')`,
      )
      .run();

    const beforeDel = sqlite
      .prepare(
        `SELECT t.id FROM transactions t JOIN transactions_fts fts ON t.rowid = fts.rowid WHERE transactions_fts MATCH '"bookstore"'`,
      )
      .all();
    expect(beforeDel).toHaveLength(1);

    // Delete transaction
    sqlite.prepare(`DELETE FROM transactions WHERE id = 'tx-fts-del'`).run();

    // Verify FTS table no longer matches
    const afterDel = sqlite
      .prepare(
        `SELECT t.id FROM transactions t JOIN transactions_fts fts ON t.rowid = fts.rowid WHERE transactions_fts MATCH '"bookstore"'`,
      )
      .all();
    expect(afterDel).toHaveLength(0);
  });
});
