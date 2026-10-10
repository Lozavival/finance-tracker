# Finance Tracker

[![React](https://img.shields.io/badge/React-18.3-blue.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.3-purple.svg?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.1-38bdf8.svg?logo=tailwindcss)](https://tailwindcss.com/)
[![Radix UI](https://img.shields.io/badge/Radix_UI-Primitives-black.svg?logo=radix-ui)](https://www.radix-ui.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

**Finance Tracker** is a personal finance tracking dashboard. It combines intuitive financial analytics, cash flow forecasting, multi-account management, automated credit card statement tracking, and installment management.

The user interface was originally developed from the [Lindgo – Futuristic Fintech SaaS Dashboard Design Figma template](https://www.figma.com/design/VrmhSK4XpPMgxYQcHpQXrv/Lindgo-%E2%80%93%20Futuristic%20Fintech%20SaaS%20Dashboard%20Design).

---

## Table of Contents

- [Key Features](#key-features)
    - [Dashboard & Analytics](#dashboard--analytics)
    - [Transaction Management & Installments](#transaction-management--installments)
    - [Accounts & Cash Flow Forecasting](#accounts--cash-flow-forecasting)
    - [Credit Card Statement Engine](#credit-card-statement-engine)
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

- **Executive KPI Cards**: Real-time cards displaying Total Balance, Monthly Revenue, New Transactions, and AI Alerts with micro-trend sparklines.
- **Interactive Revenue Chart**: Interactive area chart powered by Recharts with time period toggles (`7D`, `1M`, `1Y`) and responsive tooltips.
- **Spending by Category Breakdown**: Visual doughnut/pie chart illustrating expense allocations with colored badge legends.
- **Recent Transactions Ledger**: Quick-glance ledger with categorized transactions, account tags, and signed value formatting.

### Transaction Management & Installments

- **Full Transaction Lifecycle**: Support for single income/expense entries, account transfers, and multi-installment purchases.
- **Linked Account Transfers**: Dual-leg transfer architecture ensuring balanced movements across accounts.
- **Cent-Exact Installment Splitting**: Automatically splits total cost across configurable monthly terms (up to 48 months), clamping overflow dates and tracking installment progress badges (e.g. `1/12`).
- **Comprehensive Filtering**:
    - Period filtering (Today, Up to today, Current month, Last month, This year, All time, Custom range).
    - Transaction type / category multi-select.
    - Cash flow direction (Income, Expense, All).
    - Payment method filter (Credit card, Debit card, Cash, PIX, Bank transfer).
- **Grouped Monthly View**: Chronological breakdown with sticky monthly headers and quick inline edit/delete actions.

### Accounts & Cash Flow Forecasting

- **Multi-Account Support**: Manage checking, savings, and investment accounts with custom neon color coding, initials, and opening balances.
- **Balance Projection Engine**: Daily series calculation projecting future account balances based on scheduled incomes, pending expenses, and upcoming card bill payments.
- **Forecasting Horizons**: Inspect projected balances by End of Month, 30 days, 60 days, 90 days, All time, or a custom cutoff date.
- **Upcoming In / Out Ledger**: Detailed breakdown of expected cash movements and net balances.

### Credit Card Statement Engine

- **Automated Billing Cycles**: Automatically calculates closing dates, payment due dates, and billing periods based on configured card rules.
- **Statement Status Tracking**: Tracks open, closed, and paid statement periods.
- **Credit Limit & Utilization**: Real-time gauge of total credit limit, used credit, and remaining available balance.
- **Automatic Bill Resolution**: Closes statements and registers upcoming invoice settlements directly into account cash movements.

### Workspace Customization & Settings

- **Custom Transaction Categories**: Create, edit, and delete income/expense categories with custom neon color palettes and 30+ Lucide icons.
- **Drag-and-Drop Reordering**: Sortable category management with persistent state.
- **Payment Method Management**: Configure standard payment channels and credit card behaviors.
- **Futuristic Glassmorphism Theme**: Cyberpunk visual styling with backdrop blur, custom CSS variables, and light/dark theme switching via `next-themes`.

---

## Tech Stack

- **Framework**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) (strict mode)
- **Build Tool**: [Vite 6](https://vitejs.dev/) with `@vitejs/plugin-react` and `@tailwindcss/vite`
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with CSS variables and OKLCH color spaces
- **UI Components**: [Radix UI](https://www.radix-ui.com/) primitives & [shadcn/ui](https://ui.shadcn.com/)
- **Charts & Data Visualization**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Theming**: [next-themes](https://github.com/pacocoursey/next-themes)
- **Code Quality**: [ESLint 9](https://eslint.org/), [Prettier](https://prettier.io/), [oxfmt](https://oxc.rs/), [Commitlint](https://commitlint.js.org/), and [Husky](https://typicode.github.io/husky/)

---

## Project Architecture

```
.
├── src/
│   ├── main.tsx                    # Application entry point
│   ├── vite-env.d.ts               # Vite environment types
│   ├── styles/                     # Design tokens & stylesheet definitions
│   │   ├── globals.css             # Base styles & Tailwind setup
│   │   ├── theme.css               # Theme color tokens & variables
│   │   ├── default_theme.css       # Default theme fallback
│   │   └── fonts.css               # Typography definitions
│   └── app/
│       ├── App.tsx                 # Root application layout & page router
│       ├── components/
│       │   ├── TopNavigation.tsx   # Top header, search bar, and theme switcher
│       │   ├── Sidebar.tsx         # Navigation sidebar
│       │   ├── SummaryCards.tsx    # Dashboard KPI metrics
│       │   ├── AnalyticsChart.tsx  # Revenue area chart & category pie chart
│       │   ├── TransactionsTable.tsx # Recent transactions table
│       │   ├── TransactionsPage.tsx  # Transactions history & filter panel
│       │   ├── TransactionDialog.tsx # Modal form for single, transfer, & installment txs
│       │   ├── accounts/           # Accounts overview, detail, statements & charts
│       │   ├── settings/           # Settings page, categories & payment methods
│       │   ├── transactions/       # Transaction filters, selectors, and tables
│       │   ├── shared/             # Reusable UI widgets (e.g. CategoryChip)
│       │   └── ui/                 # Accessible Radix UI / shadcn/ui primitives
│       ├── data/
│       │   ├── accounts.ts         # Account structures & configuration
│       │   ├── cardStatements.ts   # Credit card statement billing engine
│       │   ├── dates.ts            # Date formatting and clamping utilities
│       │   ├── icons.ts            # Lucide icon registry
│       │   ├── installments.ts     # Multi-month installment division logic
│       │   ├── ledger.ts           # Cash movements and daily forecast engine
│       │   ├── seed.ts             # Demo transaction dataset
│       │   ├── settings.ts         # Transaction types, payment methods & default config
│       │   └── transactions.ts     # Transaction models and helpers
│       ├── hooks/
│       │   └── useTransactionActions.ts # Transaction CRUD state hook
│       └── state/
│           ├── SettingsContext.tsx # Global settings React context
│           └── settingsReducer.ts  # Reducer for workspace configurations
├── guidelines/                     # Engineering and design system guidelines
├── package.json                    # Dependencies and npm scripts
├── vite.config.ts                  # Vite build and server configuration
└── tsconfig.json                   # TypeScript compiler configuration
```

---

## Getting Started

### Prerequisites

- **Node.js**: `v20.x` or `v22.x` (recommended)
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

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Starts the Vite development server with hot reload |
| `pnpm build` | Compiles TypeScript and builds the production bundle in `dist/` |
| `pnpm preview` | Serves the production build locally for verification |
| `pnpm lint` | Runs both TypeScript type checking (`lint:tsc`) and ESLint (`lint:ts`) |
| `pnpm lint:tsc` | Runs `tsc --noEmit` to verify type safety across the project |
| `pnpm lint:ts` | Executes ESLint across all source files with zero-warning tolerance |
| `pnpm lint:fix` | Automatically fixes ESLint rule violations |
| `pnpm format` | Formats source files using `oxfmt` |
| `pnpm prettier` | Formats TypeScript and CSS files using Prettier |
| `pnpm commitlint` | Validates git commit messages against Conventional Commits |

---

## Design System & Theming

Finance Tracker features a dark-mode-first aesthetic with luminous cyan, violet, emerald, and amber accents.

- **Color Tokens**: Configured via CSS variables in [src/styles/theme.css](file:///home/lozavival/Downloads/Lindgo%20%E2%80%93%20Futuristic%20Fintech%20SaaS%20Dashboard%20Design/src/styles/theme.css) using OKLCH color palettes.
- **Glassmorphism**: Built with semi-transparent backgrounds (`bg-foreground/5`), backdrop blur (`backdrop-blur-xl`), and delicate border highlights.
- **Dark & Light Mode**: Managed through `next-themes` with the toggle button positioned in the top navigation bar.
- **Typography & Icons**: Custom font configurations via [src/styles/fonts.css](file:///home/lozavival/Downloads/Lindgo%20%E2%80%93%20Futuristic%20Fintech%20SaaS%20Dashboard%20Design/src/styles/fonts.css) and Lucide icon mappings in [src/app/data/icons.ts](file:///home/lozavival/Downloads/Lindgo%20%E2%80%93%20Futuristic%20Fintech%20SaaS%20Dashboard%20Design/src/app/data/icons.ts).

---

## Code Quality & Conventions

- **Strict TypeScript**: Full type coverage for transactions, accounts, statements, and state actions without implicit `any`.
- **Git Commit Standards**: Enforced with [Conventional Commits](https://www.conventionalcommits.org/) via Husky and Commitlint (`feat:`, `fix:`, `refactor:`, `chore:`, etc.).
- **Linting & Formatting**: Clean code standards maintained via ESLint 9 flat config, Prettier, and oxfmt.

---

## Attributions & Acknowledgments

- **UI Design**: [Lindgo – Futuristic Fintech SaaS Dashboard Design on Figma](https://www.figma.com/design/VrmhSK4XpPMgxYQcHpQXrv/Lindgo-%E2%80%93%20Futuristic%20Fintech%20SaaS%20Dashboard%20Design).
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) used under the [MIT License](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md).
- **Icons**: [Lucide Icons](https://lucide.dev/) under the [ISC License](https://github.com/lucide-icons/lucide/blob/main/LICENSE).
- **Imagery**: Stock photography from [Unsplash](https://unsplash.com) used under the [Unsplash License](https://unsplash.com/license).
