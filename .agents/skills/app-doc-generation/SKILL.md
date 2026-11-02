---
name: app-doc-generation
description: 'Generate or update application documentation from source code. Use for flows, interfaces, states, and business rules. Works for writing docs from scratch and for bringing existing docs back to a shared gold standard.'
argument-hint: 'Artifact: flows | interfaces | spec. Optional mode: create | update. Example: "Generate the flows artifact for the app".'
user-invocable: true
---

# App Documentation Generation

Use this skill when the task is to create or update documentation artifacts for an application.

This skill is portable across repositories:

- The gold standard is encoded in the references and templates inside this skill.
- Repository-local docs can be used as additional evidence, but not as the only structural source.

## Supported Artifacts

- `flows`
- `interfaces`
- `spec`

## Inputs

- The target artifact.
- The default destination file (`docs/<artifact>.md`).
- The codebase, configuration files, manifests, tests, and any existing documentation.

## Create Vs Update

- If the target file does not exist, create it from scratch using the matching template in `./assets/templates/`.
- If the target file already exists, preserve correct facts and useful wording, but reshape the document so it matches the shared structure, section order, and tone from this skill.
- Do not keep stale content just because it already exists.

## Procedure

1. Read the shared rules in [common rules](./references/common-rules.md).
2. Read the artifact-specific guide in `./references/<artifact>.md`.
3. Read the matching template from `./assets/templates/<artifact>.md` as the required structural basis for the output.
4. Resolve the target output path. Default to `docs/<artifact>.md`. If the user specifies an alternate path, use it instead.
5. If the target file exists, read it and keep any correct facts worth preserving.
6. Search the codebase for the evidence required by the artifact guide.
7. Write or update the document so it matches the template structure and the artifact guide.
8. Validate the result against the checklist in the artifact guide. If validation fails, fix the issues and re-validate before finishing.

## Limitations

- Does not generate multiple artifacts in a single invocation — run once per artifact.
- Does not produce API reference docs (use source-level JSDoc/TSDoc for that).

## Artifact Guides

- [common rules](./references/common-rules.md)
- [flows guide](./references/flows.md)
- [interfaces guide](./references/interfaces.md)
- [business rules guide](./references/spec.md)

## Templates

- [flows template](./assets/templates/flows.md)
- [interfaces template](./assets/templates/interfaces.md)
- [business rules template](./assets/templates/spec.md)
