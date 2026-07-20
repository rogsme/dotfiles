---
name: fill-test-gaps
description: >-
  Use when the user wants to add meaningful tests, improve coverage of changed
  or risky behavior, or find untested lines, branches, error paths, or public
  behavior. Requires .claude/skills.yaml with coverage configuration.
compatibility: Requires Git, YAML project configuration, and project coverage/test commands; designed for Claude Code and OpenCode.
---

# Fill Test Gaps

Add the smallest useful tests for changed or risky behavior. Optimize for changed lines, meaningful branches, error paths, and public contracts, not a raw coverage percentage or test count.

Interpret command arguments when available; otherwise use the user's wording:

- `--branch <target>`: changed source files and behavior from `<target>` to `HEAD`.
- `--path <path>`: one repository-relative area.
- `--all`: analyze the whole configured coverage output.
- Empty: use the current pull-request base when available; otherwise show valid scopes and stop.

Reject unknown arguments and out-of-repository paths.

## Required Configuration

Before analysis, read `.claude/skills.yaml`. There is no Markdown fallback. The required shape is:

```yaml
version: 1
skills:
  fill-test-gaps:
    coverage:
      command: "project-coverage-command"
      output: "coverage/coverage-final.json"
      format: "istanbul"           # istanbul or coverage.py
    skip:
      - "generated/**"
    commands:
      check:
        - "project-test-command"
      fix:                         # optional; this skill is a write workflow
        - "project-test-format-command"
```

Validate before running coverage:

- The root contains only `version` and `skills`; `version` is integer `1`, and `skills` is a mapping containing `fill-test-gaps`.
- The section contains exactly `coverage`, `skip`, and `commands`.
- `coverage` contains exactly non-empty string `command`, repository-relative `output`, and `format`, which is exactly `istanbul` or `coverage.py`.
- `skip` is a list, possibly empty, of valid repository-relative globs.
- `commands` contains only required non-empty string list `check` and optional non-empty string list `fix`.
- Every path/glob is syntactically valid and cannot escape the repository. Every command list item is one command, not a command sequence to split.

Reject unknown keys, invalid types, malformed values, or missing fields with the failing key and the YAML shape above. Do not validate or consume sibling skill sections.

Read project instructions, conventions, test-quality guidance, manifests, test configuration, and representative nearby tests when present. Actual tooling and authored rules determine test locations and style; do not assume a language or framework.

## Coverage Analysis

Run `coverage.command` separately and stop if it fails or does not create `coverage.output`. Parse only the declared format:

- `istanbul`: use each file's statement, function, and branch maps with their count maps. Map zero counts through `statementMap`, `fnMap`, and `branchMap`; do not treat percentages alone as evidence.
- `coverage.py`: use per-file executed/missing lines and executed/missing branches when present. Do not invent function coverage because standard coverage.py JSON does not provide it.
- If either report omits branch or function detail, degrade to accurate missing-line analysis and state which dimensions were unavailable.

Normalize reported paths to repository-relative paths, reject report entries outside the repository, apply `skip`, and filter to scope. A percentage can rank ties but must not be the objective.

Prioritize evidence in this order:

1. Changed lines and branches with changed behavior.
2. Public behavior and contracts used by other code.
3. Error, validation, security, data-loss, and boundary paths.
4. Complex uncovered branches and functions.
5. Remaining missing lines that can support a meaningful behavior test.

Skip generated code, unreachable defensive code, trivial declarations, and gaps that would only produce implementation-coupled tests; explain each skip.

## Writing

Read the source, callers, existing tests, and applicable configuration before proposing a test. Extend existing files when natural. Refactor fixtures/helpers only when directly required by tests in files owned by that writer; do not perform repository-wide fixture consolidation.

Create 1-4 independent writing batches based on scope size. Each writer receives exact source and test-file ownership; no file may be owned by two writers, and shared configuration is read-only. Use one writer when parallelism adds no value. There is no minimum test count.

Each test must exercise observable behavior and target identified risk. Avoid tautologies, mock-only assertions, broad snapshots, redundant variants, and suppressions. Follow project-owned conventions and use existing dependencies.

For `--all`, analyze and rank the whole project, then present bounded batches with files, targeted behavior, and expected checks. Wait for user approval of one or more batches before writing. Do not interpret `--all` as permission for an unbounded rewrite.

## Verification

Run targeted tests first. Then run every optional `commands.fix` entry separately in listed order and every `commands.check` entry separately in listed order; stop on the first failure. Rerun `coverage.command` separately and compare the targeted line/branch/function evidence available in the declared format. A test is useful even if the global percentage barely changes; investigate tests that do not execute their target.

Report behavior covered, files changed, targeted coverage evidence before/after, command results, and remaining ranked gaps with reasons. Do not commit or push.
