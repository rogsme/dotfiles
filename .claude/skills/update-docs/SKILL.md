---
name: update-docs
description: >-
  Use when the user wants to synchronize project documentation with source
  changes, refresh READMEs or guides, or identify affected docs from a branch
  diff. Requires .claude/skills.yaml with a documentation map.
compatibility: Requires Git and YAML project configuration; designed for Claude Code and OpenCode.
---

# Update Docs

Update only documentation selected by the configured source-to-doc map while preserving each document's authored structure, tone, terminology, and formatting. Do not rewrite accurate sections.

Interpret command arguments when available; otherwise use the user's wording:

- Empty: select changed sources from the current branch diff, then update only mapped docs affected by those sources.
- `all`: refresh every mapped document.
- An alias: refresh its configured groups.
- A mapped doc path: refresh only that document.

For empty scope, determine the pull-request or branch base and compare it with `HEAD`, including relevant staged and unstaged tracked source changes. If no base can be determined, ask for a base or explicit scope; do not default to `all`. Reject unknown scopes and out-of-repository paths.

## Required Configuration

Before selecting docs, read `.claude/skills.yaml`. There is no Markdown fallback. The required shape is:

```yaml
version: 1
skills:
  update-docs:
    groups:
      - name: "api"
        docs:
          - path: "docs/api.md"
            sources:
              - "src/api/**"
    aliases:
      backend:
        - "api"
    skip:
      - "generated/**"
    commands:
      check:
        - "project-doc-check-command"
      fix:                         # optional; this skill is a write workflow
        - "project-doc-format-command"
```

Validate before reading mapped content:

- The root contains only `version` and `skills`; `version` is integer `1`, and `skills` is a mapping containing `update-docs`.
- The section contains exactly `groups`, `aliases`, `skip`, and `commands`.
- `groups` is a non-empty list. Each group contains exactly unique non-empty `name` and non-empty `docs`.
- Each doc contains exactly repository-relative Markdown `path` and a non-empty `sources` glob list. Every mapped doc exists, every source glob is valid and matches at least one existing source, and neither can escape the repository.
- A doc path is owned by exactly one group. Group names are unique.
- `aliases` is a mapping of non-empty names to non-empty unique lists of existing group names. `all` is reserved and cannot be an alias.
- `skip` is a list, possibly empty, of valid repository-relative globs. A mapped doc cannot also be skipped; skipped source files do not select docs.
- `commands` contains only required non-empty string list `check` and optional non-empty string list `fix`. Each item is one separately executed command.

Reject unknown keys, invalid types, malformed paths/globs, missing docs or sources, duplicate ownership, invalid aliases, or missing fields with the failing key and YAML shape above. Do not validate or consume sibling skill sections.

## Workflow

1. Resolve selected groups/docs. In default scope, intersect changed files with each doc's `sources` after `skip`; a source may affect multiple docs, but each doc still has one owner. Report when no docs are affected.
2. Read each selected doc fully, all matched sources, project instructions, and relevant generated/API configuration. Compare claims with current behavior and public interfaces.
3. Partition independent docs among as few writing workers as useful. Give each exact doc ownership; no two workers may edit the same doc.
4. Make targeted updates: add newly exposed behavior, remove stale claims, and correct changed examples, parameters, commands, or links. Preserve authored style and do not add update markers.
5. If a selected file is named `CLAUDE.md` or `CLAUDE.local.md`, invoke the `claude-md-improver` skill and do not edit it in this workflow. If it is named `CONVENTIONS.md`, invoke `generate-conventions` and do not edit it directly. Include their approval/report behavior in the final summary.
6. Run each optional `commands.fix` entry separately in listed order, then each `commands.check` entry separately in listed order. Stop on the first failure and report it; do not combine commands or continue past failure.

Report docs changed or already current, source evidence used, delegated special docs, command results, and items needing manual review. Do not commit or push.
