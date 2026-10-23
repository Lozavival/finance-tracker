---
name: server-code-review
description: Audits backend, database schema, domain models, API routes, and repository implementations for transactional integrity, integer cents invariants, Zod validation, and zero-warning code quality.
---

# Server, Database & Model Code Review Auditor

Use this skill whenever implementing, refactoring, or reviewing server code (`src/server/`), database schemas and migrations (`src/db/`), domain calculation engines (`src/app/data/`), or repository implementations (`src/app/data/repository/`).

---

## Review Checklist

### 1. Domain Logic & Mathematical Invariants (Mandatory)
Finance Tracker enforces strict fintech math standards. Floating-point numbers must never be used for currency calculations.

#### A. Integer Cents Only
- All currency balances, transactions, budgets, and limits must be represented and stored as **integer cents** (`value: number`, where `$10.50` = `1050`).
- No floating-point operations (`Math.round(val * 100) / 100`, `.toFixed(2)` for math). Floating conversions are strictly restricted to UI display formatters in `src/app/data/currency.ts`.
- Values must be integer-checked where applicable: `Number.isInteger(cents)`.

#### B. Cent-Exact Installment Allocation
- When splitting monetary values into installments (`buildInstallments`), remainder cents from integer division must be allocated to the first installment so that:
  $$\sum \text{installments} \equiv \text{totalValue}$$
- Never drop, truncate, or lose remainder cents.

#### C. Calendar Date Safety & Clamping
- Never use `new Date("YYYY-MM-DD")` directly for domain logic because timezone offsets skew dates backward or forward.
- Always use `parseLocalDate` and `toLocalDateString` from `src/app/data/dates.ts`.
- Due dates and billing cycles must handle variable month lengths (February 28/29, April 30) using safe date clamping: days beyond the month's maximum must clamp to the final calendar day of that month.

#### D. System Entity Protection
- System records (`systemTag: 'transfer'`, `'cash'`, `'credit-card'`) must never be deleted or destroyed.
- In-use categories and payment methods must require reassigning transactions before deletion can proceed.

---

### 2. Database Schema, DDL Parity & Migrations (`src/db/`)

#### A. Drizzle Schema & SQLite DDL Parity
- Schema definitions in `src/db/schema.ts` (Drizzle ORM) and table initialization queries in `src/db/client.ts` (`CREATE TABLE IF NOT EXISTS ...`) must remain in **100% lockstep parity**.
- Any column addition, type change, default value, or foreign key change in `schema.ts` must be mirrored in `client.ts`.

#### B. Foreign Key Referential Integrity
- Enable SQLite foreign keys (`PRAGMA foreign_keys = ON;` in `client.ts`).
- Explicitly declare cascading behavior:
  - Use `ON DELETE CASCADE` for child composition records (e.g., `account_balances`, `account_payment_methods`, `goal_type_mappings`).
  - Use `ON DELETE RESTRICT` for referential integrity guards (e.g., transactions referencing transaction types or accounts).

#### C. Indexing & Query Performance
- Every foreign key and frequently filtered column must have an explicit index defined in both `schema.ts` and `client.ts`:
  - `idx_tx_workspace_date` on `(workspace_id, date)`
  - `idx_tx_account_date` on `(account_id, date)`
  - Indexes on `type_id`, `payment_method_id`, `transfer_id`, `installment_group_id`, `recurring_rule_id`.

#### D. Clean Production Defaults
- Production seed defaults (`src/app/data/defaults/`) must be clean and minimal (`EMPTY_GOALS_CONFIG`, zero balances).
- Never import or leak demo or test fixtures (`src/app/data/fixtures/`, `SEEDED_*`, `DEV_*`) into production database initialization paths.

---

### 3. Transactional Integrity & Multi-Tenant Workspace Scoping

#### A. Atomic Multi-Row / Multi-Table Operations
- Any mutation affecting multiple tables or rows **must** be wrapped inside a database transaction:
  ```typescript
  const runMutation = this.conn.sqlite.transaction(() => {
    // 1. Delete or update existing rows
    // 2. Insert new or updated rows
    // 3. Update secondary relations
  });
  runMutation();
  ```
- This applies mandatory atomicity to:
  - Transfers (always insert/delete both incoming and outgoing legs together).
  - Installment creation/editing (all series rows generated atomically).
  - Recurring rule modifications and future transaction cancellations.
  - Category / Payment method reassignments prior to deletion.
  - Account archival or deletion (cleaning up or detaching transfers and balances).

#### B. Workspace Isolation
- Every database query and mutation must be scoped to the active workspace:
  ```typescript
  where(and(eq(schema.transactions.workspaceId, this.workspaceId), ...))
  ```
- Never perform un-scoped queries or updates. Cross-workspace leakage is a critical vulnerability.

---

### 4. API Contracts, Zod Validation & HTTP Semantics (`src/server/`)

#### A. Input Validation at the Edge
- Every incoming RPC request payload must be parsed and validated with Zod schemas defined in `src/server/rpcSchemas.ts`.
- Reject unvalidated input before passing data to repositories or domain logic.
- Use discriminated unions for polymorphic payloads (e.g. `single`, `transfer`, `installments`, `recurring`).

#### B. HTTP Status Code Semantics
- `200 OK`: Successful retrieval or mutation.
- `400 Bad Request`: Payload validation failures (e.g., invalid date format, negative values where forbidden, missing required fields). Return structured Zod error details.
- `404 Not Found`: When referencing an entity or workspace that does not exist.
- `409 Conflict`: Business invariant conflicts (e.g., trying to delete a system category, or trying to delete an in-use category without reassignment).
- `413 Payload Too Large`: Enforce body byte limits (`MAX_BODY_BYTES = 1024 * 1024`) to protect server memory against DoS.
- `500 Internal Server Error`: Reserved strictly for unexpected system or unhandled errors.

#### C. Streaming & Defensive Body Parsing
- Limit incoming body size during streaming chunks.
- Catch malformed JSON gracefully; never let bad JSON payloads crash the server.

---

### 5. Repository Pattern & Parity (`src/app/data/repository/`, `src/server/`)

#### A. Contract Parity
- The `FinanceRepository` interface in `src/app/data/repository/types.ts` is the single source of truth for persistence.
- Any new repository method or signature change must be implemented symmetrically in both:
  - `SqliteRepository` (`src/server/sqliteRepository.ts`)
  - `inMemoryRepository` (`src/app/data/repository/inMemoryRepository.ts`)
- Both implementations must adhere to the same query semantics (date ranges, account filtering, ordering).

#### B. Serialization Boundary (`serialization.ts`)
- Enforce strict separation between JSON wire transport formats (DTOs with string dates, serialized drafts) and domain models (typed `Date` instances, domain entities).
- Keep serialization and deserialization pure, bijective, and centralized in `src/app/data/repository/serialization.ts`.

---

### 6. Error Handling, Resilience & Zero Silent Failures

- **Zero Silent Failure Policy**: Empty catch blocks (`catch () {}` or `.catch(() => {})`) are strictly forbidden.
- Always log server errors with context (`serverLogger?.error(...)` or repository logger).
- Report persistence failures to the client so UI notification channels can handle synchronization rollbacks (`reportSyncError`).

---

### 7. Automated Diff Audit & Verification Workflow

#### A. Diff Audit Commands
Run these checks against `git diff` before committing:

1. **Check for prohibited floating-point rounding methods on money**:
   ```bash
   git diff | grep -E '\.(toFixed|toPrecision)\(' || true
   ```
2. **Check for silent catch blocks**:
   ```bash
   git diff | grep -E 'catch\s*(\([a-zA-Z0-9_]*\))?\s*\{\s*\}' || true
   ```
3. **Check for un-scoped queries (missing `workspaceId` condition in SQLite calls)**:
   ```bash
   git diff src/server/sqliteRepository.ts | grep -E '\.(where|delete|update)\(' | grep -v 'workspaceId' || true
   ```

#### B. Verification Pipeline
Always run the full verification suite after editing backend, schema, or domain files:
```bash
npm run format
npm run lint
npm run build
```

Requirements:
1. Prettier formatting clean (`npm run format`).
2. Zero TypeScript errors (`npm run lint:tsc`).
3. Zero ESLint warnings (`npm run lint:ts`).
4. Vite build succeeds (`npm run build`).

