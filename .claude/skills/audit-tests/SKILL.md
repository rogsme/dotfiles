---
name: audit-tests
description: >-
  Use when the user wants to audit test-suite health, find missing, orphaned,
  misnamed, or weak tests, or clean up test structure. Audits are read-only
  unless the user passes --fix or explicitly asks for fixes. Requires
  .claude/skills.yaml.
compatibility: Requires Git, YAML project configuration, and project test commands; designed for Claude Code and OpenCode.
---

# Audit Tests

Audit tests against project-owned rules and actual test-tool configuration. Report only by default. Treat `--fix` or explicit fix/clean-up intent as permission to edit; never infer fix intent from "audit", "check", or "review".

Interpret command arguments when the host supplies them; otherwise use the user's wording:

- `--branch <target>`: files changed from `<target>` to `HEAD`, plus related tests.
- `--path <path>`: files under one repository-relative path.
- `--all`: all configured source and test files.
- Empty: use the current pull-request base when available; otherwise show the valid scopes and stop.
- `--fix`: may accompany any scope.

Reject unknown arguments and out-of-repository paths.

## Required Configuration

Before auditing, read `.claude/skills.yaml`. There is no Markdown fallback. The required shape is:

```yaml
version: 1
skills:
  audit-tests:
    source_globs:
      - "src/**"
    test_globs:
      - "tests/**"
    known_exceptions:
      - pattern: "tests/fixtures/**"
        reason: "Fixture modules are imported by tests and are not tests."
    commands:
      check:
        - "project-test-collection-command"
      fix:                         # optional; fix mode only
        - "project-test-format-command"
```

Validate before doing other work:

- The root contains only `version` and `skills`; `version` is integer `1`, and `skills` is a mapping containing `audit-tests`.
- The section contains only `source_globs`, `test_globs`, `known_exceptions`, and `commands`; all are required except `commands.fix`.
- Glob lists and command lists are non-empty lists of non-empty strings. `known_exceptions` is a list, possibly empty, of mappings containing exactly non-empty `pattern` and `reason` strings.
- Paths and globs are syntactically valid, repository-relative, and cannot escape the repository. Reject source/test files classified by both glob sets.
- `commands` contains only `check` and optional `fix`. Do not parse chained commands into steps: every list item is one separately executed command.

Reject unknown keys, invalid types, malformed values, or missing required fields with the failing key and the YAML shape above. Do not validate or consume sibling skill sections.

Also read existing project instructions, `CONVENTIONS.md`, test-quality guidance, manifests, and the actual test runner/linter configuration when present. Derive framework, discovery, naming, fixture, assertion, and quality rules from the YAML scope plus those files. Do not assume Python, JavaScript, a naming syntax, or a colocated/mirrored layout. If source-to-test correspondence cannot be established confidently, report that limitation rather than guessing.

## Workflow

1. Resolve scope and apply a known exception when a file matches its configured `pattern`. Record every excluded file with the configured `reason`.
2. Partition selected files into 1-4 non-overlapping groups based on size and domains. Use one read-only reviewer for a small scope and additional independent reviewers only when useful. Give each reviewer exact ownership and the same project-derived rules.
3. Review source/test correspondence, discovery and naming, orphaned or empty files, duplicate/shadowed tests, cross-test coupling, missing required documentation, assertions and behavior verification, fixture misuse, brittle snapshots, mock-only tests, tautologies, and other project-documented anti-patterns. Report only evidence-backed findings with file locations and rule/config sources.
4. In read-only mode, run each `commands.check` entry separately in listed order. It must be read-only; if a configured check mutates files, stop and report the configuration error. Stop on the first command failure and include its output in the report.

### Fix Mode

Apply every clear finding, including clear semantic corrections to tests. Prefer the shared/root-cause correction when several findings have one cause. Rename or delete only when evidence makes the intended destination or safe removal unambiguous; do not invent speculative assertions or behavior changes whose intent cannot be proved. Never add suppressions or weaken test, lint, type, or coverage configuration.

After edits, run each optional `commands.fix` entry separately in order, then rerun each `commands.check` entry separately in order. Stop on the first failure, fix failures caused by the edits when safe, and report unresolved failures. Fix commands are forbidden in read-only mode.

## Report

List files reviewed and excluded, findings by severity with evidence, checks and results, changes applied or proposed, and ambiguous items left untouched. For missing tests, offer an immediate `fill-test-gaps` handoff with the affected files. Do not commit or push.
