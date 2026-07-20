# Minimal Instruction Examples

Use only sections supported by repository evidence. These are syntax examples, not a required outline.

## Commands

```markdown
## Commands

- `pnpm test --filter <package>`: run a package's tests.
- `pnpm lint`: run the repository lint check before review.
```

Include prerequisites or working directories only when they are non-obvious. Do not document destructive, deploy, or migration commands as routine validation.

## Gotchas

```markdown
## Gotchas

- Generated clients under `src/generated/` come from `schema/api.yaml`; edit the schema, not generated files.
```

A gotcha should name the trigger, required action, and consequence or reason.

## Scoped Rules

```markdown
---
paths:
  - "packages/api/**/*.ts"
---

- Validate request input with the schema in `packages/api/src/schema/`.
```

Use a nested `CLAUDE.md` when all work in a subtree shares the guidance. Use `.claude/rules/` with `paths` when scope follows file patterns.

## Imports

```markdown
@docs/agent-conventions.md

## Repository-specific additions

- Run `pnpm check` before requesting review.
```

Relative imports resolve from the importing file. Use imports for a maintained canonical source, not to hide excessive always-loaded content. Wrap a literal import-like path in backticks.
