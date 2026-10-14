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

---

## Agent & Git Skills Workflow

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

---

## Architecture & Code Structure

The application is structured into domain-driven modules inside `src/app/`:

```
src/
├── main.tsx                      # Application entry point
├── styles/
│   ├── index.css                 # Root styles entry (Tailwind, tw-animate, imports)
│   ├── tokens.css                # Semantic theme tokens (:root & .dark)
│   ├── palette.css               # Neon accents, badges, dots, and glow shadows
│   ├── tailwind-theme.css        # @custom-variant & @theme inline variable mappings
│   └── base.css                  # @layer base reset and default typography
└── app/
    ├── App.tsx                   # Main layout and top-level view routing
    ├── layout/                   # App shell components (TopNavigation, Sidebar)
    ├── features/                 # Domain feature modules
    │   ├── dashboard/            # DashboardPage, KPIs, AnalyticsChart, RecentTransactionsTable
    │   ├── accounts/             # Account lists, balance projections & statement views
    │   ├── transactions/         # Transaction tables, filters, CRUD actions
    │   │   └── dialogs/          # TransactionFormDialog, DeleteTransactionDialog, composer
    │   ├── goals/                # BudgetOverview, category targets, and goals panels
    │   └── settings/             # Workspace preferences, payment methods, transaction types
    ├── components/
    │   ├── primitives/           # Primitive UI components (Radix UI / shadcn/ui)
    │   └── shared/               # Reusable domain components (CategoryChip, DateField, OptionSelect, ColorPicker, IconPicker)
    ├── lib/
    │   └── utils.ts              # Global utility functions (cn class merging)
    ├── data/
    │   ├── cardStatements.ts     # Billing cycle calculation & statement closing engine
    │   ├── dates.ts              # Date clamping and calendar formatting utilities
    │   ├── icons.ts              # Lucide icon mapping registry
    │   ├── installments.ts       # Cent-exact multi-month installment division logic
    │   ├── ledger.ts             # Cash movement models and daily forecasting series
    │   ├── seed.ts               # Demo data seeds
    │   ├── settings.ts           # Category and payment method default definitions
    │   └── transactions.ts       # Transaction entities, types, and helper methods
    ├── i18n/                     # Localization context, strings, and formatters
    └── state/
        ├── SettingsContext.tsx   # Workspace settings React context
        └── settingsReducer.ts    # Reducer actions for category & preference updates
```

---

## Engineering & Design System Guidelines

### 1. Domain Logic & Calculations (`src/app/data/`)
- Keep domain engines (installments, credit card statement closing cycles, daily balance forecasting) **pure and decoupled from React components**.
- Implement exact mathematical operations (e.g., cent-exact split where remainder cents are allocated to the first installment; clamping payment due dates to the end of shorter months).

### 2. Design System & Aesthetics
- **Theme**: Dark-mode-first futuristic fintech / cyberpunk aesthetic with neon accents (cyan, violet, emerald, amber).
- **Glassmorphism**: Use semi-transparent backdrops (`bg-foreground/5` or `bg-card/50`), blur filters (`backdrop-blur-xl`), and delicate borders (`border-border/40`).
- **Layouts**: Responsive flexbox and CSS grid layouts. Avoid arbitrary absolute positioning unless implementing overlays, floating badges, or tooltip anchors.
- **Icons**: Always import Lucide icons via `src/app/data/icons.ts` or directly from `lucide-react` using consistent sizing (`size-4`, `size-5`).
- **Theming**: Integrated with `next-themes` using CSS variables defined in `src/styles/tokens.css` and `src/styles/palette.css`.

### 3. Component Standards & Architecture
- **Dependency Rule**: `features/*` may import from `components/`, `layout/`, `lib/`, `data/`, `state/`, and `i18n/`. `components/*` must never import from `features/*`. Cross-feature reusable widgets belong in `components/shared/`.
- Prefer composed primitives from `src/app/components/primitives/` (Radix UI / shadcn/ui) over custom unstyled HTML elements.
- Keep components focused and modular. Extract subcomponents and helper functions into separate files when a file exceeds manageable size.

### 4. TypeScript & Code Quality
- **Strict Typing**: Strict TypeScript mode is enabled. Never use `any`—define explicit interfaces or types for all entity models, props, and function parameters.
- **Verification Rule**: Always run `npm run lint` after editing TypeScript or CSS files to catch syntax, type, and lint errors immediately.

