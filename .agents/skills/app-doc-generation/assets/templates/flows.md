# User Flows

<!-- Complete this paragraph with a short description of what the document covers and why these flows matter for testers, product owners, or integrators. -->
This document describes the main operational flows of the <application name> application, detailing the step-by-step sequences for <overview of the flows>. Each flow includes entry points, state transitions, and integration points with external systems.

## Flow A: <Name The Flow>

**When it happens:** <What starts the flow>

**Goal:** <What the flow tries to achieve>

**Implementation:** <Summarized method call chain. Format: `Module1.methodA` → `Module2.methodB` → `Module3.methodC`, no file links or line anchors>

<!-- Branching convention: append `→ **END**` for an early stop, or `→ Proceed to **Flow X: Flow Name**.` when control moves to another documented flow. -->

1. <Describe the first meaningful step>
2. <Describe what happens next; if this step can stop early, end the sentence with → **END**>
3. <Continue until the observable outcome is clear>

## Flow B: <Name The Flow>

**When it happens:** <What starts the flow>

**Goal:** <What the flow tries to achieve>

**Implementation:** <Summarized method call chain. Format: `Module1.methodA` → `Module2.methodB` → `Module3.methodC`, no file links or line anchors>

1. <Describe the sequence>
2. <Mention branches only when they change the outcome; for jumps, end with → Proceed to **Flow X: Flow Name**.>

## Flow C: <Name The Flow>

**When it happens:** <What starts the flow>

**Goal:** <What the flow tries to achieve>

**Implementation:** <Summarized method call chain. Format: `Module1.methodA` → `Module2.methodB` → `Module3.methodC`, no file links or line anchors>

1. <Describe the sequence and apply the branching convention when the flow stops early or hands off to another flow>

## Exceptional & Edge Flows

- <Rare path, failure mode, race condition, unavailable dependency, debounce, retry, or background-triggered behavior>
- <Explain the user or system impact and the relevant condition>
