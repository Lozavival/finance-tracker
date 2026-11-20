# Data Model & Database Schema

This document defines the relational SQLite database schema, entity relationships, foreign key constraints, indexing strategy, full-text search virtual table triggers, and windowed balance rollup mechanics for the Finance Tracker application.

## Storage Engine & Runtime Isolation

The persistence layer is built on **SQLite** via native [`better-sqlite3`](../src/db/client.ts) bindings and typed with [**Drizzle ORM**](../src/db/schema.ts):

- **Journal & Integrity Mode**: File-backed connections enable Write-Ahead Logging (`PRAGMA journal_mode = WAL`) and enforce relational integrity (`PRAGMA foreign_keys = ON`) on every connection initialization.
- **Environment Database Split**:
    - **Development (`SeedMode = 'development'`)**: Persists to `data/finance-tracker.dev.db` (overridable via `DEV_DATABASE_PATH` or `DATABASE_PATH`), seeded with demo accounts, transactions, and recurring rules ([seedDatabase.ts](../src/db/seedDatabase.ts)). If `data/finance-tracker.dev.db` does not exist on startup but legacy `data/finance-tracker.db` is present, the connection checkpoints (`PRAGMA wal_checkpoint(TRUNCATE)`) and copies the legacy file.
    - **Production (`SeedMode = 'production'`)**: Persists to `data/finance-tracker.prod.db` (or `userData/data/finance-tracker.prod.db` in packaged Electron builds, overridable via `PROD_DATABASE_PATH` or `DATABASE_PATH`), seeded with minimal production defaults and empty budget goals (`EMPTY_GOALS_CONFIG`).
- **Monetary & Date Representation**:
    - All monetary columns (`*_cents`) are stored as **64-bit signed integers (`INTEGER`)** representing exact cents (`$1.00 = 100`).
    - All calendar date columns (`date`, `opening_date`, `start_date`, `created_at`, `canceled_at`) are stored as timezone-neutral **`YYYY-MM-DD` strings (`TEXT`)**, while audit timestamps (`updated_at`, `exchange_rate_updated_at`, and transaction/account `created_at`) use ISO-8601 strings.

---

## Entity-Relationship Diagram

```mermaid
erDiagram
    workspaces ||--o{ accounts : "CASCADE"
    workspaces ||--o{ payment_methods : "CASCADE"
    workspaces ||--o{ transaction_types : "CASCADE"
    workspaces ||--o{ goal_categories : "CASCADE"
    workspaces ||--o{ goal_type_mappings : "CASCADE"
    workspaces ||--o{ recurring_rules : "CASCADE"
    workspaces ||--o{ transactions : "CASCADE"

    accounts ||--o{ account_balances : "CASCADE"
    accounts ||--o{ account_payment_methods : "CASCADE"
    accounts ||--o{ recurring_rules : "CASCADE"
    accounts ||--o{ transactions : "CASCADE"

    payment_methods ||--o{ account_payment_methods : "CASCADE"
    payment_methods ||--o{ recurring_rules : "RESTRICT"
    payment_methods ||--o{ transactions : "RESTRICT"

    transaction_types ||--o{ goal_type_mappings : "CASCADE"
    transaction_types ||--o{ recurring_rules : "RESTRICT"
    transaction_types ||--o{ transactions : "RESTRICT"

    goal_categories ||--o{ goal_type_mappings : "CASCADE"

    recurring_rules ||--o{ transactions : "SET NULL"

    workspaces {
        TEXT id PK "e.g. 'default'"
        TEXT language "'en-US' | 'pt-BR'"
        TEXT default_currency "'USD' | 'BRL'"
        REAL exchange_rate "nullable USD/BRL rate"
        TEXT exchange_rate_updated_at "nullable ISO timestamp"
        TEXT exchange_rate_source "'api' | 'manual' | 'none'"
        INTEGER goals_reference_income_cents "integer cents"
        TEXT goals_mode "'percentage' | 'currency'"
        TEXT updated_at "ISO timestamp"
    }

    accounts {
        TEXT id PK
        TEXT workspace_id FK
        TEXT name
        TEXT kind "'Checking' | 'Savings' | 'Investment' | 'Cash'"
        TEXT initials "1-3 uppercase chars"
        TEXT color "ColorToken"
        TEXT opening_date "YYYY-MM-DD"
        INTEGER archived "boolean (0 | 1)"
        INTEGER system "boolean (0 | 1)"
        TEXT card_name "nullable"
        INTEGER card_limit_cents "nullable integer cents"
        INTEGER card_closing_day "nullable (1..31)"
        INTEGER card_due_day "nullable (1..31)"
        TEXT created_at "ISO timestamp"
    }

    account_balances {
        TEXT account_id PK_FK
        TEXT currency PK "'USD' | 'BRL'"
        INTEGER opening_balance_cents "integer cents"
        INTEGER sort_order
    }

    payment_methods {
        TEXT id PK
        TEXT workspace_id FK
        TEXT name
        TEXT icon "IconKey"
        TEXT system_tag "nullable ('cash' | 'credit-card')"
        INTEGER sort_order
    }

    account_payment_methods {
        TEXT account_id PK_FK
        TEXT payment_method_id PK_FK
    }

    transaction_types {
        TEXT id PK
        TEXT workspace_id FK
        TEXT name
        TEXT direction "'income' | 'expense'"
        TEXT color "ColorToken"
        TEXT icon "IconKey"
        TEXT system_tag "nullable ('transfer')"
        INTEGER sort_order
    }

    goal_categories {
        TEXT id PK
        TEXT workspace_id FK
        TEXT name
        REAL percentage "0..100"
        TEXT color "ColorToken"
        TEXT icon "IconKey"
        TEXT description "nullable"
        INTEGER sort_order
    }

    goal_type_mappings {
        TEXT workspace_id PK_FK
        TEXT transaction_type_id PK_FK
        TEXT goal_category_id FK
    }

    recurring_rules {
        TEXT id PK
        TEXT workspace_id FK
        TEXT description
        INTEGER amount_cents "integer cents"
        TEXT currency "'USD' | 'BRL'"
        TEXT direction "'income' | 'expense'"
        TEXT type_id FK
        TEXT account_id FK
        TEXT payment_method_id FK "nullable"
        TEXT start_date "YYYY-MM-DD"
        TEXT frequency "'monthly'"
        TEXT limit_kind "'infinite' | 'count'"
        INTEGER limit_count "nullable"
        TEXT status "'active' | 'canceled'"
        TEXT created_at "YYYY-MM-DD"
        TEXT canceled_at "nullable YYYY-MM-DD"
    }

    transactions {
        TEXT id PK
        TEXT workspace_id FK
        TEXT date "YYYY-MM-DD"
        TEXT description
        TEXT type_id FK
        TEXT direction "'income' | 'expense'"
        INTEGER amount_cents "integer cents"
        TEXT currency "'USD' | 'BRL'"
        TEXT account_id FK
        TEXT payment_method_id FK "nullable"
        TEXT transfer_id "nullable shared pair UUID"
        TEXT installment_group_id "nullable shared series UUID"
        INTEGER installment_number "nullable (1..N)"
        INTEGER installment_total "nullable (2..48)"
        TEXT recurring_rule_id FK "nullable"
        INTEGER recurring_index "nullable (1..N)"
        INTEGER recurring_total "nullable"
        TEXT created_at "ISO timestamp"
    }
```

---

## Table Specifications

All tables are defined symmetrically in [schema.ts](../src/db/schema.ts) (Drizzle ORM) and [client.ts](../src/db/client.ts) (`SCHEMA_DDL`), with automated parity verified by [schema-parity.test.ts](../tests/integration/db/schema-parity.test.ts).

### 1. `workspaces`

Stores root workspace preferences, exchange rate state, and budget goal baseline configuration. Deleting a workspace cascades (`ON DELETE CASCADE`) to every entity table in that workspace.

| Column | SQLite Type | Constraints / Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY NOT NULL` | Workspace identifier (`'default'`). |
| `language` | `TEXT` | `NOT NULL DEFAULT 'en-US'` | Active locale (`'en-US'` or `'pt-BR'`). |
| `default_currency` | `TEXT` | `NOT NULL DEFAULT 'USD'` | Workspace default currency (`'USD'` or `'BRL'`). |
| `exchange_rate` | `REAL` | Nullable | Last confirmed USD-to-BRL exchange rate (e.g., `5.25`). |
| `exchange_rate_updated_at` | `TEXT` | Nullable | ISO-8601 timestamp of last rate update. |
| `exchange_rate_source` | `TEXT` | `NOT NULL DEFAULT 'none'` | Rate origin (`'api'`, `'manual'`, or `'none'`). |
| `goals_reference_income_cents` | `INTEGER` | `NOT NULL DEFAULT 100000000` | Expected monthly income baseline in integer cents for budget goal calculations. |
| `goals_mode` | `TEXT` | `NOT NULL DEFAULT 'percentage'` | Budget configuration mode (`'percentage'` or `'currency'`). |
| `updated_at` | `TEXT` | `NOT NULL` | ISO-8601 timestamp of last preference update. |

### 2. `accounts`

Stores depository (`Checking`, `Savings`, `Cash`) accounts and their optional attached credit card billing configuration.

| Column | SQLite Type | Constraints / Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY NOT NULL` | Unique account identifier slug or UUID. |
| `workspace_id` | `TEXT` | `NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE` | Owning workspace ID. |
| `name` | `TEXT` | `NOT NULL` | Display name of the account (unique per workspace, case-insensitive). |
| `kind` | `TEXT` | `NOT NULL` | Account classification (`'Checking'`, `'Savings'`, `'Investment'`, `'Cash'`; note: `'Investment'` maps to `'Savings'` on hydration). |
| `initials` | `TEXT` | `NOT NULL` | 1 to 3 uppercase characters displayed in account avatar badges. |
| `color` | `TEXT` | `NOT NULL` | Semantic `ColorToken` (e.g., `'cyan'`, `'blue'`, `'emerald'`). |
| `opening_date` | `TEXT` | `NOT NULL` | Account opening date (`YYYY-MM-DD`); cash movements before this date are ignored. |
| `archived` | `INTEGER` | `NOT NULL DEFAULT 0` | Boolean flag (`0` active, `1` archived). |
| `system` | `INTEGER` | `NOT NULL DEFAULT 0` | Boolean flag (`1` for system `Cash` / `cash-wallet` accounts that cannot be deleted). |
| `card_name` | `TEXT` | Nullable | Attached credit card display name (null if no card attached). |
| `card_limit_cents` | `INTEGER` | Nullable | Attached credit card limit in integer cents ($\ge 0$). |
| `card_closing_day` | `INTEGER` | Nullable | Statement closing day of month (`1..31`). |
| `card_due_day` | `INTEGER` | Nullable | Payment due day of month (`1..31`). |
| `created_at` | `TEXT` | `NOT NULL` | ISO-8601 creation timestamp. |

### 3. `account_balances`

Models per-currency opening balance pockets for each account (`PRIMARY KEY (account_id, currency)`), enabling multi-currency accounts without cross-currency conversion distortion.

| Column | SQLite Type | Constraints / Default | Description |
| :--- | :--- | :--- | :--- |
| `account_id` | `TEXT` | `NOT NULL REFERENCES accounts(id) ON DELETE CASCADE` | Parent account ID. |
| `currency` | `TEXT` | `NOT NULL` | Pocket currency (`'USD'` or `'BRL'`). |
| `opening_balance_cents` | `INTEGER` | `NOT NULL DEFAULT 0` | Initial balance for this currency pocket in integer cents (may be positive, zero, or negative). |
| `sort_order` | `INTEGER` | `NOT NULL DEFAULT 0` | Ordering index (`0` denotes the account's primary currency pocket). |

### 4. `payment_methods` & `account_payment_methods`

Defines workspace payment channels and the many-to-many join table restricting which methods are enabled per account.

- **`payment_methods`**:
    - `id` (`TEXT PRIMARY KEY`), `workspace_id` (`TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE`), `name` (`TEXT NOT NULL`), `icon` (`TEXT NOT NULL`), `system_tag` (`TEXT`, nullable: `'cash'` or `'credit-card'`), `sort_order` (`INTEGER NOT NULL DEFAULT 0`).
    - Protected system rows (`system_tag IS NOT NULL` or `id IN ('cash', 'credit-card')`) cannot be deleted.
- **`account_payment_methods`**:
    - Composite primary key `(account_id, payment_method_id)` with `ON DELETE CASCADE` on both foreign keys.

### 5. `transaction_types`

Defines income and expense categories with visual styling and system protection.

| Column | SQLite Type | Constraints / Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY NOT NULL` | Category identifier slug or UUID. |
| `workspace_id` | `TEXT` | `NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE` | Owning workspace ID. |
| `name` | `TEXT` | `NOT NULL` | Category display name (unique within `direction`). |
| `direction` | `TEXT` | `NOT NULL` | Cash flow direction (`'income'` or `'expense'`). |
| `color` | `TEXT` | `NOT NULL` | Semantic `ColorToken`. |
| `icon` | `TEXT` | `NOT NULL` | Lucide `IconKey`. |
| `system_tag` | `TEXT` | Nullable | Set to `'transfer'` for the protected internal transfer category. |
| `sort_order` | `INTEGER` | `NOT NULL DEFAULT 0` | Display order within its direction list. |

### 6. `goal_categories` & `goal_type_mappings`

Defines high-level budget buckets (e.g., Needs, Wants, Savings) and maps each expense `transaction_type_id` to at most one `goal_category_id`.

- **`goal_categories`**:
    - `id` (`TEXT PRIMARY KEY`), `workspace_id` (`TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE`), `name` (`TEXT NOT NULL`), `percentage` (`REAL NOT NULL`, $0..100$), `color` (`TEXT NOT NULL`), `icon` (`TEXT NOT NULL`), `description` (`TEXT`, nullable), `sort_order` (`INTEGER NOT NULL DEFAULT 0`).
- **`goal_type_mappings`**:
    - Composite primary key `(workspace_id, transaction_type_id)` ensuring each transaction category maps to at most one budget goal category (`goal_category_id`), with `ON DELETE CASCADE` across `workspaces`, `transaction_types`, and `goal_categories`.

### 7. `recurring_rules`

Stores recurring monthly income or expense templates used to project occurrences into `transactions`.

| Column | SQLite Type | Constraints / Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY NOT NULL` | Recurring rule UUID. |
| `workspace_id` | `TEXT` | `NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE` | Owning workspace ID. |
| `description` | `TEXT` | `NOT NULL` | Transaction description template. |
| `amount_cents` | `INTEGER` | `NOT NULL` | Monthly amount in positive integer cents. |
| `currency` | `TEXT` | `NOT NULL` | Currency (`'USD'` or `'BRL'`). |
| `direction` | `TEXT` | `NOT NULL` | Cash flow direction (`'income'` or `'expense'`). |
| `type_id` | `TEXT` | `NOT NULL REFERENCES transaction_types(id) ON DELETE RESTRICT` | Category ID (`RESTRICT` requires reassigning rules before deleting a category). |
| `account_id` | `TEXT` | `NOT NULL REFERENCES accounts(id) ON DELETE CASCADE` | Target account ID. |
| `payment_method_id` | `TEXT` | `REFERENCES payment_methods(id) ON DELETE RESTRICT` | Optional payment method (`RESTRICT` requires reassignment before method deletion). |
| `start_date` | `TEXT` | `NOT NULL` | First occurrence date (`YYYY-MM-DD`). |
| `frequency` | `TEXT` | `NOT NULL DEFAULT 'monthly'` | Recurrence cadence (`'monthly'`). |
| `limit_kind` | `TEXT` | `NOT NULL` | Projection bound (`'infinite'` or `'count'`). |
| `limit_count` | `INTEGER` | Nullable | Total occurrence count when `limit_kind = 'count'`. |
| `status` | `TEXT` | `NOT NULL` | Lifecycle status (`'active'` or `'canceled'`). |
| `created_at` | `TEXT` | `NOT NULL` | Rule creation date (`YYYY-MM-DD`). |
| `canceled_at` | `TEXT` | Nullable | Cutoff date (`YYYY-MM-DD`) on or after which occurrences are removed. |

### 8. `transactions`

The central ledger table storing single transactions, dual transfer legs, monthly installment items, and projected recurring occurrences.

| Column | SQLite Type | Constraints / Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY NOT NULL` | Transaction UUID. |
| `workspace_id` | `TEXT` | `NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE` | Owning workspace ID. |
| `date` | `TEXT` | `NOT NULL` | Effective transaction date (`YYYY-MM-DD`). |
| `description` | `TEXT` | `NOT NULL` | Merchant or transaction description (indexed in `transactions_fts`). |
| `type_id` | `TEXT` | `NOT NULL REFERENCES transaction_types(id) ON DELETE RESTRICT` | Category ID (`RESTRICT` prevents deleting in-use categories without reassignment). |
| `direction` | `TEXT` | `NOT NULL` | Cash flow direction (`'income'` or `'expense'`). |
| `amount_cents` | `INTEGER` | `NOT NULL` | Transaction amount in integer cents. |
| `currency` | `TEXT` | `NOT NULL` | Currency (`'USD'` or `'BRL'`). |
| `account_id` | `TEXT` | `NOT NULL REFERENCES accounts(id) ON DELETE CASCADE` | Account ID (`CASCADE` when an empty account is deleted). |
| `payment_method_id` | `TEXT` | `REFERENCES payment_methods(id) ON DELETE RESTRICT` | Payment method ID (`RESTRICT` prevents deleting in-use methods without reassignment). |
| `transfer_id` | `TEXT` | Nullable | Shared identifier linking the outgoing (`expense`) and incoming (`income`) legs of a transfer. |
| `installment_group_id` | `TEXT` | Nullable | Shared identifier linking all $N$ monthly transactions of an installment purchase. |
| `installment_number` | `INTEGER` | Nullable | 1-based installment index ($1..N$). |
| `installment_total` | `INTEGER` | Nullable | Total installments in the series ($2..48$). |
| `recurring_rule_id` | `TEXT` | `REFERENCES recurring_rules(id) ON DELETE SET NULL` | Parent recurring rule ID. |
| `recurring_index` | `INTEGER` | Nullable | 1-based iteration number generated from the recurring rule. |
| `recurring_total` | `INTEGER` | Nullable | Total iterations if generated by a fixed-count recurring rule. |
| `created_at` | `TEXT` | `NOT NULL` | ISO-8601 creation timestamp. |

---

## Indexing, FTS5 Virtual Table & Custom SQLite Functions

### 1. B-Tree Indexes

To guarantee fast windowed queries, category reassignments, and series lookups, `SCHEMA_DDL` maintains 12 B-Tree indexes:

| Index Name | Table & Columns | Query Purpose |
| :--- | :--- | :--- |
| `idx_accounts_workspace` | `accounts(workspace_id)` | Workspace account hydration. |
| `idx_payment_methods_workspace` | `payment_methods(workspace_id)` | Workspace payment method hydration. |
| `idx_transaction_types_workspace` | `transaction_types(workspace_id, direction, sort_order)` | Ordered category lists per direction. |
| `idx_goal_categories_workspace` | `goal_categories(workspace_id, sort_order)` | Ordered budget goal category hydration. |
| `idx_recurring_rules_workspace` | `recurring_rules(workspace_id, account_id)` | Workspace rule loading and account archival rule cancellation. |
| `idx_tx_workspace_date` | `transactions(workspace_id, date)` | 90-day windowed workspace loading and date range filtering. |
| `idx_tx_account_date` | `transactions(account_id, date)` | Per-account ledger queries and pre-window balance rollups. |
| `idx_tx_type` | `transactions(type_id)` | Category usage counting and mandatory reassignment updates. |
| `idx_tx_payment_method` | `transactions(payment_method_id)` | Payment method usage counting and mandatory reassignment updates. |
| `idx_tx_transfer_group` | `transactions(transfer_id)` | Atomic dual-leg transfer editing and deletion. |
| `idx_tx_installment_group` | `transactions(installment_group_id)` | Atomic installment series editing and deletion. |
| `idx_tx_recurring_rule` | `transactions(recurring_rule_id)` | Recurring series updates, cutoff cancellations (`date >= canceledAt`), and deletions. |

### 2. Full-Text Search Virtual Table (`transactions_fts`) & Triggers

Because Drizzle ORM does not natively model SQLite FTS5 virtual tables, `transactions_fts` and its synchronization triggers are managed directly in [client.ts](../src/db/client.ts):

- **Virtual Table Definition**:

  ```sql
  CREATE VIRTUAL TABLE IF NOT EXISTS transactions_fts USING fts5(
    description,
    tokenize = 'trigram remove_diacritics 2'
  );
  ```

- **Automatic Trigger Synchronization**:
    - `trg_tx_fts_insert`: After `INSERT ON transactions`, inserts `(new.rowid, new.description)` into `transactions_fts`.
    - `trg_tx_fts_delete`: After `DELETE ON transactions`, deletes `WHERE rowid = old.rowid` from `transactions_fts`.
    - `trg_tx_fts_update`: After `UPDATE OF description ON transactions`, updates `description = new.description WHERE rowid = old.rowid`.
- **Startup Backfill & Custom `fold()` Function**:
    - On connection initialization, [client.ts](../src/db/client.ts) registers the deterministic custom SQLite function `fold(text)` (backed by `foldText` in [search.ts](../src/app/data/search.ts), which performs NFD diacritic stripping and lowercasing) and rebuilds `transactions_fts` inside a transaction (`DELETE FROM transactions_fts; INSERT INTO transactions_fts(rowid, description) SELECT rowid, description FROM transactions;`).
    - During `searchTransactions`, tokens with $\ge 3$ characters join against `transactions_fts` via `MATCH`, while 1–2 character tokens filter via `fold(t.description) LIKE`.

---

## Windowed Hydration & Historical Balance Rollup Query

When the client loads the workspace (`GET /api/workspace?windowDays=90`), [sqliteRepository.ts](../src/server/sqliteRepository.ts) avoids transferring the entire historical `transactions` table over HTTP while still computing 100% cent-accurate account balances:

1. **Non-Credit-Card Pre-Window SQL Rollup**:
   Aggregates all non-credit-card transactions occurring on or after each account's `opening_date` and strictly before `cutoffDateStr` (`today - 90 days`):

   ```sql
   SELECT
     t.account_id AS accountId,
     t.currency AS currency,
     SUM(CASE WHEN t.direction = 'income' THEN t.amount_cents ELSE -t.amount_cents END) AS netCents
   FROM transactions t
   INNER JOIN accounts a ON a.id = t.account_id
   LEFT JOIN payment_methods pm ON pm.id = t.payment_method_id
   WHERE t.workspace_id = ?
     AND t.date < ?
     AND t.date >= a.opening_date
     AND (pm.system_tag IS NULL OR pm.system_tag != 'credit-card')
   GROUP BY t.account_id, t.currency
   ```

   The resulting `netCents` per `${accountId}:${currency}` pocket is returned in `WorkspaceSnapshot.historicalRollups`.
2. **Pre-Window Credit Card Statement Straddling**:
   Fetches credit card transactions prior to `cutoffDateStr`, builds all credit card billing statements via `buildStatements`, and:
   - Subtracts `-stmt.total` from `historicalRollups["${accountId}:${currency}"]` for any statement whose `dueDate < cutoffDate`.
   - Includes individual pre-window credit card transactions in `WorkspaceSnapshot.transactions` if they belong to a straddling statement whose `dueDate >= cutoffDate`, ensuring open and recently closed statements display their complete itemized purchase list.
