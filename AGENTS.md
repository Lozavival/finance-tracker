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

### UI Review (`ui-code-review` Skill)
- **Always activate when editing UI**: When designing, implementing, or reviewing UI components, styles, or dialogs, consult and follow the [ui-code-review](.agents/skills/ui-code-review/SKILL.md) skill to audit semantic tokens, theme colors, and component boundaries.

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
- **Zero Hardcoded Colors Invariant**: **NEVER** use default Tailwind color palette classes (e.g. `emerald-500`, `cyan-400`, `amber-500`, `red-400`, `blue-600`, `slate-700`, `zinc-800`, etc.). Always use semantic theme tokens:
  - **Theme Accents**: `theme-cyan`, `theme-green`, `theme-blue`, `theme-orange`, `theme-purple`, `theme-red`, `theme-cyan-btn`, `theme-cyan-btn-hover` (e.g., `text-theme-cyan`, `bg-theme-cyan/15`, `border-theme-green/30`).
  - **Semantic UI Tokens**: `primary`, `primary-foreground`, `foreground`, `background`, `card`, `popover`, `muted`, `muted-foreground`, `accent`, `border`, `input`, `destructive` (e.g., `bg-card/50`, `border-border/40`, `text-destructive`).
  - **Dynamic Palette Token Namespace**: Use `--accent-*-raw`, `--accent-*-dot`, and `--accent-*-badge-*` (defined in `palette.css`). Avoid `--color-*-dot` to prevent collisions with Tailwind v4's internal `--color-*` engine.

### 3. Component Standards & Architecture
- **Dependency Rule**: `features/*` may import from `components/`, `layout/`, `lib/`, `data/`, `state/`, and `i18n/`. `components/*` must never import from `features/*`. Cross-feature reusable widgets belong in `components/shared/`.
- **Modularity & Sizing**: Decompose monolithic components or dialogs exceeding ~300 lines into focused subcomponents (e.g. separating chart visualizers, sliders, or selector rows).
- **Pragmatic DRY**: Keep distinct domain dialogs separate when validation or business constraints differ (e.g., `DeleteTypeDialog` vs. `DeleteMethodDialog`); avoid leaky generic wrappers.
- **System Entity Protection**: Never render destructive actions for system records (`transfer`, `cash`, `credit-card`). Require reassigning transactions before completing deletion of in-use entities.
- **Primitive UI Components (shadcn/ui & Radix UI)**: Never rebuild standard interactive UI patterns from scratch using raw HTML tags (`<button>`, `<input>`, `<select>`, custom modal overlays, custom checkboxes/switches). Always compose primitives from `src/app/components/primitives/` (`Button`, `Input`, `Dialog`, `AlertDialog`, `Select`, `Switch`, `Tabs`, `Card`, `Tooltip`, etc.) to guarantee accessibility, focus management, keyboard navigation, and design system cohesion.

### 4. TypeScript, i18n & Code Quality
- **Strict Typing**: Strict TypeScript mode is enabled. Never use `any`—define explicit interfaces or types for all entity models, props, and function parameters.
- **Type-Safe Navigation**: Always use the `PageId` union in `src/app/layout/navigation.ts` for view switching.
- **Internationalization (i18n)**: No hardcoded user-facing strings in UI components. Add all strings symmetrically to `src/app/i18n/locales/en.ts` and `src/app/i18n/locales/pt.ts`.
- **Verification Rule**: Always run `npm run lint` and `npm run build` after editing TypeScript or CSS files to catch syntax, type, and lint errors immediately.
- **Color Audit Check**: Before finishing or committing UI modifications, verify that no default Tailwind palette scales were introduced:
  ```bash
  git diff | grep -E '\b(emerald|cyan|amber|rose|violet|indigo|sky|blue|red|green|yellow|slate|zinc|gray)-[0-9]{2,3}\b'
  ```

