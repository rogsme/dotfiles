---
name: review-conventions
description: >-
  Use when the user wants to review code against CONVENTIONS.md, enforce coding
  standards, or fix documented convention violations. Reviews are read-only
  unless the user passes --fix or explicitly asks to enforce/fix conventions.
  Requires .claude/skills.yaml.
compatibility: Requires Git, YAML project configuration, and CONVENTIONS.md; designed for Claude Code and OpenCode.
---

# Review Conventions

Review selected code against the project's authored `CONVENTIONS.md`. Report only by default. Treat `--fix` or explicit fix/enforce intent as permission to edit; plain review/check intent remains read-only.

Interpret command arguments when available; otherwise use the user's wording:

- `--branch <target>`: files changed from `<target>` to `HEAD`.
- `--path <path>`: files under a repository-relative path.
- `--all`: all configured files.
- Empty: use the current pull-request base when available; otherwise show valid scopes and stop.
- `--fix`: may accompany any scope.

Reject unknown arguments and out-of-repository paths.

## Required Configuration

Before review, read `.claude/skills.yaml`. There is no Markdown fallback. The required shape is:

```yaml
version: 1
skills:
  review-conventions:
    extensions:
      - ".py"
      - ".ts"
    exclusions:
      - "generated/**"
    scopes:
      - name: "backend"
        include:
          - "src/backend/**"
        sections:
          - "Python"
          - "Error Handling"
    commands:
      check:
        - "project-read-only-lint-command"
      fix:                         # optional; fix mode only
        - "project-format-command"
```

Validate before reviewing:

- The root contains only `version` and `skills`; `version` is integer `1`, and `skills` is a mapping containing `review-conventions`.
- The section contains exactly `extensions`, `exclusions`, `scopes`, and `commands`.
- `extensions` is a non-empty unique list of dot-prefixed extensions. `exclusions` is a list, possibly empty, of repository-relative globs.
- `scopes` is a non-empty list of mappings containing exactly unique non-empty `name`, non-empty `include` glob list, and non-empty unique `sections` list.
- Every named section exists as a heading in `CONVENTIONS.md`. Scope mappings are the only convention-section mappings; do not infer extras.
- `commands` contains only required non-empty string list `check` and optional non-empty string list `fix`. Each item is one separately executed command.
- Paths/globs are valid, repository-relative, and cannot escape the repository. Expand scopes over configured extensions and exclusions: reject any file owned by multiple scopes.

Reject unknown keys, invalid types, malformed values, duplicate values, overlaps, missing headings, or missing fields with the failing key and YAML shape above. Do not validate or consume sibling skill sections.

## Workflow

1. Require and read all of `CONVENTIONS.md`; also read project instructions and relevant tool configuration. `CONVENTIONS.md` is authoritative for this review.
2. Resolve the requested files, filter by `extensions` and `exclusions`, and assign each file to exactly one scope. Report unmatched selected files and stop rather than silently omitting them. Report when no files remain.
3. Partition owned files among 1-4 non-overlapping reviewers based on scope size. Reviewers may cover multiple small scopes but receive exact files and applicable sections. Use read-only reviewing capabilities unless in fix mode.
4. Check every rule in each mapped section against each owned file. Findings must identify the file/location and the violated documented rule; preferences not stated in `CONVENTIONS.md` are not findings.
5. In read-only mode, run each `commands.check` entry separately in listed order. Check commands must be read-only: never add fix flags, and stop with a configuration error if a check mutates files. Stop on the first failure.

### Fix Mode

All violations of mapped, documented `CONVENTIONS.md` rules are authoritative and should be fixed with minimal changes. If authored rules conflict or a safe interpretation is impossible, stop that item and report the conflict rather than inventing policy.

Do not add suppression comments, exclusions, ignore rules, or configuration changes that weaken formatters, linters, tests, type checks, or security checks. Shared tool configuration remains out of scope unless the documented convention explicitly requires a stricter correction and the user approves it.

After edits, run each optional `commands.fix` entry separately in order, then each `commands.check` entry separately in order. Stop on failure and correct failures caused by the edits when safe. Fix commands are forbidden in read-only mode.

## Report

Lead with violations ordered by severity and include locations, rule headings, scope ownership, check results, fixes applied or proposed, unmatched files, and unresolved conflicts. Do not commit or push.
