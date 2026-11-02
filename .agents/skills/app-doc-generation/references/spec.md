# Business Rules Guide

## Purpose

Extract implicit and explicit business rules from conditions, guards, branches, and feature gates so product and test stakeholders can validate behavior.

## Required Structure

- A short introduction paragraph.
- A `Legend` section explaining the table columns.
- One or more thematic sections.
- A table in each section using the shared rule format.

## Rule Format

Use sequential identifiers such as `BR-001`, `BR-002`, and so on.

| ID | Rule Description | Source | Notes / TODO |
|----|------------------|--------|--------------|

## Content Rules

- Phrase rules as obligations, constraints, or expected behavior.
- Group rules by domain when the app has clear functional areas.
- `Source` should link to the most relevant files without line anchors.
- Use `Notes / TODO` only for real validation gaps, not as filler.

## Update Rules

- Keep correct rules and renumber only when necessary.
- Remove implementation noise that does not express a business constraint.

## Completion Checklist

- The rules are understandable without reading code.
- IDs are sequential and stable inside the document.
- Thematic grouping is used when it improves readability.
- TODOs are explicit about who or what must confirm the rule.
