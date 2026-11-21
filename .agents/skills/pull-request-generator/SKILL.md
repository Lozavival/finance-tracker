---
name: pull-request-generator
description: Generate standardized PR titles and descriptions based on branch commits and git logs. Use when the user asks for a PR message, title, or description for a branch.
---

# Pull Request Generator

Generates high-quality, standardized PR titles and descriptions directly from git history and commit messages.

## Procedure

1. **Inspect Git History**:
   - Determine target base branch (`develop` for ongoing features, `main` for releases).
   - Run `git log --oneline <base>..<branch>` to list all commits on the branch.
   - Run `git log -n <count> <branch>` to read full commit bodies and details.

2. **Formulate PR Title Options**:
   - Follow Conventional Commits: `<type>(<optional scope>): <short description>`.
   - Provide **Recommended** (balanced), **Concise**, and **Detailed** alternatives in code blocks for easy copying.

3. **Formulate PR Description**:
   - Output the entire PR description inside a single fenced markdown code block (````markdown ... ````) for one-click copy-pasting.
   - **Do NOT** include a "Commits Included" section (GitHub already displays the full commit list natively).
   - **Do NOT** include commit tags (e.g., `feat(layout)`, `docs(skills)`) in section headers or subheadings; keep headers clean and descriptive.
   - Follow the template below.

## Template

````markdown
# Description

<1-2 paragraph executive summary explaining context, goals, and primary changes.>

---

## Key Changes

### 1. <Domain or Feature Area>
- **<Sub-topic>**:
  - <Concise description of functional behavior or change.>

### 2. <Domain or Feature Area>
- **<Sub-topic>**:
  - <Concise description of functional behavior or change.>

---

## Verification & Testing

- [x] <Verified behavior, user flow, or test suite.>
- [x] Full linting and TypeScript checks pass (`npm run lint`).
````
