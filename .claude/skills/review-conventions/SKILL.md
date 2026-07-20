---
name: review-conventions
description: >-
  Use when the user wants to check code against project conventions, enforce
  coding standards, or fix convention violations before a PR or merge. Also use
  when the user says "review conventions", "check code style", "enforce
  standards", "are we following conventions", or wants a pre-merge quality
  sweep. Reviews are read-only unless the user explicitly asks to fix issues or
  passes --fix. Requires .claude/skills.md with scope groups configured.
argument-hint: "[--branch <target> | --path <dir> | --all] [--fix]"
---

# Review Conventions

Review code and verify it follows this project's coding conventions. Report violations by default; apply changes only with explicit fix intent.

**Arguments:** `$ARGUMENTS` controls the scope. One of:

- `--branch <target>` — Only review source files changed between `<target>` and HEAD (e.g., `--branch main`).
- `--path <dir>` — Only review files in the given directory (e.g., `--path src/services/`).
- `--all` — Full project review. Checks everything.
- `--fix` — Fix convention violations after reviewing. May be combined with any scope.
- *(empty)* — Auto-detect: try `gh pr view --json baseRefName -q .baseRefName 2>/dev/null` to find the PR base branch. If a PR is found, behave as `--branch <base>`. If no PR is found, **stop** and tell the user:
  > No open PR detected for this branch. Please specify a scope:
  > - `/review-conventions --branch main` to review files changed vs main
  > - `/review-conventions --path src/services/` to review a specific directory
  > - `/review-conventions --all` to review the entire project

If the argument doesn't match any of the above patterns, **stop** and show the same usage help.

Treat an explicit request to fix or enforce conventions as fix mode. Plain review, check, or pre-merge sweep requests are read-only.

---

## Setup: Load Project Config

**Before doing anything else**, read `.claude/skills.md` and find the `## Review Conventions` section. This section defines:
- **Scope Groups** — how to group files (e.g., services, routes, components, etc.) with glob patterns
- **File Extensions** — which file extensions to include (e.g., `.py`, `.ts`, `.tsx`)
- **Verification Command** — the command to run after all agents complete (e.g., `uv run ruff check . --fix && uv run mypy src`)
- **Convention Sections per Scope** (optional) — which CONVENTIONS.md sections each scope agent should focus on

If `.claude/skills.md` does not exist or has no `## Review Conventions` section, **stop** and tell the user:
> This project needs a `.claude/skills.md` file with a `## Review Conventions` section. See the skill documentation for the expected format.

Also read `CLAUDE.md` to understand the project's technology stack, architecture, and project rules.

---

## Instructions

You are orchestrating a convention review. Conventions live in `CONVENTIONS.md` — the full rule set is there, not in this skill. Each scope group gets its own sub-agent. Read-only mode reports violations; fix mode may edit and verify owned files.

### Phase 0: Scope Resolution

Detect and remove `--fix` before resolving scope, then parse the remaining `$ARGUMENTS`:

1. **`--branch <target>`** — Run `git diff --name-only <target>...HEAD` to get changed files. If empty, try `git diff --name-only <target>`. Filter to the file extensions from config. If no matching files remain, report that and stop.
2. **`--path <dir>`** — Glob all matching files in the given directory. If no files found, report that and stop.
3. **`--all`** — No scope filter. Glob all matching files in the project (excluding common exclusions like `node_modules/`, `__pycache__/`, `venv/`, `.venv/`).
4. ***(empty)*** — Run `gh pr view --json baseRefName -q .baseRefName 2>/dev/null`. If a base branch is returned, behave as `--branch <base>`. Otherwise, stop with the usage message above.
5. ***(unrecognized)*** — Stop with the usage message above.

Group the in-scope files by the scope groups defined in `.claude/skills.md`. Discard any empty scope groups. If no non-empty groups remain, report "no files in scope" and stop.

### Phase 1: Parallel Convention Review

Launch one agent per non-empty scope group simultaneously. Use read-only exploration agents in review mode and general-purpose agents in fix mode. Each agent receives:
1. The exact list of files it must check (only the in-scope files in its scope group)
2. Instructions to **read `CONVENTIONS.md` first** as the source of truth for all conventions
3. If the config specifies convention sections per scope, tell the agent which sections to focus on
4. The **agent workflow** (Steps 1-4 below, summarized in the agent prompt)

**File conflict rules** (critical for parallel safety):
- Each agent owns its files exclusively — verify no overlap before dispatching
- Agents must **NOT modify shared config files** (linter config, type checker config, formatter config, `conftest.py`, etc.)
- Do NOT add suppress comments (e.g., `# noqa`, `eslint-disable`, `# type: ignore`) unless there is genuinely no other way to fix the error. Prefer actual fixes.
- Do NOT change linter/formatter/type checker configuration to be more lenient.

### Phase 2: Final Verification

In fix mode, run the **verification command** from `.claude/skills.md` to catch cross-scope issues and fix failures without committing. In review mode, run it only if it is non-mutating; otherwise skip it and note that in the report. Never add auto-fix flags in review mode.

### Phase 3: Report

Present a summary:

```
| Scope | Files Checked | Violations Found | Violations Fixed | Unfixable |
|-------|---------------|------------------|------------------|-----------|
| ... | N | N | N | N |
```

Include:
- Total files checked and violations fixed across all scopes
- Per-scope breakdown (files checked, violations found, violations fixed)
- Any violations that could not be auto-fixed (with reason and file location)
- In `--branch` mode: list of changed source files and whether each was reviewed

---

Each agent MUST follow this workflow:

#### Step 1 — Learn conventions
- Read `CONVENTIONS.md` (full file) to understand the project's coding standards
- Read `CLAUDE.md` for project-level rules
- Internalize the applicable convention sections provided in the agent prompt

#### Step 2 — Review or fix
- Read each file in scope fully
- Check every applicable rule against the file
- In review mode, report violations without modifying files
- In fix mode, fix violations in-place with minimal changes — only change what's needed to satisfy conventions
- Do NOT add comments like `# Updated`, `// Changed`, `# Added`, `// Removed`, etc.
- In fix mode, re-read each modified file to confirm the fix is correct and didn't introduce new issues

#### Step 3 — Verify
- In review mode, run only non-mutating checks and report errors
- In fix mode, run the project's linter, type checker, formatter, and relevant tests on owned files; fix resulting errors
- Do NOT add suppress comments unless there is genuinely no other way

#### Step 4 — Report
- Return a summary listing: files checked, violations found (with rule name), violations fixed, any issues that could not be auto-fixed
- Do NOT commit or push; leave fix-mode changes for the user to review
