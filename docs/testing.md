# Test Suite Architecture & Reference

This document describes the testing infrastructure, runtime environments, test helpers, isolation guarantees, and suite inventory for the Finance Tracker application. It cross-references automated test suites against the business rules in [spec.md](./spec.md) and user journeys in [flows.md](./flows.md).

## Execution Commands

| Command | Scope | Underlying Runner |
| :--- | :--- | :--- |
| `npm test` | Full test suite across all tiers and viewports | `vitest run && playwright test` |
| `npm run test:unit` | Pure domain engines, state reducers, storage, and custom hooks | `vitest run tests/unit` |
| `npm run test:integration` | SQLite DDL parity, triggers, API endpoints, repositories, contexts, and static audits | `vitest run tests/integration` |
| `npm run test:components` | Interactive dialogs, error boundaries, and theme synchronization | `vitest run tests/components` |
| `npm run test:e2e` | End-to-end browser journeys across `desktop`, `tablet`, and `mobile` viewports | `playwright test` |

## Runtime Architecture & Environment Split

The test suite is divided into two runners—**Vitest** ([vitest.config.ts](../vitest.config.ts)) and **Playwright** ([playwright.config.ts](../playwright.config.ts))—and further split into isolated runtime environments so native C++ bindings and browser DOM APIs execute without conflict:

1. **Vitest `node-tests` Project (`environment: 'node'`)**:
   - Executes `tests/unit/**/*.test.ts` (excluding `tests/unit/hooks/**`) and `tests/integration/**/*.test.ts`.
   - Runs in a real Node.js process to support native `better-sqlite3` C++ bindings, filesystem log rotation, and raw HTTP middleware streams.
2. **Vitest `dom-tests` Project (`environment: 'happy-dom'`)**:
   - Executes `tests/unit/hooks/**/*.test.{ts,tsx}`, `tests/integration/state/**/*.test.tsx`, and `tests/components/**/*.test.{ts,tsx}`.
   - Preloads [setup-jsdom.ts](../tests/helpers/setup-jsdom.ts), which polyfills `window.matchMedia`, `ResizeObserver`, and `IntersectionObserver`, cleans up the DOM after each test, and stubs global `fetch` with a deterministic exchange rate response to prevent outbound network calls.
3. **Playwright Multi-Viewport Projects (`@playwright/test`)**:
   - Launches an isolated Vite server on port `8444` (`http://localhost:8444`) bound to `DATABASE_PATH=data/finance-tracker.e2e.db` with `NODE_ENV=test`.
   - Runs serial workers (`workers: 1`) across three viewport projects:
     - `desktop`: Desktop Chrome (`1280×720`) — executes all 15 E2E flow specs.
     - `tablet`: Touch-enabled Chrome (`768×1024`) — executes core lifecycle, search, and i18n specs.
     - `mobile`: Pixel 7 profile — executes core lifecycle, search, and i18n specs.

## Test Helpers, Fixtures & Database Isolation

All test tiers strictly isolate persistence so developer (`data/finance-tracker.dev.db`) and production (`data/finance-tracker.prod.db`) databases are never modified:

- **Temporary SQLite Databases ([db-test-helper.ts](../tests/helpers/db-test-helper.ts))**: `createTestDatabase(mode)` provisions an ephemeral directory under `os.tmpdir()` (`ft-vitest-db-*`), initializes schema DDL and FTS5 triggers, seeds the workspace in `'development'` or `'production'` mode, and exposes a `cleanup()` callback that closes the connection and deletes the directory.
- **React Provider Harness ([render-with-providers.tsx](../tests/helpers/render-with-providers.tsx))**: `renderWithProviders(ui, options)` wraps components in `MemoryRouter`, `I18nProvider`, `NotificationsProvider`, `SettingsProvider`, and `FinanceProvider` backed by an isolated `InMemoryFinanceRepository`.
- **Playwright E2E Helpers ([e2e-helper.ts](../tests/e2e/helpers/e2e-helper.ts))**:
    - `resetTestDatabase(request, mode)`: Dispatches `POST /api/rpc` with `action: 'resetSettings'` before each E2E test for deterministic starting state.
    - `openPrimaryNav(page)` / `closePrimaryNav(page)`: Transparently interacts with either the persistent desktop `Sidebar` ($\ge 1024\text{px}$) or the `MobileNavDrawer` sheet ($< 1024\text{px}$).
    - `expectNoHorizontalOverflow(page)`: Inspects `document.documentElement.scrollWidth` against `clientWidth` and reports the exact culprit DOM nodes if any element causes horizontal overflow.
- **Deterministic Fixtures (`tests/fixtures/`)**: [test-accounts.ts](../tests/fixtures/test-accounts.ts), [test-transactions.ts](../tests/fixtures/test-transactions.ts), and [test-workspace.ts](../tests/fixtures/test-workspace.ts) provide fixed dates, accounts, and cent amounts for repeatable assertions.

---

## Test Suite Inventory & Traceability

### 1. Unit & Hook Tests (`tests/unit/`)

| Test File | Target Module | Verified Business Rules & Invariants |
| :--- | :--- | :--- |
| [analytics.test.ts](../tests/unit/data/analytics.test.ts) | [analytics.ts](../src/app/data/analytics.ts) | `BR-005`, `BR-014`, `BR-019`, `BR-035`, `BR-036`: Multi-currency KPI conversion, no 1:1 foreign sum fallback, cumulative spending pace, category trends, and heuristic signals (streaks, spikes, upcoming bills, savings milestones, deficits). |
| [cardStatements.test.ts](../tests/unit/data/cardStatements.test.ts) | [cardStatements.ts](../src/app/data/cardStatements.ts) | `BR-015`–`BR-018`: Billing cycle assignment on/after `closingDay`, `dueDay <= closingDay` next-month rollover, month-end date clamping, `open`/`closed`/`paid` status transitions, and credit limit utilization. |
| [currency.test.ts](../tests/unit/data/currency.test.ts) | [currency.ts](../src/app/data/currency.ts) | `BR-001`, `BR-003`, `BR-004`: Cent/dollar conversions, exchange rate rounding, invalid rate rejection, live rate fetch timeout/offline handling, and `ExchangeRateErrorCode` classification. |
| [dates.test.ts](../tests/unit/data/dates.test.ts) | [dates.ts](../src/app/data/dates.ts) | `BR-007`: Timezone-neutral `YYYY-MM-DD` parsing/formatting, `addMonthsClamped` leap-year and month-end clamping, and upcoming horizon resolution. |
| [goals.test.ts](../tests/unit/data/goals.test.ts) | [goals.ts](../src/app/data/goals.ts) | `BR-014`, `BR-033`: Monthly budget target calculation from `referenceMonthlyIncome` or actual MTD income fallback, transfer exclusion, and unmapped expense attribution to the first goal category. |
| [icons.test.ts](../tests/unit/data/icons.test.ts) | [icons.ts](../src/app/data/icons.ts) | Verifies all registered `IconKey` identifiers resolve to valid Lucide icon components with fallback support. |
| [installments.test.ts](../tests/unit/data/installments.test.ts) | [installments.ts](../src/app/data/installments.ts) | `BR-006`, `BR-007`, `BR-009`: Cent-exact division across $2..48$ installments with remainder cents allocated to index `0`, clamped monthly dates, and accrual badge formatting (`-1`). |
| [ledger.test.ts](../tests/unit/data/ledger.test.ts) | [ledger.ts](../src/app/data/ledger.ts) | `BR-019`, `BR-027`, `BR-041`: Per-currency pocket ledgers (`${accountId}:${currency}`), pre-opening-date movement filtering, historical balance rollups, credit card bill deferral to `dueDate`, binary-search `balanceAt`, and lowest-point cash forecasting. |
| [notifications.test.ts](../tests/unit/data/notifications.test.ts) | [notifications.ts](../src/app/data/notifications.ts) | `BR-034`, `BR-035`, `BR-037`, `BR-044`: Warning ($50\%$–$99\%$, default $85\%$) and critical ($100\%$) budget threshold alerts, period-key deduplication, severity sorting, 50-item/30-day activity pruning, and 90-day alert state pruning. |
| [recurring.test.ts](../tests/unit/data/recurring.test.ts) | [recurring.ts](../src/app/data/recurring.ts) | `BR-020`–`BR-022`: 24-month projection horizon (`RECURRING_PROJECTION_MONTHS = 24`), fixed count limit projection, and `canceledAt` cutoff filtering. |
| [search.test.ts](../tests/unit/data/search.test.ts) | [search.ts](../src/app/data/search.ts) | `BR-039`, `BR-040`: `foldText` NFD diacritic stripping, query tokenization (up to 8 tokens), FTS5 `MATCH` expression escaping, Unicode-safe highlight range mapping, search result ordering, and series/transfer group collapsing. |
| [serialization.test.ts](../tests/unit/data/serialization.test.ts) | [serialization.ts](../src/app/data/repository/serialization.ts) | Round-trip Date-to-`YYYY-MM-DD` serialization and deserialization across transactions, drafts, editing targets, accounts, recurring rules, and workspace snapshots without timezone drift. |
| [settings.test.ts](../tests/unit/data/settings.test.ts) | [settings.ts](../src/app/data/settings.ts) | `BR-025`, `BR-027`: Payment method restrictions by account kind (`Cash`, `Checking`, `Savings`, attached credit card), multi-currency pocket helpers, and semantic palette token resolution. |
| [transactions.test.ts](../tests/unit/data/transactions.test.ts) | [transactions.ts](../src/app/data/transactions.ts) | `BR-009`, `BR-011`, `BR-013`, `BR-014`: Dual transfer leg generation, cross-currency effective rate labels, accrual basis grouping (`groupToAccrualBasis`), period range presets, and chronological sorting. |
| [updates.test.ts](../tests/unit/data/updates.test.ts) | [updates.ts](../src/app/data/updates.ts) | `BR-047`: SemVer 2.0.0 parsing and precedence comparison (`1.0.0 > 1.0.0-rc.1`), draft and pre-release channel filtering, GitHub Releases API fetching, timeout/offline handling, and `UpdateCheckErrorCode` classification. |
| [useFinancialAlerts.test.tsx](../tests/unit/hooks/useFinancialAlerts.test.tsx) | [useFinancialAlerts.ts](../src/app/state/useFinancialAlerts.ts) | `BR-034`–`BR-037`: Unified alert derivation hook combining heuristic signals, budget thresholds, offline system alerts, read/dismissed filtering, and unread/critical counters. |
| [useTransactionActions.test.tsx](../tests/unit/hooks/useTransactionActions.test.tsx) | [useTransactionActions.ts](../src/app/state/useTransactionActions.ts) | `BR-043`, `BR-045`: Add/edit dialog state orchestration, series target resolution (`single`, `transfer`, `installments`, `recurring`), `notify.successWhen` persistence confirmation, and `notify.undoable` deletion wiring. |
| [useTransactionSearch.test.tsx](../tests/unit/hooks/useTransactionSearch.test.tsx) | [useTransactionSearch.ts](../src/app/state/useTransactionSearch.ts) | `BR-039`, `BR-040`: Minimum query length gating (`SEARCH_MIN_LENGTH = 2`), debounced repository invocation, and in-flight request cancellation via `AbortController`. |
| [i18n.test.ts](../tests/unit/i18n/i18n.test.ts) | [en.ts](../src/app/i18n/locales/en.ts), [pt.ts](../src/app/i18n/locales/pt.ts) | Enforces 100% recursive translation key parity between English (`en-US`) and Portuguese (`pt-BR`) dictionaries and verifies template parameter interpolation. |
| [logger.test.ts](../tests/unit/lib/logger.test.ts) | [logger.ts](../src/app/lib/logger.ts) | `BR-046`: Scoped child loggers, level filtering, 300-entry circular breadcrumb buffer, safe circular/deep object serialization, and diagnostic log export formatting. |
| [notificationStorage.test.ts](../tests/unit/state/notificationStorage.test.ts) | [notificationStorage.ts](../src/app/state/notificationStorage.ts) | `BR-044`: Resilient `localStorage` read/write wrappers and fallback recovery when stored JSON for preferences, activity, or alert states is corrupted. |
| [settingsReducer.test.ts](../tests/unit/state/settingsReducer.test.ts) | [settingsReducer.ts](../src/app/state/settingsReducer.ts) | `BR-028`–`BR-031`: Pure state transitions for accounts, categories, payment methods, and goals, enforcing system entity immutability (`transfer`, `cash`, `credit-card`) and minimum category/method counts. |

### 2. Integration & Static Audit Tests (`tests/integration/`)

| Test File | Target Module | Verified Contracts & Business Rules |
| :--- | :--- | :--- |
| [design-system-tokens.test.ts](../tests/integration/audit/design-system-tokens.test.ts) | `src/**/*.{ts,tsx,css}` | Static codebase audit enforcing the zero-hardcoded-colors invariant (asserting no raw Tailwind palette classes such as `emerald-500`, `cyan-400`, or `slate-700` appear in source files). |
| [database-isolation.test.ts](../tests/integration/db/database-isolation.test.ts) | [client.ts](../src/db/client.ts), [apiPlugin.ts](../src/server/apiPlugin.ts) | `BR-042`: Strict separation between `finance-tracker.dev.db` and `finance-tracker.prod.db`, legacy `finance-tracker.db` auto-migration in dev mode, and `403 Forbidden` rejection when attempting dev seeding in production mode. |
| [fts-triggers.test.ts](../tests/integration/db/fts-triggers.test.ts) | [client.ts](../src/db/client.ts) | `BR-038`, `BR-039`: Automatic `transactions_fts` synchronization via `trg_tx_fts_insert`, `trg_tx_fts_update`, and `trg_tx_fts_delete` triggers, startup backfill, and custom SQLite `fold()` function execution. |
| [schema-parity.test.ts](../tests/integration/db/schema-parity.test.ts) | [schema.ts](../src/db/schema.ts), [client.ts](../src/db/client.ts) | Verifies 100% table, column, foreign key (`CASCADE`/`RESTRICT`/`SET NULL`), and index parity between Drizzle ORM definitions and `SCHEMA_DDL`. |
| [seed-database.test.ts](../tests/integration/db/seed-database.test.ts) | [seedDatabase.ts](../src/db/seedDatabase.ts) | `BR-042`: Idempotency of `seedWorkspaceIfNeeded` on existing workspaces and atomic cascading reset in `resetAndSeedWorkspace` across `'development'` and `'production'` modes. |
| [client-logger-remote.test.ts](../tests/integration/lib/client-logger-remote.test.ts) | [logger.ts](../src/app/lib/logger.ts), [apiPlugin.ts](../src/server/apiPlugin.ts) | `BR-046`: Debounced forwarding of client `warn` and `error` events to `POST /api/logs` and silent failure handling when the endpoint is unreachable. |
| [repository-contract.test.ts](../tests/integration/repository/repository-contract.test.ts) | [sqliteRepository.ts](../src/server/sqliteRepository.ts), [inMemoryRepository.ts](../src/app/data/repository/inMemoryRepository.ts) | Executes an identical behavioral contract suite against both `SqliteRepository` and `InMemoryFinanceRepository` to guarantee parity across transactions, installments, transfers, recurring rules, and search. |
| [api-endpoints.test.ts](../tests/integration/server/api-endpoints.test.ts) | [apiPlugin.ts](../src/server/apiPlugin.ts) | `BR-042`, `BR-046`: HTTP middleware testing for `GET /api/workspace`, `GET /api/transactions`, `GET /api/transactions/search`, `POST /api/rpc`, and `POST /api/logs`, including `400`, `403`, `404`, and `413` (>1 MB) error envelopes. |
| [logger-file.test.ts](../tests/integration/server/logger-file.test.ts) | [logger.ts](../src/server/logger.ts) | `BR-046`: Persistent server logging to `logs/app.log`, automatic rotation to `app.log.1` when exceeding 10 MB, and `LOG_FILE_PATH` / `LOG_DIR` overrides. |
| [rpc-validation.test.ts](../tests/integration/server/rpc-validation.test.ts) | [rpcSchemas.ts](../src/server/rpcSchemas.ts) | `BR-001`, `BR-002`, `BR-039`, `BR-046`: Zod schema validation rejecting invalid calendar dates (e.g., `2026-02-31`), non-integer cent amounts, unsupported currencies, and malformed RPC payloads. |
| [sqlite-repository.test.ts](../tests/integration/server/sqlite-repository.test.ts) | [sqliteRepository.ts](../src/server/sqliteRepository.ts) | `BR-008`, `BR-010`, `BR-011`, `BR-014`, `BR-022`–`BR-024`, `BR-028`, `BR-030`, `BR-031`, `BR-039`–`BR-041`: Full SQLite persistence lifecycle, 90-day windowed loading, SQL pre-window balance rollups, straddling credit card statements, read-only search invariant, and system entity protection. |
| [FinanceContext.test.tsx](../tests/integration/state/FinanceContext.test.tsx) | [FinanceContext.tsx](../src/app/state/FinanceContext.tsx) | `BR-008`, `BR-041`, `BR-043`: Workspace hydration, optimistic draft mutations, 6,000ms deferred deletion undo window (`UNDO_WINDOW_MS = 6000`), `pagehide` flush, and historical transaction window expansion. |
| [NotificationsContext.test.tsx](../tests/integration/state/NotificationsContext.test.tsx) | [NotificationsContext.tsx](../src/app/state/NotificationsContext.tsx) | `BR-044`, `BR-045`: Toast dispatch channels (`success`, `info`, `error`, `validation`, `undoable`, `successWhen`), activity logging, and debounced `reportSyncError` with 10-second resync circuit breaker. |
| [SettingsContext.test.tsx](../tests/integration/state/SettingsContext.test.tsx) | [SettingsContext.tsx](../src/app/state/SettingsContext.tsx) | Optimistic settings reducer dispatch, repository RPC persistence synchronization, and `reportSyncError` triggering on persistence failure. |

### 3. Component Tests (`tests/components/`)

| Test File | Target Component | Verified UI Behaviors & Business Rules |
| :--- | :--- | :--- |
| [DeleteAccountDialog.test.tsx](../tests/components/accounts/DeleteAccountDialog.test.tsx) | [DeleteAccountDialog.tsx](../src/app/features/accounts/DeleteAccountDialog.tsx) | `BR-023` (`Flow K`): Blocks deletion of accounts with transactions (offering "Archive Instead") or the last active account; allows deleting empty non-system accounts with undoable notification. |
| [GoalCategoryDialog.test.tsx](../tests/components/goals/GoalCategoryDialog.test.tsx) | [GoalCategoryDialog.tsx](../src/app/features/goals/GoalCategoryDialog.tsx) | `BR-032` (`Flow M`): Creating and editing budget goal categories, validating name and $0\%$–$100\%$ percentage bounds, and mapping/reassigning expense transaction types. |
| [ElectronThemeSync.test.tsx](../tests/components/layout/ElectronThemeSync.test.tsx) | [ElectronThemeSync.tsx](../src/app/layout/ElectronThemeSync.tsx) | Desktop IPC theme hydration (`getDesktopPreferences`), user theme change synchronization (`setThemeSource`), and OS theme broadcast handling (`onSystemThemeChange`). |
| [ErrorBoundary.test.tsx](../tests/components/system/ErrorBoundary.test.tsx) | [ErrorBoundary.tsx](../src/app/components/shared/ErrorBoundary.tsx), [ErrorFallback.tsx](../src/app/components/shared/ErrorFallback.tsx) | `BR-046`: Catches render exceptions, displays recovery UI, copies diagnostic breadcrumb logs to clipboard, downloads `.log` files, and resets boundary state. |
| [OfflineBanner.test.tsx](../tests/components/system/OfflineBanner.test.tsx) | [OfflineBanner.tsx](../src/app/components/shared/OfflineBanner.tsx) | Renders offline status banner when `syncStatus === 'offline'` and triggers `reloadWorkspace()` on retry. |
| [DeleteTransactionDialog.test.tsx](../tests/components/transactions/DeleteTransactionDialog.test.tsx) | [DeleteTransactionDialog.tsx](../src/app/components/shared/transaction-dialogs/DeleteTransactionDialog.tsx) | `BR-010`, `BR-014`, `BR-022` (`Flow C`, `Flow E`, `Flow H`): Confirmation dialogs for single transactions, dual-leg transfers, full installment series, and recurring scope selection (`only-this`, `this-and-future`, `all`). |
| [TransactionFormDialog.test.tsx](../tests/components/transactions/TransactionFormDialog.test.tsx) | [TransactionFormDialog.tsx](../src/app/components/shared/transaction-dialogs/TransactionFormDialog.tsx) | `BR-002`, `BR-006`, `BR-008`, `BR-012`, `BR-025` (`Flow A`, `Flow B`, `Flow D`, `Flow F`): Form validation across single, installment, recurring, and transfer modes, account payment method filtering, and cross-currency transfer rate previews. |
| [AppUpdatesCard.test.tsx](../tests/components/settings/AppUpdatesCard.test.tsx) | [AppUpdatesCard.tsx](../src/app/features/settings/AppUpdatesCard.tsx), [AppUpdatesContext.tsx](../src/app/state/AppUpdatesContext.tsx) | `BR-047` (`Flow V`): Automatic startup update check, manual "Check for Updates" trigger, release channel switching (`Full Releases Only` vs. `Include Pre-releases`), `localStorage` persistence, and error alert rendering. |

### 4. End-to-End Flow Tests (`tests/e2e/flows/`)

| E2E Spec File | Related Flow in `flows.md` | Verified Rules (`spec.md`) | End-to-End Journey Summary |
| :--- | :--- | :--- | :--- |
| [transaction-lifecycle.spec.ts](../tests/e2e/flows/transaction-lifecycle.spec.ts) | Flow A, Flow B, Flow C | `BR-001`, `BR-002`, `BR-043`, `BR-045` | Creates, edits, and deletes single transactions, verifying table rendering, Dashboard KPI updates, and 6-second undo restoration. |
| [installments.spec.ts](../tests/e2e/flows/installments.spec.ts) | Flow D, Flow E | `BR-006`–`BR-010` | Creates a 3-part installment purchase with cent-exact remainder distribution and month-end clamping, and deletes the installment series. |
| [accrual-view.spec.ts](../tests/e2e/flows/accrual-view.spec.ts) | Flow D | `BR-009` | Verifies installment series appear as a single consolidated accrual purchase (`-1`) on `/transactions` while displaying monthly charges on `/accounts/:id`. |
| [account-transfers.spec.ts](../tests/e2e/flows/account-transfers.spec.ts) | Flow F | `BR-011`, `BR-012`, `BR-014` | Executes internal transfers between accounts, verifying dual reciprocal legs, synchronized edits/deletions, and invariant net worth. |
| [cross-currency-transfer.spec.ts](../tests/e2e/flows/cross-currency-transfer.spec.ts) | Flow F | `BR-003`, `BR-005`, `BR-012`, `BR-013` | Executes cross-currency (`USD` $\leftrightarrow$ `BRL`) transfers, verifying send/receive amounts, effective exchange rate labels, and multi-currency pocket balances. |
| [credit-card-statements.spec.ts](../tests/e2e/flows/credit-card-statements.spec.ts) | Flow L | `BR-015`–`BR-019` | Configures credit card closing/due days, records purchases before and after `closingDay`, and verifies billing cycle separation and limit usage. |
| [recurring-subscriptions.spec.ts](../tests/e2e/flows/recurring-subscriptions.spec.ts) | Flow G, Flow H | `BR-020`–`BR-022`, `BR-043` | Schedules monthly recurring rules, verifies forward projections, and tests stopping recurrence (`canceledAt`) vs. permanent rule deletion. |
| [accounts-lifecycle.spec.ts](../tests/e2e/flows/accounts-lifecycle.spec.ts) | Flow I, Flow J, Flow K | `BR-023`–`BR-027` | Creates depository and credit accounts, archives and restores accounts, verifies deletion safeguard on accounts with transactions, and deletes empty accounts. |
| [settings-reassignment.spec.ts](../tests/e2e/flows/settings-reassignment.spec.ts) | Flow P, Flow Q, Flow R, Flow S | `BR-028`–`BR-031` | Creates custom transaction categories and payment methods, assigns them to transactions, enforces mandatory replacement selection on delete, and verifies system entity protection. |
| [budget-alerts.spec.ts](../tests/e2e/flows/budget-alerts.spec.ts) | Flow M, Flow N | `BR-032`–`BR-037` | Configures budget goal allocations ($100\%$ invariant) and reference income, logs expenses crossing warning ($85\%$) and critical ($100\%$) thresholds, and verifies parity between `NotificationCenter` and Dashboard `SmartInsightsContent`. |
| [search.spec.ts](../tests/e2e/flows/search.spec.ts) | Flow O | `BR-038`–`BR-040` | Tests `GlobalSearch` keyboard shortcuts (`Ctrl+K`, `/`), accent-insensitive trigram matching, highlighted results, and full search navigation (`/transactions?q=`). |
| [i18n-theming.spec.ts](../tests/e2e/flows/i18n-theming.spec.ts) | Flow T | `BR-044` | Switches display locale (`en-US` $\leftrightarrow$ `pt-BR`), currency (`USD` $\leftrightarrow$ `BRL`), and theme (`dark` $\leftrightarrow$ `light`), verifying persistence across reloads. |
| [offline-sync-recovery.spec.ts](../tests/e2e/flows/offline-sync-recovery.spec.ts) | Exceptional Flows | `BR-004`, `BR-037`, `BR-045` | Simulates API network failures, verifies `OfflineBanner` and `system-offline` alert rendering, and confirms automatic resynchronization upon reconnection. |
| [workspace-reset.spec.ts](../tests/e2e/flows/workspace-reset.spec.ts) | Flow U | `BR-042` | Exercises the development-mode workspace reset dialog, verifying clean state rehydration without page reload. |
| [responsive-layout.spec.ts](../tests/e2e/flows/responsive-layout.spec.ts) | All Flows (Layout Invariant, Flow W, Flow X) | Responsive Design Invariant | Audits all routes and dialogs across compact phones (`360px`), tablets (`768px`), and desktop monitors (`1440px+`) using `expectNoHorizontalOverflow`, and verifies desktop sidebar collapse/expand, `localStorage` persistence, `Ctrl+B` shortcut, and the Keyboard Shortcuts dialog (`?`). |
