# Interfaces Guide

## Purpose

Inventory all external interfaces the app uses or exposes, including transport, direction, payload shape, error handling, code location, and purpose.

## Required Structure

- A short introduction paragraph.
- A `Legend` section.
- One main table sorted by `Type` and then by `Identifier / Path`.

## Required Columns

Use this exact column order:

| Type | Direction | Identifier / Path | Payload in | Payload out | Errors | Location | Purpose |
|------|-----------|-------------------|------------|-------------|--------|----------|---------|

## Content Rules

- Include HTTP, file IO, environment variables, storage, and any other external integration actually present.
- `Location` must use file links without line anchors.
- `Purpose` must explain the functional purpose in one clear sentence, not repeat the identifier.
- If the app both consumes and exposes the same interface family, split entries when that makes direction clearer.

## Update Rules

- Keep accurate rows that already follow the shared format.
- Merge duplicates and normalize naming if the same interface appears several times with minor variations.

## Completion Checklist

- The table is sorted by type and identifier.
- Notes are concise and useful.
- Location cells link to files only.
- No row describes an internal-only helper as an external interface.
