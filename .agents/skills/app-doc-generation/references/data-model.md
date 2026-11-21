# Data Model Guide

## Purpose

Document the application's persistent storage architecture, entity relationships, table schemas, foreign key integrity policies, and indexing/query mechanics so developers, testers, and architects can understand the data layer without reading raw ORM or DDL code.

## Required Structure

- A short introduction paragraph.
- A `Storage Engine & Runtime Isolation` section covering the database engine, connection settings, environment separation, and representation conventions (e.g., monetary units, date/timestamp formats).
- An `Entity-Relationship Diagram` section containing a Mermaid `erDiagram`.
- A `Table Specifications` section detailing each table's columns, types, constraints/defaults, and purpose.
- An `Indexing, Virtual Tables & Custom Functions` section cataloging B-Tree indexes, full-text search virtual tables, triggers, or custom SQL functions (when present).
- Optional domain-specific query sections (such as windowed hydration or balance rollup mechanics) when the storage layer performs non-trivial SQL aggregations.

## Content & Tone Rules

- **Technical Reference Tone**: Unlike `flows.md` (which must stay strictly non-technical), `data-model.md` is a technical reference. Use exact table names, column names, SQLite/SQL data types, and foreign key policies (`ON DELETE CASCADE`, `RESTRICT`, `SET NULL`).
- **Single Source of Truth Alignment**: Derive every table, column, and index directly from the schema definition and DDL files. Do not invent tables or omit join tables.
- **No Raw DDL Dumps**: Summarize schemas using clean Markdown tables and concise bullet lists rather than pasting entire multi-hundred-line SQL scripts.
- **Source Links**: Link to schema and database client files without line anchors.

## Table Specification Format

For primary entity tables, use this column order:

| Column | Type | Constraints / Default | Description |
|--------|------|-----------------------|-------------|

For simple two-column join tables, a concise bulleted summary of the composite primary key and foreign key cascade rules is preferred over a full table.

## Index Table Format

| Index Name | Table & Columns | Query Purpose |
|------------|-----------------|---------------|

## Update Rules

- Update the Mermaid `erDiagram`, table specifications, and index inventory whenever tables, columns, foreign keys, or triggers are added, modified, or removed.
- Keep column ordering consistent with the schema definition.

## Completion Checklist

- The Mermaid `erDiagram` includes all persistent tables and their foreign key delete rules.
- Every table and column in the database schema is accounted for.
- Data representation invariants (such as integer cents and date formats) are explicitly stated.
- File links have no line anchors.
