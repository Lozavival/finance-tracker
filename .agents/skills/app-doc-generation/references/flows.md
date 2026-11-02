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
- Describe the user-visible or system-relevant sequence, not every low-level helper call.
- Mention branching only when it changes the behavior or outcome.
- When a step ends the flow early, end the sentence with `→ **END**`.
- When a step hands control to another documented flow, end the sentence with `→ Proceed to **Flow X: Flow Name**.`.
- Name follow-up flows when navigation passes control to another screen or mode.

## Edge Flow Rules

- Use bullet points in `Exceptional & Edge Flows`.
- Cover failures, race conditions, unavailable dependencies, retries, debounce behavior, and background-triggered flows when relevant.

## Update Rules

- If an existing flow document already contains valid steps, preserve them.
- Rewrite headings and metadata so every flow follows the same shape.

## Completion Checklist

- Every main flow has `When it happens:`, `Goal:`, and `Implementation:` sections.
- The flow names are meaningful, not generic placeholders.
- Steps reflect observable behavior and important side effects.
- Branches use the shared `→ **END**` and `→ Proceed to **Flow X: Flow Name**.` conventions.
- Exceptional behavior is separated from the happy path.
