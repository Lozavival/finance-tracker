---
name: ui-code-review
description: Audits UI code changes for design system compliance, semantic color tokens, component boundaries, and zero-warning TypeScript/ESLint rules.
---

# UI Code Review & Design System Auditor

Use this skill whenever implementing, refactoring, or reviewing UI components, dialogs, styles, or page layouts.

---

## Review Checklist

### 1. Zero Hardcoded Colors & Palette Tokens (Mandatory)
Finance Tracker enforces a strict custom theme palette. Default Tailwind palette colors (e.g., `cyan-500`, `emerald-400`, `amber-500`, `red-500`, `slate-700`, `zinc-800`, etc.) are strictly prohibited.

#### A. Diff Audit Command
Run the following verification command against git diff:
```bash
git diff | grep -E '\b(emerald|cyan|amber|rose|violet|indigo|sky|blue|red|green|yellow|slate|zinc|gray)-[0-9]{2,3}\b' || true
```

#### B. Semantic Theme Tokens Mapping
Map matched classes to semantic theme tokens:
- **Theme Accents**: `theme-cyan`, `theme-green`, `theme-blue`, `theme-orange`, `theme-purple`, `theme-red`
  - Text: `text-theme-cyan`, `text-theme-green`
  - Backgrounds: `bg-theme-cyan/15`, `bg-theme-green/10`
  - Borders: `border-theme-cyan/30`, `border-theme-green/30`
  - Action Buttons: `bg-theme-cyan-btn hover:bg-theme-cyan-btn-hover text-white dark:text-gray-950`
- **Semantic UI Tokens**:
  - Surfaces: `bg-card`, `bg-popover`, `bg-foreground/5`
  - Text: `text-foreground`, `text-muted-foreground`, `text-destructive`
  - Borders & Rings: `border-border`, `border-border/40`, `ring-ring`
  - Status & Alerts: `text-destructive`, `bg-destructive/10`, `border-destructive/30`
- **Dynamic Palette Token Namespace**:
  - Always use `--accent-*-raw`, `--accent-*-dot`, `--accent-*-badge-bg`, and `--accent-*-badge-border` (defined in `palette.css`).
  - Do NOT introduce `--color-*-dot` or `--color-*-raw` to avoid conflicts with Tailwind CSS v4's internal `--color-*` engine.

---

### 2. Component Architecture & Modularization

#### A. Hierarchy & Dependency Rules
- **Prerequisites**: Use `@/` path alias for application imports.
- **One-way Flow**:
  - `features/*` may import from `components/primitives/`, `components/shared/`, `layout/`, `lib/`, `data/`, `state/`, and `i18n/`.
  - `components/primitives/*` and `components/shared/*` must **NEVER** import from `features/*`.
  - Feature-specific widgets belong in `features/<domain>/` (co-located subcomponents). Cross-feature reusable widgets belong in `components/shared/`.
- **Domain Logic Separation**: Pure calculations (statement cycles, cent-exact installment splits, forecasting) must reside in `src/app/data/`, decoupled from React components.

#### B. Component Sizing & Decomposition
- If a component or dialog exceeds **~300 lines**, decompose it into focused subcomponents (e.g., extracting chart visualizations, sliders/controls, or method selectors).
- **Pragmatic DRY (Avoid the "Wrong Abstraction")**:
  - Keep domain dialogs separate when business constraints, validation, or entity lifecycles differ (e.g. `DeleteTypeDialog` vs. `DeleteMethodDialog`).
  - Do not introduce leaky, over-parameterized generic wrappers for forms with distinct domain behaviors.

#### C. System Entities Protection
- System records (e.g. `system: 'transfer'`, `cash`, `credit-card`) must have safety guards:
  - Do not render delete/trash action triggers for system items.
  - Require reassigning transactions before completing deletion of in-use entities.

---

### 3. Glassmorphism & Cyberpunk Aesthetics
- **Dark-mode First**: Built for dark-mode cyberpunk/fintech feel with neon accents.
- **Surfaces**: Semi-transparent backdrops (`bg-foreground/5` or `bg-card/50`).
- **Glass Effects**: Soft blur filters (`backdrop-blur-xl`) with subtle border outlines (`border-border/40`).
- **Icons**:
  - Import from `lucide-react` or registry `src/app/data/icons.ts`.
  - Consistent sizing: standard action buttons/chips use `w-3.5 h-3.5` or `w-4 h-4` (`size-3.5`, `size-4`).

---

### 4. Primitive UI Components (shadcn/ui & Radix UI)
- **Zero Raw HTML Redefinition**: Never hand-craft custom interactive elements using unstyled or ad-hoc styled HTML tags (`<button>`, `<input>`, `<select>`, custom modal overlays, custom checkboxes/switches) when an equivalent primitive exists in `src/app/components/primitives/`.
- **Always Import from `@/components/primitives/*`**:
  - Buttons & Actions: `Button` (`@/components/primitives/button`)
  - Form Fields: `Input` (`@/components/primitives/input`), `Label` (`@/components/primitives/label`)
  - Dropdowns & Selects: `Select`, `SelectTrigger`, `SelectContent` (`@/components/primitives/select`), `DropdownMenu` (`@/components/primitives/dropdown-menu`)
  - Modals & Confirmations: `Dialog` (`@/components/primitives/dialog`), `AlertDialog` (`@/components/primitives/alert-dialog`)
  - Cards & Containers: `Card`, `CardHeader`, `CardTitle`, `CardContent` (`@/components/primitives/card`)
  - Switches, Toggles & Checkboxes: `Switch`, `Checkbox`, `Toggle`, `ToggleGroup`
  - Tabs & Navigation: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` (`@/components/primitives/tabs`)
  - Tooltips & Badges: `Tooltip`, `Badge`
- **Benefits**: Guarantees accessibility (ARIA attributes, keyboard navigation, focus management), consistent theme styling, and uniform interaction states.

---

### 5. Type Safety & Route Navigation
- Strict TypeScript enabled: **never use `any`**.
- Navigation between views must strictly use the `PageId` union defined in `src/app/layout/navigation.ts`.
- All component props and form callbacks must have explicit interfaces or types.

---

### 6. Bi-directional Internationalization (i18n)
- No hardcoded user-facing strings in UI components.
- Any new label, button text, error message, or dialog prompt must be added in pairs:
  - `src/app/i18n/locales/en.ts`
  - `src/app/i18n/locales/pt.ts`
- Use parameterized keys (`{count}`, `{name}`, `{amount}`) for dynamic formatting.

---

### 7. Automated Verification Workflow
Before finalizing or committing any UI modifications, execute:
```bash
npm run format
npm run lint
npm run build
```
Requirements:
1. Prettier formatting clean (`npm run format`).
2. Zero TypeScript errors (`tsc --noEmit`).
3. Zero ESLint warnings (`eslint --max-warnings=0`).
4. Vite production build succeeds.

---

### 8. Responsive Layout & Fluid Design Checklist (Mandatory)
Finance Tracker supports all viewports from 360px phones (`phone-compact`) to ultrawide desktops with zero horizontal overflow regressions.

#### A. Container Queries Over Window Breakpoints in Widgets
- Feature cards, charts, and panels reside inside the main content column next to the persistent 256px sidebar.
- Never use screen breakpoints (`md:`, `xl:`) inside card internals to switch multi-column layouts—the 256px sidebar reduces available column width to ~468px at 1280px screen width.
- Always use Tailwind CSS `@container` and container query breakpoints (`@xs:`, `@sm:`, `@md:`, `@lg:`, `@xl:`) inside cards.

#### B. Recharts & Chart Containment
- Always wrap Recharts `ResponsiveContainer` inside a flex/grid child with `min-w-0` (or `min-h-0`). Without `min-w-0`, SVG layout calculation engines retain parent dimensions and cause persistent horizontal overflow.

#### C. Tabular Numerics & Text Truncation
- Financial amounts, rates, balances, and counts must use `tabular-nums` to ensure monospaced numerical alignment and prevent jitter during re-renders.
- Card titles, category labels, and descriptions in dense rows must have `truncate min-w-0` to avoid pushing action buttons outside the viewport.

#### D. Dialog & Popover Clamping
- Modals (`DialogContent`, `AlertDialogContent`) must include `max-h-[calc(100dvh-2rem)] overflow-y-auto` to prevent off-screen truncation on mobile and short landscape screens.
- Popovers and dropdowns must constrain widths using `w-[min(...,calc(100vw-1rem))]` to prevent off-canvas clipping on small viewports.

#### E. Fluid Navigation & Zero Unintentional Horizontal Scroll
- Button strips, currency filters, and option lists must include `flex-wrap` to prevent expanding document `scrollWidth` and triggering mobile layout scaling.
- Top navigation actions must remain accessible via `MobileNavDrawer` (<1024px) and persistent `Sidebar` (>=1024px).
- Verify multi-viewport compliance via Playwright:
  ```bash
  pnpm exec playwright test tests/e2e/flows/responsive-layout.spec.ts --project=desktop
  pnpm exec playwright test --project=tablet
  pnpm exec playwright test --project=mobile
  ```
