# Testing Guide

## Purpose

Document the application's automated test suite architecture, execution commands, runtime environment splits, test helpers/isolation guarantees, and test file traceability to business rules (`docs/spec.md`) and user flows (`docs/flows.md`).

## Required Structure

- A short introduction paragraph.
- An `Execution Commands` table mapping test scripts to their scope and underlying runner.
- A `Runtime Architecture & Environment Split` section explaining how test runners and environments (e.g., Node, DOM, end-to-end browsers/viewports) are divided.
- A `Test Helpers, Fixtures & Database Isolation` section documenting shared test harnesses, provider wrappers, fixture generators, and how test runs isolate persistence from development/production data.
- A `Test Suite Inventory & Traceability` section with sub-tables for each test tier (Unit & Hook Tests, Integration & Static Audit Tests, Component Tests, End-to-End Flow Tests).

## Content & Tone Rules

- **Architectural & Traceability Focus**: Focus on how the test harness works and what each test file verifies.
- **No Duplicated Prose from `flows.md` or `spec.md`**: Do not rewrite step-by-step user journeys or full business rule definitions inside `testing.md`. Instead, cross-reference rule IDs (`BR-###`) and flow names (`Flow A`..`Flow Z`) and summarize the verified behavior in one concise sentence.
- **No Ephemeral Metrics or Planning Noise**: Never include hardcoded pass counts (e.g., "248 tests passing"), installation commands (`pnpm add -D ...`), `(NEW)` tags, or full copies of config files (`vitest.config.ts`, `package.json`), as these immediately drift.
- **Actual Files Only**: Only list test files that actually exist on disk. Link every test file and target module without line anchors.

## Traceability Table Formats

For Unit, Integration, and Component tiers:

| Test File | Target Module | Verified Behaviors & Business Rules |
|-----------|---------------|-------------------------------------|

For End-to-End Flow tiers:

| E2E Spec File | Related Flow in `flows.md` | Verified Rules (`spec.md`) | End-to-End Journey Summary |
|---------------|----------------------------|----------------------------|----------------------------|

## Update Rules

- Add, rename, or remove rows whenever test files change on disk.
- Update the traceability columns whenever new business rules (`BR-###`) or user flows (`Flow X`) are covered.

## Completion Checklist

- Every test file on disk is listed in the inventory tables, and no non-existent test files appear.
- All file links point to files only, without line anchors.
- Traceability references to `BR-###` and `Flow X` match `docs/spec.md` and `docs/flows.md`.
- No hardcoded test pass counts or planning artifacts are present.
