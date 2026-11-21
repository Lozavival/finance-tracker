# Test Suite Architecture & Reference

<!-- Replace this paragraph with a concise summary of the testing infrastructure and cross-referencing purpose. -->
This document describes the testing infrastructure, runtime environments, test helpers, isolation guarantees, and suite inventory for the <application name> application. It cross-references automated test suites against the business rules in [spec.md](./spec.md) and user journeys in [flows.md](./flows.md).

## Execution Commands

| Command | Scope | Underlying Runner |
|---------|-------|-------------------|
| `<command>` | <What tier or subset of tests it runs> | `<runner command>` |

## Runtime Architecture & Environment Split

- **<Environment / Project 1>**: <Which test directories run here and why this runtime environment is used>.
- **<Environment / Project 2>**: <Which test directories run here, what polyfills or setup files are preloaded>.
- **<End-to-End Runner>**: <How the test server, test database, and browser viewports are configured>.

## Test Helpers, Fixtures & Database Isolation

- **<Helper / Harness Name> (<File link>)**: <How it isolates state, databases, or providers during test runs>.

---

## Test Suite Inventory & Traceability

### 1. Unit & Hook Tests (`tests/unit/`)

| Test File | Target Module | Verified Business Rules & Invariants |
|-----------|---------------|--------------------------------------|
| <File link> | <File link> | `BR-###`: <Concise summary of verified domain invariants> |

### 2. Integration & Static Audit Tests (`tests/integration/`)

| Test File | Target Module | Verified Contracts & Business Rules |
|-----------|---------------|-------------------------------------|
| <File link> | <File link> | `BR-###`: <Concise summary of verified persistence, API, or static audit contracts> |

### 3. Component Tests (`tests/components/`)

| Test File | Target Component | Verified UI Behaviors & Business Rules |
|-----------|------------------|----------------------------------------|
| <File link> | <File link> | `BR-###` (`Flow X`): <Concise summary of verified component interactions> |

### 4. End-to-End Flow Tests (`tests/e2e/`)

| E2E Spec File | Related Flow in `flows.md` | Verified Rules (`spec.md`) | End-to-End Journey Summary |
|---------------|----------------------------|----------------------------|----------------------------|
| <File link> | Flow X | `BR-###` | <One-sentence summary of the end-to-end journey verified> |
