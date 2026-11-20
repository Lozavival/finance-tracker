# Finance Tracker

React 18 + Vite 6 + Tailwind CSS v4 + TypeScript personal finance and cash flow dashboard.

---

## Development Server & Commands

- **Dev Server**: Vite server runs on `$PORT` (default `8443`) with Hot Module Replacement (HMR).
- **Type Checking**: `npm run lint:tsc` (`tsc --pretty --noEmit`)
- **Linting**: `npm run lint:ts` (ESLint 9 with flat config and zero-warning tolerance)
- **Full Verification**: `npm run lint` (runs `lint:tsc && lint:ts`)
- **Auto-Fix Lint**: `npm run lint:fix`
- **Formatting**: `npm run format` (`prettier`)
- **Build**: `npm run build` (`vite build`)
- **Preview**: `npm run preview`
- **Electron Main Build**: `npm run build:electron` (`vite build --config vite.electron.config.ts`)
- **Electron Desktop Run**: `npm run electron:dev`
- **Electron Package / Dist**: `npm run electron:dist` (`electron-builder`)
- **Full Application Tests**: `npm test` (`vitest run && playwright test` running all unit, integration, component, and multi-viewport E2E suites)
- **Unit & Integration Tests**: `npm run test:unit`, `npm run test:integration`, `npm run test:components`
- **End-to-End Tests**: `npm run test:e2e` (`playwright test` covering all 15 user journeys across `desktop`, `tablet`, and `mobile` projects)
- **Continuous Integration (CI)**: GitHub Actions workflow (`.github/workflows/ci.yml`) triggered on PRs to `main` or `develop`. Executes commit linting, codebase linting, application build, and the full test suite.

---

## Agent & Git Skills Workflow

### UI Review (`ui-code-review` Skill)
- **Always activate when editing UI**: When designing, implementing, or reviewing UI components, styles, or dialogs, consult and follow the [ui-code-review](.agents/skills/ui-code-review/SKILL.md) skill to audit semantic tokens, theme colors, and component boundaries.

### Server & Model Review (`server-code-review` Skill)
- **Always activate when editing backend or domain logic**: When designing, implementing, or reviewing database schemas, migrations, API endpoints, repository methods, or domain calculation engines (`src/server/`, `src/db/`, `src/app/data/`), consult and follow the [server-code-review](.agents/skills/server-code-review/SKILL.md) skill to audit schema integrity, transactions, Zod validations, integer cents invariants, and workspace isolation.

### Commit Messages (`commit-message-generator` Skill)
- **Always activate the skill**: When preparing or creating git commits, consult and follow the [commit-message-generator](.agents/skills/commit-message-generator/SKILL.md) skill.
- **Git Hooks Enforced via Husky**:
  - `pre-commit`: Automatically runs `npm run lint`. Ensure all TypeScript and ESLint checks pass before committing.
  - `commit-msg`: Enforces Conventional Commits and custom rules defined in `commitlint.config.ts`.
- **Commit Rules Checklist**:
  - **Header**: `<type>(<optional scope>): <short description>`
  - **Header length**: Maximum 72 characters.
  - **Casing & mood**: Lowercase, imperative mood (e.g. `feat(ui): add transaction modal`, not `Added`).
  - **Body**: Blank line after header, lines wrapped at 80 characters max, explain what and why.
  - **Whitespace**: No hard tabs (`\t`) anywhere; no trailing whitespace in header, body, or footer.
  - **Execution**: Pass multiple `-m` flags (e.g., `git commit -m "<header>" -m "<body>"`) so Git generates clean paragraph breaks.

### Documentation Generation (`app-doc-generation` Skill)
- **Always activate when creating or updating app documentation**: When writing, updating, or standardizing flow, interface, specification, data model, or test documentation artifacts (`docs/flows.md`, `docs/interfaces.md`, `docs/spec.md`, `docs/data-model.md`, `docs/testing.md`), consult and follow the [app-doc-generation](.agents/skills/app-doc-generation/SKILL.md) skill to maintain structural consistency, checklist validation, and reference template alignment.

---

## Architecture & Code Structure

The application is structured into domain-driven modules inside `src/`:

```
electron/
└── main.ts                       # Desktop window, loopback HTTP server & lifecycle management
src/
├── main.tsx                      # Application entry point
├── styles/
│   ├── index.css                 # Root styles entry (Tailwind, tw-animate, imports)
│   ├── tokens.css                # Semantic theme tokens (:root & .dark)
│   ├── palette.css               # Neon accents, badges, dots, and glow shadows
│   ├── tailwind-theme.css        # @custom-variant & @theme inline variable mappings
│   └── base.css                  # @layer base reset and default typography
├── db/                           # SQLite database schema and persistence (Drizzle ORM)
│   ├── schema.ts                 # Drizzle schema (accounts, transactions, rules, settings)
│   ├── client.ts                 # better-sqlite3 database connection and migrations
│   └── seedDatabase.ts           # Production / initial database population engine
├── server/                       # Server plugins and repository adapters
│   ├── apiPlugin.ts              # Vite dev server middleware API routes (/api/finance/*)
│   ├── logger.ts                 # Server-side structured logger, performance timing, and request tracing
│   ├── rpcSchemas.ts             # Zod input validation schemas for RPC actions
│   └── sqliteRepository.ts       # SQLite implementation of FinanceRepository
└── app/
    ├── App.tsx                   # Main layout and top-level view routing
    ├── layout/                   # App shell components (TopNavigation, GlobalSearch, Sidebar, MobileNavDrawer)
    ├── features/                 # Domain feature modules
    │   ├── dashboard/            # DashboardPage, KPIs, AnalyticsVisualizer, SpendingBreakdownCard, SmartInsightsContent
    │   ├── accounts/             # Account lists, balance projections & statement views
    │   ├── transactions/         # TransactionsPage, filters, SearchFilter, RecurringRulesDialog
    │   ├── goals/                # BudgetOverview, category targets, and goals panels
    │   └── settings/             # Workspace preferences, payment methods, transaction types, NotificationsPanel
    ├── components/
    │   ├── primitives/           # Primitive UI components (Radix UI / shadcn/ui)
    │   └── shared/               # Reusable domain components (ErrorBoundary, ErrorFallback, OfflineBanner, CategoryChip, HighlightedText, DateField, OptionSelect, ColorPicker, IconPicker, transaction-dialogs/)
    ├── lib/
    │   ├── logger.ts             # Hierarchical client logger, breadcrumb buffer & error tracing
    │   ├── useMediaQuery.ts      # Reactive media query and breakpoint hooks (useBreakpoint, useMediaQuery)
    │   └── utils.ts              # Global utility functions (cn class merging)
    ├── data/
    │   ├── analytics.ts          # Financial KPI calculations and spending analysis
    │   ├── cardStatements.ts     # Billing cycle calculation & statement closing engine
    │   ├── currency.ts           # Multi-currency conversions, rates & cent/dollar utilities
    │   ├── dates.ts              # Date clamping and calendar formatting utilities
    │   ├── defaults/             # Minimal production defaults (defaultSettings, defaultTypes, defaultGoals)
    │   ├── fixtures/             # Demo / mock fixtures (mockAccounts, mockRules, mockTransactions, devSettings)
    │   ├── goals.ts              # Budget goals, target rules, and progress calculations
    │   ├── icons.ts              # Lucide icon mapping registry
    │   ├── installments.ts       # Cent-exact multi-month installment division logic
    │   ├── ledger.ts             # Cash movement models and daily forecasting series
    │   ├── notifications.ts      # Financial alerts, alert state pruning, and activity definitions
    │   ├── recurring.ts          # Recurring rule projection and scheduling engine
    │   ├── repository/           # FinanceRepository interface, HTTP & in-memory implementations
    │   ├── search.ts             # Full-history search normalization, tokenization, FTS expressions & result grouping
    │   ├── settings.ts           # Workspace setting interfaces and helper methods
    │   └── transactions.ts       # Transaction entities, types, and helper methods
    ├── i18n/                     # Localization context, bilingual strings (en, pt), formatters
    └── state/
        ├── FinanceContext.tsx    # Core finance entity cache & repository synchronization
        ├── NotificationsContext.tsx # Central notification & toast dispatch (notify, activity log, sync error coalescing)
        ├── notificationStorage.ts # LocalStorage serialization for notification preferences & activity
        ├── SettingsContext.tsx   # Workspace settings React context
        ├── settingsReducer.ts    # Reducer actions for category & preference updates
        ├── useFinancialAlerts.ts # Unified heuristic signals, budget threshold, and offline alert hook
        ├── useTransactionActions.ts # Transaction mutation hooks
        └── useTransactionSearch.ts # Full-history debounced transaction search hook
```

---

## Engineering & Design System Guidelines

### 1. Domain Logic & Calculations (`src/app/data/`)
- Keep domain engines (installments, credit card statement closing cycles, daily balance forecasting, recurring rules, analytics, search) **pure and decoupled from React components**.
- Implement exact mathematical operations using **integer cents** throughout domain models (e.g., cent-exact split where remainder cents are allocated to the first installment; clamping payment due dates to the end of shorter months).
- Keep production defaults (`src/app/data/defaults/`) clean and decoupled from demo/test data (`src/app/data/fixtures/`). Production default goals start empty (`EMPTY_GOALS_CONFIG`).
- **Isolated Dev & Prod SQLite Databases**:
  - Development mode (`npm run dev`) persists strictly to `data/finance-tracker.dev.db` (seeded with dev mock fixtures).
  - Production mode (`npm run preview` or `NODE_ENV=production`) persists strictly to `data/finance-tracker.prod.db` (seeded with clean production defaults).
  - Override via environment variables: `DATABASE_PATH` (global override), `DEV_DATABASE_PATH`, or `PROD_DATABASE_PATH`.
  - Legacy Migration: If `data/finance-tracker.dev.db` does not exist but legacy `data/finance-tracker.db` exists, dev automatically checkpoints and copies developer data over, while production starts clean with zero cross-contamination.
- **Search Invariant**: Full-text index `transactions_fts` (FTS5 trigram) is maintained strictly via SQLite triggers in `client.ts` across all insert/update/delete operations. Never write directly to `transactions_fts` from application logic. Text normalization is unified under `foldText` in `src/app/data/search.ts` (mirrored in SQLite via custom deterministic `fold` function). Full-history search is read-only and must never alter `loadedFromDateStr` or client window state.

### 2. Design System & Aesthetics
- **Theme**: Dark-mode-first with neon accents (cyan, violet, emerald, amber).
- **Glassmorphism**: Use semi-transparent backdrops (`bg-foreground/5` or `bg-card/50`), blur filters (`backdrop-blur-xl`), and delicate borders (`border-border/40`).
- **Layouts**: Responsive flexbox and CSS grid layouts. Avoid arbitrary absolute positioning unless implementing overlays, floating badges, or tooltip anchors.
- **Icons**: Always import Lucide icons via `src/app/data/icons.ts` or directly from `lucide-react` using consistent sizing (`size-4`, `size-5`).
- **Theming**: Integrated with `next-themes` using CSS variables defined in `src/styles/tokens.css` and `src/styles/palette.css`.
- **Zero Hardcoded Colors Invariant**: **NEVER** use default Tailwind color palette classes (e.g. `emerald-500`, `cyan-400`, `amber-500`, `red-400`, `blue-600`, `slate-700`, `zinc-800`, etc.). Always use semantic theme tokens:
  - **Theme Accents**: `theme-cyan`, `theme-green`, `theme-blue`, `theme-orange`, `theme-purple`, `theme-red`, `theme-cyan-btn`, `theme-cyan-btn-hover` (e.g., `text-theme-cyan`, `bg-theme-cyan/15`, `border-theme-green/30`).
  - **Semantic UI Tokens**: `primary`, `primary-foreground`, `foreground`, `background`, `card`, `popover`, `muted`, `muted-foreground`, `accent`, `border`, `input`, `destructive` (e.g., `bg-card/50`, `border-border/40`, `text-destructive`).
  - **Dynamic Palette Token Namespace**: Use `--accent-*-raw`, `--accent-*-dot`, and `--accent-*-badge-*` (defined in `palette.css`). Avoid `--color-*-dot` to prevent collisions with Tailwind v4's internal `--color-*` engine.
- **Responsive Layout & Fluid Design Invariant**:
  - **Full Viewport Range**: Minimum supported viewport is 360px phones (`phone-compact`) up to 4K ultrawide desktop monitors with zero horizontal overflow regressions.
  - **Container Queries Over Window Breakpoints in Widgets**: Feature cards and panels (`SpendingBreakdownCard`, `AnalyticsVisualizer`, `GoalAllocationsDonut`, etc.) reside inside the main content column next to the 256px sidebar. Never rely solely on screen media queries (`md:`, `xl:`) for internal card layout, which overflow when sidebar width reduces column space. Always use Tailwind CSS `@container` and container query breakpoints (`@xs:`, `@sm:`, `@md:`, `@lg:`, `@xl:`).
  - **Chart Containment**: Recharts responsive containers inside flex/grid items must have `min-w-0` on their immediate wrappers to prevent SVG layout engines from measuring and retaining parent overflow dimensions.
  - **Numerical Data & Amounts**: All financial monetary values, rates, and counts in tables and summary cards must use `tabular-nums` for alignment stability and preventing jitter or text overflow.
  - **Dialog Viewport Clamping**: Dialogs and alert dialogs must have `max-h-[calc(100dvh-2rem)] overflow-y-auto` to prevent clipping on short or landscape mobile screens.
  - **Responsive Topbar & Shell**: Navigation switches adaptively between the persistent desktop `Sidebar` (>=1024px) and the accessible `MobileNavDrawer` sheet (<1024px). Mobile search expands in-place without displacing navigation actions.
  - **Zero Unintentional Horizontal Scroll**: Form controls, button strips, and filter bars must use `flex-wrap` and min-w clamping (`w-[min(...,calc(100vw-1rem))]`) to prevent expanding document `scrollWidth` and triggering mobile layout scaling.

### 3. Component Standards & Architecture
- **Dependency Rule**: `features/*` may import from `components/`, `layout/`, `lib/`, `data/`, `state/`, and `i18n/`. `components/*` must never import from `features/*`. Cross-feature reusable widgets belong in `components/shared/`.
- **Repository Pattern**: State contexts communicate with `FinanceRepository` (`httpRepository` in browser via Vite API middleware backed by SQLite, or `inMemoryRepository`).
- **Modularity & Sizing**: Decompose monolithic components or dialogs exceeding ~300 lines into focused subcomponents (e.g. separating chart visualizers, sliders, or selector rows).
- **Pragmatic DRY**: Keep distinct domain dialogs separate when validation or business constraints differ (e.g., `DeleteTypeDialog` vs. `DeleteMethodDialog`); avoid leaky generic wrappers.
- **System Entity Protection**: Never render destructive actions for system records (`transfer`, `cash`, `credit-card`). Require reassigning transactions before completing deletion of in-use entities.
- **Primitive UI Components (shadcn/ui & Radix UI)**: Never rebuild standard interactive UI patterns from scratch using raw HTML tags (`<button>`, `<input>`, `<select>`, custom modal overlays, custom checkboxes/switches). Always compose primitives from `src/app/components/primitives/` (`Button`, `Input`, `Dialog`, `AlertDialog`, `Select`, `Switch`, `Tabs`, `Card`, `Tooltip`, etc.) to guarantee accessibility, focus management, keyboard navigation, and design system cohesion.

### 4. Notifications & User Feedback
- **Unified Notification Architecture**: All user feedback is centralized in `NotificationsContext` and consumed via `useNotify()` or `useNotifications()`. Never invoke third-party toast libraries directly inside components.
- **Three Core Channels**:
  - **Toasts (Sonner)**: Immediate, temporary operational feedback (success, error, undo).
  - **Alerts (Bell & Dashboard Smart Insights)**: Automated financial detection (budget threshold warnings/critical, overspending streaks, spikes, upcoming statement obligations, negative cash flow, offline system state) derived via `useFinancialAlerts()`.
  - **Activity Log**: Persistent 30-day operation log displayed in the Notification Center's Activity tab with unread tracking.
- **Anti-Spam Operation Policy**:
  - **Silent**: In-page interactive adjustments (sliders, reordering, view toggles, currency scope filters) must never trigger toasts.
  - **Success (`notify.success` / `notify.successWhen`)**: Confirms entity creation, editing, or state changes where dialogs close or navigation occurs (e.g. saving a transaction, adding an account, modifying categories). When mutations are asynchronous, use `notify.successWhen(promise, ...)` to ensure confirmation is displayed only upon successful server persistence.
  - **Undoable (`notify.undoable`)**: **MANDATORY for all deletions and exclusions** (deleting a transaction, canceling/deleting recurring rules, deleting an account, deleting a goal category). Provide an explicit `onUndo` callback that restores the removed entity immediately.
  - **Validation (`notify.validation`)**: Ephemeral warning/error toasts for blocked forms or allocation errors. Never logged to the persistent activity log.
  - **Save & Sync Failures (`reportSyncError`)**: Any repository persistence failure must be reported through `reportSyncError`, triggering debounced error notifications and circuit-broken workspace resynchronization without crashing or silently swallowing errors (`.catch(() => {})` is forbidden).
- **Error Boundaries & Resilient Storage**:
  - Always guard application rendering at the root and route level using `ErrorBoundary` and `ErrorFallback`.
  - Always guard browser `localStorage` and `sessionStorage` accesses in `try/catch` blocks to prevent fatal initialization crashes in restricted browser environments.
  - Production initial client state must start with clean/empty defaults, never with test fixtures (`SEEDED_*` or `DEV_*`).
  - Validate incoming API payloads via Zod schemas to reject malformed requests with 400 Bad Request instead of internal server errors.
- **Single Source of Truth for Financial Alerts**: Both the top navigation `NotificationCenter` and the dashboard `DashboardKpisSection` (`SmartInsightsContent`) must derive active alerts exclusively through `useFinancialAlerts()`. Do not decouple dashboard signals from notification center alerts.

### 5. TypeScript, i18n & Code Quality
- **Strict Typing**: Strict TypeScript mode is enabled. Never use `any`—define explicit interfaces or types for all entity models, props, and function parameters.
- **Type-Safe Navigation**: Always use the `PageId` union in `src/app/layout/navigation.ts` for view switching.
- **Internationalization (i18n)**: No hardcoded user-facing strings in UI components. Add all strings symmetrically to `src/app/i18n/locales/en.ts` and `src/app/i18n/locales/pt.ts`. Entities such as transaction types and payment methods are user-editable data with canonical names, not dynamically localized keys.
- **Verification Rule**: Always run `npm run lint` and `npm run build` after editing TypeScript or CSS files to catch syntax, type, and lint errors immediately.
- **Color Audit Check**: Before finishing or committing UI modifications, verify that no default Tailwind palette scales were introduced:
  ```bash
  git diff | grep -E '\b(emerald|cyan|amber|rose|violet|indigo|sky|blue|red|green|yellow|slate|zinc|gray)-[0-9]{2,3}\b'
  ```

### 6. Logging, Error Tracing & Diagnostics
- **Client-Side Diagnostics (`src/app/lib/logger.ts`)**:
  - Hierarchical scoped loggers: `logger.child('Namespace')`.
  - Levels: `trace`, `debug`, `info`, `warn`, `error`, `silent` (configurable dynamically via `localStorage` key `ft_log_level` or `window.__FT_LOGGER__.setLevel`).
  - Circular Breadcrumb Buffer: Stores the last 300 log entries with timestamps, arguments, and serialized error traces. Developers or users can dump this via `window.__FT_LOGGER__.exportLogs()` or the "Copy Diagnostic Logs" button in `ErrorFallback`.
  - Log File Export: Client can trigger a direct `.log` file download via `logger.downloadLogsFile()` or `window.__FT_LOGGER__.downloadLogs()`, also available via "Download Log File" in `ErrorFallback`.
  - Remote Ingestion: Client automatically buffers and debounces forwarding `warn` and `error` events to `POST /api/logs` with `keepalive: true` to prevent data loss on page unload without recursive error loops.
  - Global Unhandled Traps: `logger.setupGlobalHandlers()` captures `window.onerror` and `unhandledrejection` events.
  - Zero Silent Failure: Empty catch blocks (`catch () {}` or `.catch(() => {})`) are strictly forbidden. Catch handlers must log errors or warnings with context.
- **Server-Side Diagnostics & Log Files (`src/server/logger.ts`)**:
  - Persistent Log File: Writes all server logs (`debug`, `info`, `warn`, `error`) to disk at `logs/app.log` (configurable via `LOG_FILE_PATH` / `LOG_DIR`), creating directories automatically.
  - Log File Rotation: Automatically rolls over the log file when it exceeds 10 MB, keeping one backup (`app.log.1`) to prevent disk exhaustion.
  - Structured request tracing with millisecond duration metrics: `[api] METHOD /path -> status (durationMs)`.
  - SQLite Transaction Hooks: Atomic transactions must log `[tx:begin]`, `[tx:commit]`, and `[tx:rollback]` on error.
  - Payload Validation Warnings: Log full Zod issue details when RPC validation fails.
- **Relative Imports in Shared Domain Engines**:
  - Modules in `src/app/data/` imported directly or indirectly by server code (e.g. `currency.ts`, `settings.ts`) must use relative paths when importing logger utilities (`../lib/logger`), as Node evaluates `vite.config.ts` prior to alias resolution.

---

## Feature & Bug-Fix Definition of Done (Code + Tests + Docs Protocol)

Every code change—whether a new feature, enhancement, refactor, or bug fix—must treat **implementation, automated tests, and documentation** as a single atomic unit of work. A task is **not complete** until all three are synchronized:

1. **Implementation & Verification**:
   - Implement the feature or fix adhering to domain, design system, and architectural rules.
   - Run `npm run lint` and `npm run build` to verify zero TypeScript, ESLint, or bundle regressions.
2. **Mandatory Test Coverage (`tests/`)**:
   - **New Features / Enhancements**: Write new unit, integration, component, or E2E tests covering the added behavior and its edge cases.
   - **Bug Fixes**: Always add a regression test that reproduces the bug and proves the fix, and update any existing tests affected by intentional behavioral changes.
   - Run the relevant test suites (`npm run test:unit`, `npm run test:integration`, `npm run test:components`, `npm run test:e2e`) to confirm 100% passing status.
3. **Mandatory Living Documentation Synchronization (`docs/` & `README.md`)**:
   - **Never allow documentation to drift behind code.** Whenever a change affects system behavior, inspect and update the corresponding documentation artifacts in the same task (consulting the [app-doc-generation](.agents/skills/app-doc-generation/SKILL.md) skill):
     - **[`docs/spec.md`](docs/spec.md)**: Add, update, or remove business rules (`BR-###`) whenever validation rules, calculations, thresholds, limits, or domain invariants change.
     - **[`docs/flows.md`](docs/flows.md)**: Update step-by-step user flows (`Flow A`–`Flow U`) or `Exceptional & Edge Flows` whenever UI journeys, dialog behaviors, or state transitions change.
     - **[`docs/interfaces.md`](docs/interfaces.md)**: Update the external interfaces table whenever environment variables, database files, HTTP endpoints/query params, Electron IPC channels, or `localStorage` keys are added or modified.
     - **[`docs/data-model.md`](docs/data-model.md)**: Update the ER diagram, table definitions, or index specifications whenever `src/db/schema.ts` or `src/db/client.ts` (`SCHEMA_DDL`) changes.
     - **[`docs/testing.md`](docs/testing.md)**: Update the test suite inventory and traceability tables whenever test files are added, renamed, or removed, or when test harness configurations change.

---

## Continuous Learning & Self-Improvement Protocol

`AGENTS.md` is a living document. Agents must continuously maintain and evolve this specification to capture hard-won knowledge, user feedback, and architectural invariants.

### 1. Triggers for Updating `AGENTS.md`
An agent must propose or apply updates to `AGENTS.md` whenever:
- **User Corrections**: The user corrects a pattern, rejects an implementation choice, clarifies a domain constraint, or establishes a new requirement.
- **Recurrent Gotchas & Bug Fixes**: A non-obvious bug or edge case is resolved (e.g., Radix `ScrollArea` requiring `overflow-hidden`, state synchronization pitfalls, subtle CSS collision rules in Tailwind v4).
- **Structural / Architectural Changes**: New modules, directories, domain services, or state contexts are introduced or refactored.
- **Design System Evolution**: New semantic tokens, component guidelines, or anti-spam notification rules are established.

### 2. Maintenance Rules
- **Keep it Actionable & Concise**: Document strict invariants, operational checklists, and prescriptive dos/don'ts. Avoid narrative bloat or redundant explanations.
- **Keep the File Tree Accurate**: Whenever new directories or architectural components are introduced (or removed), immediately update the `Architecture & Code Structure` tree in this document.
- **Preserve Ground Truth**: Rules in `AGENTS.md` take precedence during development. Never weaken architectural constraints (such as strict typing or zero hardcoded colors) without explicit user instruction.
- **Synchronize with Specialized Skills**: When modifying workflows or verification steps, ensure complementary skills (such as `ui-code-review`, `server-code-review`, `commit-message-generator`, and `app-doc-generation`) remain aligned with `AGENTS.md`.
