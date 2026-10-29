import fs from 'fs';
import path from 'path';
import Database, { type Database as SqliteDatabase } from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { foldText } from '../app/data/search';
import type { ServerLogger } from '../server/logger';

export type DrizzleDb = BetterSQLite3Database<typeof schema>;

export interface DatabaseConnection {
  sqlite: SqliteDatabase;
  db: DrizzleDb;
}

const SCHEMA_DDL = `
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY NOT NULL,
  language TEXT NOT NULL DEFAULT 'en-US',
  default_currency TEXT NOT NULL DEFAULT 'USD',
  exchange_rate REAL,
  exchange_rate_updated_at TEXT,
  exchange_rate_source TEXT NOT NULL DEFAULT 'none',
  goals_reference_income_cents INTEGER NOT NULL DEFAULT 100000000,
  goals_mode TEXT NOT NULL DEFAULT 'percentage',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  initials TEXT NOT NULL,
  color TEXT NOT NULL,
  opening_date TEXT NOT NULL,
  archived INTEGER NOT NULL DEFAULT 0,
  system INTEGER NOT NULL DEFAULT 0,
  card_name TEXT,
  card_limit_cents INTEGER,
  card_closing_day INTEGER,
  card_due_day INTEGER,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_accounts_workspace ON accounts(workspace_id);

CREATE TABLE IF NOT EXISTS account_balances (
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  currency TEXT NOT NULL,
  opening_balance_cents INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (account_id, currency)
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  system_tag TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_payment_methods_workspace ON payment_methods(workspace_id);

CREATE TABLE IF NOT EXISTS account_payment_methods (
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  payment_method_id TEXT NOT NULL REFERENCES payment_methods(id) ON DELETE CASCADE,
  PRIMARY KEY (account_id, payment_method_id)
);

CREATE TABLE IF NOT EXISTS transaction_types (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  direction TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  system_tag TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_transaction_types_workspace ON transaction_types(workspace_id, direction, sort_order);

CREATE TABLE IF NOT EXISTS goal_categories (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  percentage REAL NOT NULL,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_goal_categories_workspace ON goal_categories(workspace_id, sort_order);

CREATE TABLE IF NOT EXISTS goal_type_mappings (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  transaction_type_id TEXT NOT NULL REFERENCES transaction_types(id) ON DELETE CASCADE,
  goal_category_id TEXT NOT NULL REFERENCES goal_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (workspace_id, transaction_type_id)
);

CREATE TABLE IF NOT EXISTS recurring_rules (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  direction TEXT NOT NULL,
  type_id TEXT NOT NULL REFERENCES transaction_types(id) ON DELETE RESTRICT,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  payment_method_id TEXT REFERENCES payment_methods(id) ON DELETE RESTRICT,
  start_date TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  limit_kind TEXT NOT NULL,
  limit_count INTEGER,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  canceled_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_recurring_rules_workspace ON recurring_rules(workspace_id, account_id);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  type_id TEXT NOT NULL REFERENCES transaction_types(id) ON DELETE RESTRICT,
  direction TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  payment_method_id TEXT REFERENCES payment_methods(id) ON DELETE RESTRICT,
  transfer_id TEXT,
  installment_group_id TEXT,
  installment_number INTEGER,
  installment_total INTEGER,
  recurring_rule_id TEXT REFERENCES recurring_rules(id) ON DELETE SET NULL,
  recurring_index INTEGER,
  recurring_total INTEGER,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tx_workspace_date ON transactions(workspace_id, date);
CREATE INDEX IF NOT EXISTS idx_tx_account_date ON transactions(account_id, date);
CREATE INDEX IF NOT EXISTS idx_tx_type ON transactions(type_id);
CREATE INDEX IF NOT EXISTS idx_tx_payment_method ON transactions(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_tx_transfer_group ON transactions(transfer_id);
CREATE INDEX IF NOT EXISTS idx_tx_installment_group ON transactions(installment_group_id);
CREATE INDEX IF NOT EXISTS idx_tx_recurring_rule ON transactions(recurring_rule_id);

CREATE VIRTUAL TABLE IF NOT EXISTS transactions_fts USING fts5(
  description,
  tokenize = 'trigram remove_diacritics 2'
);

CREATE TRIGGER IF NOT EXISTS trg_tx_fts_insert AFTER INSERT ON transactions BEGIN
  INSERT INTO transactions_fts(rowid, description) VALUES (new.rowid, new.description);
END;

CREATE TRIGGER IF NOT EXISTS trg_tx_fts_delete AFTER DELETE ON transactions BEGIN
  DELETE FROM transactions_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER IF NOT EXISTS trg_tx_fts_update AFTER UPDATE OF description ON transactions BEGIN
  UPDATE transactions_fts SET description = new.description WHERE rowid = old.rowid;
END;
`;

export function createDatabaseConnection(dbPath?: string, logger?: ServerLogger): DatabaseConnection {
  const resolvedPath = dbPath ?? process.env.DATABASE_PATH ?? path.resolve(process.cwd(), 'data', 'finance-tracker.db');
  const dbLogger = logger?.child('db');

  dbLogger?.info(`Initializing SQLite database connection at "${resolvedPath}"`);

  if (resolvedPath !== ':memory:') {
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      dbLogger?.debug(`Creating database directory "${dir}"`);
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const sqlite = new Database(resolvedPath);
  if (resolvedPath !== ':memory:') {
    sqlite.pragma('journal_mode = WAL');
    dbLogger?.debug('Enabled WAL journal mode');
  }
  sqlite.pragma('foreign_keys = ON');
  dbLogger?.debug('Enabled foreign keys constraint verification');
  try {
    sqlite.exec(SCHEMA_DDL);
    dbLogger?.debug('Applied schema DDL successfully');
  } catch (ddlErr) {
    dbLogger?.error('Failed to apply database schema DDL:', ddlErr);
    throw ddlErr;
  }

  // Register deterministic `fold` function for accent & case insensitive queries on short tokens
  sqlite.function('fold', { deterministic: true }, (v: unknown) => (typeof v === 'string' ? foldText(v) : v));

  // Backfill for pre-existing databases and sync rowid indexing
  const endFtsTimer = dbLogger?.time('FTS5 transactions_fts backfill');
  sqlite.transaction(() => {
    sqlite.exec(`
      DELETE FROM transactions_fts;
      INSERT INTO transactions_fts(rowid, description) SELECT rowid, description FROM transactions;
    `);
  })();
  endFtsTimer?.();
  const ftsCount = sqlite.prepare('SELECT COUNT(*) as count FROM transactions_fts').get() as { count: number };
  dbLogger?.info(`FTS5 index synchronized with ${ftsCount.count} indexed records`);

  const db = drizzle(sqlite, { schema });
  return { sqlite, db };
}
