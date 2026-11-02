# Common Rules

## Goal

Produce documentation that is easy to review by testers, product owners, architects, and maintainers while staying anchored in code evidence.

## Audience And Tone

- Write for non-specialists first, but keep the terms technically precise.
- Prefer plain explanations over implementation trivia.
- Use product behavior language before low-level code language.
- Avoid marketing, speculation, and filler.

## Shared Structural Rules

- Use stable headings and section order from the template.
- Every artifact must open with a short introduction paragraph.
- Keep intros short and factual.
- Prefer tables for inventories and numbered lists for flows.
- Keep naming consistent with the application itself.

## Evidence Rules

- Derive facts from code, manifests, config, schemas, tests, and generated artifacts.
- Existing docs may be reused only when they are still consistent with code.
- If a fact is uncertain, mark it as `TODO` with the missing validation owner or source.
- Do not invent endpoints, telemetry fields, state names, or flags.

## Source Link Rules

- When a field such as `Location`, `Source`, or `Implemented in` points to code, use markdown links to files only.
- Never include line anchors in those links.
- Prefer the smallest useful set of files. Do not flood a row with redundant paths.
- For the link text, use the file name or component name, not the full path.

## Create And Update Rules

- On create: start from the embedded template and fully populate it.
- On update: keep correct facts, remove stale structure, and normalize the tone and section layout to match the template.
- If an existing document mixes formats, rewrite the minimum necessary to converge on the gold standard.

## Final Checks

- The output matches the template section order.
- The language is concise and readable.
- File links have no line anchors.
- Tables are complete and internally consistent.
- `TODO` markers are rare and justified.
