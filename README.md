# Finance Tracker

[![React](https://img.shields.io/badge/React-18.3-blue.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.3-purple.svg?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.1-38bdf8.svg?logo=tailwindcss)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/SQLite-better--sqlite3-003B57.svg?logo=sqlite)](https://www.sqlite.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.45-C5F74F.svg?logo=drizzle)](https://orm.drizzle.team/)
[![Radix UI](https://img.shields.io/badge/Radix_UI-Primitives-black.svg?logo=radix-ui)](https://www.radix-ui.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

**Finance Tracker** is a personal finance tracking dashboard. It combines intuitive financial analytics, cash flow forecasting, multi-account management, automated credit card statement tracking, goals and budget management, and installment tracking.

The user interface was originally developed from the [Lindgo – Futuristic Fintech SaaS Dashboard Design Figma template](https://www.figma.com/design/VrmhSK4XpPMgxYQcHpQXrv/Lindgo-%E2%80%93%20Futuristic%20Fintech%20SaaS%20Dashboard%20Design).

---

## Table of Contents

- [Key Features](#key-features)
    - [Dashboard & Analytics](#dashboard--analytics)
    - [Transaction Management & Installments](#transaction-management--installments)
    - [Accounts & Cash Flow Forecasting](#accounts--cash-flow-forecasting)
    - [Credit Card Statement Engine](#credit-card-statement-engine)
    - [Goals & Budget Management](#goals--budget-management)
    - [Multi-Currency & Internationalization](#multi-currency--internationalization)
    - [Persistence & Database Architecture](#persistence--database-architecture)
    - [Workspace Customization & Settings](#workspace-customization--settings)
- [Tech Stack](#tech-stack)
- [Project Architecture](#project-architecture)
- [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Development Server](#development-server)
    - [Production Build](#production-build)
- [Available Scripts](#available-scripts)
- [Design System & Theming](#design-system--theming)
- [Code Quality & Conventions](#code-quality--conventions)
- [Attributions & Acknowledgments](#attributions--acknowledgments)

---

## Key Features

### Dashboard & Analytics

- **Executive KPI Cards**: Real-time cards displaying Total Balance, Monthly Revenue, Net Savings, and Savings Rate with micro-trend sparklines.
- **Interactive Revenue Chart**: Interactive area chart powered by Recharts with time period toggles (`7D`, `1M`, `1Y`) and responsive tooltips.
- **Spending by Category Breakdown**: Visual doughnut and list breakdowns illustrating expense allocations across transaction types and goal categories with colored badge legends.
- **Recent Transactions Ledger**: Quick-glance ledger with categorized transactions, account tags, signed value formatting, and inline quick actions.

### Transaction Management & Installments

- **Full Transaction Lifecycle**: Support for single income/expense entries, account transfers, and multi-installment purchases.
- **Linked Account Transfers**: Dual-leg transfer architecture ensuring balanced movements across accounts.
- **Cent-Exact Installment Splitting**: Automatically splits total cost across configurable monthly terms (up to 48 months), allocating remainder cents to the initial installment, clamping overflow dates, and tracking installment progress badges (e.g. `1/12`).
- **Recurring Transactions**: Scheduled recurring rules with frequency, interval, start date, and optional recurrence limits.
- **Comprehensive Filtering**:
    - Period filtering (Today, Up to today, Current month, Last month, This year, All time, Custom range).
    - Transaction type / category multi-select.
    - Cash flow direction (Income, Expense, All).
    - Payment method filter (Credit card, Debit card, Cash, PIX, Bank transfer).
    - Account and currency scope filters.
- **Grouped Monthly View**: Chronological breakdown with sticky monthly headers and quick inline edit/delete actions.

### Accounts & Cash Flow Forecasting

- **Multi-Account & Multi-Currency**: Manage checking, savings, and cash accounts with multi-currency pockets (`USD`, `BRL`, `EUR`), custom neon color coding, initials, and opening balances.
- **Balance Projection Engine**: Daily series calculation projecting future account balances based on scheduled incomes, pending expenses, and upcoming card bill payments.
- **Forecasting Horizons**: Inspect projected balances by End of Month, 30 days, 60 days, 90 days, All time, or a custom cutoff date.
- **Upcoming In / Out Ledger**: Detailed breakdown of expected cash movements and net balances.

### Credit Card Statement Engine

- **Automated Billing Cycles**: Automatically calculates closing dates, payment due dates, and billing periods based on configured card rules.
- **Statement Status Tracking**: Tracks open, closed, and paid statement periods.
- **Credit Limit & Utilization**: Real-time gauge of total credit limit, used credit, and remaining available balance.
- **Automatic Bill Resolution**: Closes statements and registers upcoming invoice settlements directly into account cash movements.

### Goals & Budget Management

- **Budget Overview**: Monthly budget tracking comparing actual expenses against defined budget targets.
- **Interactive Allocation Sliders**: Dynamic category percentage allocations that auto-normalize and calculate monthly budgets based on expected income.
- **Goal Visualizations**: Visual donut distribution and progress meters for custom financial targets.
- **Dynamic Type Mapping**: Link transaction types to broad goal categories (e.g., Needs, Wants, Savings) to automatically categorize incoming and outgoing cash flows.

### Multi-Currency & Internationalization

- **Native Bilingual Support**: Fully localized in English (`en-US`) and Portuguese (`pt-BR`) with symmetric locale dictionaries and instant language switching.
- **Multi-Currency Pockets & FX Conversion**: Transact in multiple currencies with live or configurable exchange rates and consolidated base currency views.
- **Integer Cents Precision**: Zero floating-point rounding errors—all transactions, balances, and allocations are calculated in integer cents.

### Persistence & Database Architecture

- **SQLite Database with Drizzle ORM**: Persistent local storage powered by `better-sqlite3` and type-safe schema migrations via Drizzle ORM.
- **Isolated Dev and Prod Databases**: Development server (`npm run dev`) persists strictly to `data/finance-tracker.dev.db` (seeded with developer test fixtures), while production and preview server (`npm run preview`) persist strictly to `data/finance-tracker.prod.db` (seeded with clean production defaults).
- **Environment Variable Controls**: Override SQLite database paths via `DATABASE_PATH` (global override), `DEV_DATABASE_PATH`, or `PROD_DATABASE_PATH`.
- **Repository Abstraction**: UI layers interact with a unified `FinanceRepository` interface (`httpRepository` backed by Vite API middleware in local development, with `inMemoryRepository` for isolated environments and testing).
- **Clean Separation of Defaults and Fixtures**: Production defaults (`src/app/data/defaults/`) are strictly isolated from developer mock datasets (`src/app/data/fixtures/`).

### Workspace Customization & Settings

- **Custom Transaction Categories**: Create, edit, and delete income/expense categories with custom neon color palettes and 30+ Lucide icons.
- **Drag-and-Drop Reordering**: Sortable category management with persistent state.
- **Payment Method Management**: Configure standard payment channels and credit card behaviors.
- **Futuristic Glassmorphism Theme**: Cyberpunk visual styling with backdrop blur, custom CSS variables, and light/dark theme switching via `next-themes`.

---

## Tech Stack

- **Framework**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) (strict mode)
- **Routing**: [React Router 7](https://reactrouter.com/)
- **Build Tool**: [Vite 6](https://vitejs.dev/) with `@vitejs/plugin-react` and `@tailwindcss/vite`
- **Database & ORM**: [SQLite](https://www.sqlite.org/) via [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) and [Drizzle ORM](https://orm.drizzle.team/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with CSS variables and OKLCH color spaces
- **UI Components**: [Radix UI](https://www.radix-ui.com/) primitives & [shadcn/ui](https://ui.shadcn.com/)
- **Charts & Data Visualization**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Theming**: [next-themes](https://github.com/pacocoursey/next-themes)
- **Code Quality**: [ESLint 9](https://eslint.org/), [Prettier](https://prettier.io/), [Commitlint](https://commitlint.js.org/), and [Husky](https://typicode.github.io/husky/)

---

## Project Architecture

```
.
├── src/
│   ├── main.tsx                    # Application entry point
│   ├── vite-env.d.ts               # Vite environment types
│   ├── styles/                     # Design tokens & stylesheet definitions
│   │   ├── index.css               # Base styles & Tailwind v4 theme imports
│   │   ├── tokens.css              # Theme CSS variables (:root & .dark)
│   │   ├── palette.css             # Neon accents, badges, dots, and glow shadows
│   │   ├── tailwind-theme.css      # @custom-variant & @theme variable mappings
│   │   └── base.css                # Base typography and resets
│   ├── db/                         # Database schema & SQLite configuration (Drizzle ORM)
│   │   ├── schema.ts               # Drizzle schema (accounts, transactions, categories, etc.)
│   │   ├── client.ts               # better-sqlite3 database connection and migrations
│   │   └── seedDatabase.ts         # Initial database population engine
│   ├── server/                     # Server plugins & repository adapters
│   │   ├── apiPlugin.ts            # Vite dev server middleware API routes (/api/finance/*)
│   │   └── sqliteRepository.ts     # SQLite-backed implementation of FinanceRepository
│   └── app/
│       ├── App.tsx                 # Root application layout & page router
│       ├── layout/                 # Shell layout (TopNavigation, Sidebar)
│       ├── features/               # Domain feature modules
│       │   ├── dashboard/          # DashboardPage, KPIs, AnalyticsVisualizer, SpendingBreakdownCard
│       │   ├── accounts/           # AccountsPage, AccountDetailPage, statement views, projections
│       │   ├── transactions/       # TransactionsPage, filter panels, RecurringRulesDialog
│       │   ├── goals/              # BudgetOverview, GoalCategoryAllocationSliders, GoalsConfigPanel
│       │   └── settings/           # Workspace preferences, payment methods, transaction types
│       ├── components/
│       │   ├── primitives/         # Primitive UI components (Radix UI / shadcn/ui)
│       │   └── shared/             # Reusable widgets (CategoryChip, DateField, transaction-dialogs/)
│       ├── data/                   # Core business logic engines
│       │   ├── analytics.ts        # KPI calculations, revenue series, and spending breakdown
│       │   ├── cardStatements.ts   # Credit card billing cycle & statement calculation engine
│       │   ├── currency.ts         # Currency conversion, exchange rates & cent/dollar utilities
│       │   ├── dates.ts            # Date clamping and calendar formatting utilities
│       │   ├── defaults/           # Minimal production defaults (defaultSettings, defaultGoals)
│       │   ├── fixtures/           # Mock demo data (mockAccounts, mockRules, mockTransactions)
│       │   ├── goals.ts            # Budget goals, target rules, and progress calculations
│       │   ├── icons.ts            # Lucide icon mapping registry
│       │   ├── installments.ts     # Cent-exact multi-month installment division logic
│       │   ├── ledger.ts           # Cash movements and daily forecast engine
│       │   ├── recurring.ts        # Recurring transaction projection engine
│       │   ├── repository/         # FinanceRepository interface & HTTP/in-memory implementations
│       │   ├── settings.ts         # Category and payment method configuration models
│       │   └── transactions.ts     # Transaction entities, types, and helper methods
│       ├── i18n/                   # Bilingual internationalization (en-US, pt-BR)
│       │   ├── I18nContext.tsx     # Locale and currency React context & formatters
│       │   └── locales/            # Localization dictionary files (en.ts, pt.ts)
│       └── state/                  # State management
│           ├── FinanceContext.tsx  # Central finance repository state & synchronization
│           ├── SettingsContext.tsx # Workspace settings React context
│           └── settingsReducer.ts  # Reducer for workspace configurations
├── guidelines/                     # Engineering and design system guidelines
├── package.json                    # Dependencies and npm scripts
├── vite.config.ts                  # Vite build, server, and API plugin configuration
└── tsconfig.json                   # TypeScript compiler configuration
```

---

## Getting Started

### Prerequisites

- **Node.js**: `v22.x` (enforced via `.nvmrc`, `.node-version`, and `.mise.toml`)
- **Package Manager**: [pnpm](https://pnpm.io/) (`>= 10.0.0`) or [npm](https://www.npmjs.com/)

### Installation

Clone the repository and install dependencies:

```bash
# Clone the repository
git clone <repository-url>
cd finance-tracker

# Install dependencies using pnpm (preferred)
pnpm install

# Alternatively using npm
npm install
```

### Development Server

Start the local Vite development server:

```bash
pnpm dev
# or
npm run dev
```

The application will start on `http://localhost:8443` (or the port defined by the `$PORT` environment variable). Hot Module Replacement (HMR) is active by default.

### Production Build

Create an optimized production bundle:

```bash
pnpm build
# or
npm run build
```

To preview the production build locally:

```bash
pnpm preview
# or
npm run preview
```

### Desktop Application (Electron)

Run the desktop application natively:

```bash
pnpm electron:dev
# or
npm run electron:dev
```

Generate a standalone executable bundle (`.AppImage` and `.deb` in `release/`):

```bash
pnpm electron:dist
# or
npm run electron:dist
```

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Starts the Vite development server with hot reload |
| `pnpm build` | Compiles TypeScript and builds the production bundle in `dist/` |
| `pnpm build:electron` | Bundles the Electron main process into `dist-electron/main.cjs` |
| `pnpm preview` | Serves the production build locally for verification |
| `pnpm electron:dev` | Builds frontend and Electron main, then launches the desktop application |
| `pnpm electron:dist` | Packages the application into standalone desktop executables (`release/`) |
| `pnpm test` | Runs all application tests (Vitest unit, integration, components + Playwright E2E) |
| `pnpm test:unit` | Runs unit tests via Vitest (`tests/unit`) |
| `pnpm test:integration` | Runs integration tests via Vitest (`tests/integration`) |
| `pnpm test:components` | Runs component tests via Vitest (`tests/components`) |
| `pnpm test:e2e` | Runs Playwright end-to-end tests covering all user journeys |
| `pnpm lint` | Runs both TypeScript type checking (`lint:tsc`) and ESLint (`lint:ts`) |
| `pnpm lint:tsc` | Runs `tsc --noEmit` to verify type safety across the project |
| `pnpm lint:ts` | Executes ESLint across all source files with zero-warning tolerance |
| `pnpm lint:fix` | Automatically fixes ESLint rule violations |
| `pnpm format` | Formats source files using Prettier |
| `pnpm prettier` | Formats TypeScript and CSS files using Prettier |
| `pnpm commitlint` | Validates git commit messages against Conventional Commits |

---

## Design System & Theming

Finance Tracker features a dark-mode-first aesthetic with luminous cyan, violet, emerald, and amber accents.

- **Color Tokens**: Configured via CSS variables in `src/styles/tokens.css` and `src/styles/palette.css` using OKLCH color palettes.
- **Glassmorphism**: Built with semi-transparent backgrounds (`bg-foreground/5`), backdrop blur (`backdrop-blur-xl`), and delicate border highlights.
- **Dark & Light Mode**: Managed through `next-themes` with the toggle button positioned in the top navigation bar.
- **Typography & Icons**: Base typography defined in `src/styles/base.css` and Lucide icon mappings in `src/app/data/icons.ts`.

---

## Code Quality & Conventions

- **Strict TypeScript**: Full type coverage for transactions, accounts, statements, and state actions without implicit `any`.
- **Git Commit Standards**: Enforced with [Conventional Commits](https://www.conventionalcommits.org/) via Husky and Commitlint (`feat:`, `fix:`, `refactor:`, `chore:`, etc.).
- **Linting & Formatting**: Clean code standards maintained via ESLint 9 flat config and Prettier.
- **Continuous Integration**: GitHub Actions workflow (`.github/workflows/ci.yml`) runs on PRs targeting `main` and `develop` to validate commits, lint the codebase, compile the production build, and execute the full test suite.
- **Documentation Standards**: Application architecture, user flows, interfaces, state models, and business specifications are maintained under `docs/` using standardized templates and validated checklists via the `app-doc-generation` agent skill.

---

## Attributions & Acknowledgments

- **UI Design**: [Lindgo – Futuristic Fintech SaaS Dashboard Design on Figma](https://www.figma.com/design/VrmhSK4XpPMgxYQcHpQXrv/Lindgo-%E2%80%93%20Futuristic%20Fintech%20SaaS%20Dashboard%20Design).
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) used under the [MIT License](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md).
- **Icons**: [Lucide Icons](https://lucide.dev/) under the [ISC License](https://github.com/lucide-icons/lucide/blob/main/LICENSE).
