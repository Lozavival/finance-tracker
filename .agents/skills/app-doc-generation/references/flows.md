# Flows Guide

## Purpose

Explain the main end-to-end user and system flows so testers and product owners can understand what starts each flow, what the flow tries to achieve, and where the behavior lives in the code.

## Required Structure

- A short introduction paragraph.
- One section per main flow.
- One final `Exceptional & Edge Flows` section.

## Required Metadata Per Flow

Each main flow must begin with:

- `When it happens:` what starts the flow.
- `Goal:` what the flow is trying to achieve.
- `Implementation:` summarized method call chain that implements the flow, without file links or line anchors.

## Body Rules

- Use numbered steps.
- Maintain a **plain sequence-of-actions tone**: write each flow as a simple, non-technical narrative of user actions and observable application responses (e.g., "User clicks...", "A confirmation dialog opens...", "The table updates...").
- Keep all code symbols, component names, function names, field identifiers, and technical implementation details strictly inside the `Implementation:` metadata line—never inside the numbered steps or edge flows.
- Describe the user-visible or system-relevant sequence, not low-level mechanics, database internals, or styling details.
- Mention branching only when it changes the behavior or outcome.
- When a step ends the flow early, end the sentence with `→ **END**`.
- When a step hands control to another documented flow, end the sentence with `→ Proceed to **Flow X: Flow Name**.`.
- Name follow-up flows when navigation passes control to another screen or mode.

## Edge Flow Rules

- Use bullet points in `Exceptional & Edge Flows`.
- Cover failures, race conditions, unavailable dependencies, retries, debounce behavior, and background-triggered flows in the same plain, product-behavior language without code identifiers.

## Update Rules

- If an existing flow document already contains valid steps, preserve its wording, structure, and plain sequence-of-actions tone, making only minimal targeted edits needed for accuracy.
- Rewrite headings and metadata only when needed so every flow follows the same shape.

## Completion Checklist

- Every main flow has `When it happens:`, `Goal:`, and `Implementation:` sections.
- The flow names are meaningful, not generic placeholders.
- Steps read as a clean, non-technical sequence of actions and observable outcomes, with zero code identifiers or implementation jargon leaked into the prose.
- Branches use the shared `→ **END**` and `→ Proceed to **Flow X: Flow Name**.` conventions.
- Exceptional behavior is separated from the happy path.
