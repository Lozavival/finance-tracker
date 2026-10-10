---
name: commit-message-generator
description: Use this skill when creating a git commit. Produces a well-formed commit message that passes the commitlint rules (conventional commits + gitlint constraints).
---

# Commit Message Generator

Compose a commit message that passes the `commitlint.config.ts` validation.

---

## Workflow

### Step 1 — Collect context

Before composing the message:

- Identify the **change type**: `feat`, `fix`, `chore`, `refactor`, `build`, `docs`, `test`, `perf`, `ci`, `revert`.
- Understand **what changed and why** by reading the diff or asking the user.

### Step 2 — Compose the header

Format: `<type>(<optional scope>): <short description>`

Rules (enforced by commitlint):
- **Max 72 characters** including the type and scope.
- **No leading or trailing whitespace**.
- **No hard tab characters**.
- Use **lowercase** for both type and description (conventional-commits standard).
- The description must be in **imperative mood**: "add feature", not "added feature".

Allowed types (from `@commitlint/config-conventional`):
| Type | When to use |
|------|-------------|
| `feat` | New capability visible to users or callers |
| `fix` | Bug fix |
| `chore` | Maintenance, tooling, dependency updates |
| `refactor` | Code restructure with no behavior change |
| `test` | Adding or fixing tests only |
| `docs` | Documentation only |
| `build` | Build system or package changes |
| `bump` | Version bump commits |
| `perf` | Performance improvement |
| `ci` | CI pipeline changes |
| `revert` | Reverts a previous commit |

Scope is optional but encouraged when the change is limited to one module or area (e.g. `feat(ui)`, `feat(transactions)`, `fix(chart)`).

### Step 3 — Compose the body

- Separate from the header with **one blank line**.
- Wrap lines at **80 characters** (enforced by `body-max-line-length`).
- **No hard tabs**, no trailing whitespace.
- Explain **what** changed and **why**, not just how.
- Use bullet points (`-`) for multiple distinct changes.

> The commitlint config warns (`level 1`) when the body is empty. Always include one unless the header is already self-explanatory for trivial one-liners.

### Step 4 — Validate the message

Run through this checklist before finalising:

- [ ] Header ≤ 72 characters
- [ ] No leading/trailing whitespace in header, body, or footer
- [ ] No hard tab characters anywhere
- [ ] Blank line between header and body
- [ ] Body lines ≤ 80 characters

### Step 5 — Output the message

Present the commit as a ready-to-run `git commit` command (add `-S` if GPG commit signing is configured) using multiple `-m` flags — one per paragraph (header, each body paragraph, footer). Git inserts blank lines between each `-m`, satisfying the commitlint blank-line rules.

Format:
```bash
git commit \
  -m "<header>" \
  -m "<body>"
```

- Split each body paragraph and the footer into separate `-m` flags so Git inserts the required blank lines automatically.
- If there is no body, omit the body `-m` and use only the header.
- Do **not** include blank lines inside a single `-m` string unless intentional.

---

## Examples

**Feature with component additions:**
```bash
git commit \
  -m "feat(ui): create transaction dialog" \
  -m "- Implement TransactionDialog modal supporting creating and editing
- Add form inputs for direction toggle, description, date, and value
- Sync category options automatically when toggling direction
- Include client-side validation for description, date, and positive value
- Wire action buttons in TransactionsPage to open dialog and persist state"
```

**Bug fix or styling adjustment:**
```bash
git commit \
  -m "fix(chart): adjust tooltip background and z-index for dark theme" \
  -m "- Use semantic bg-popover and border tokens in tooltip component
- Ensure tooltip renders above backdrop blur overlays"
```

---

## Anti-patterns to reject

| Bad | Why |
|-----|-----|
| `Fixed the bug` | Not conventional format; past tense; no type |
| `feat: Added theme support and also refactored table and updated deps` | Mixed concerns; should be split into separate commits |
| Header longer than 72 chars | Fails `header-max-length` rule |
| Body line longer than 80 chars | Fails `body-max-line-length` rule |
| Tabs anywhere in the message | Fails `hard-tab` rule |

