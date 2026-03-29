---
name: fill-test-gaps
description: >-
  Use when the user wants to increase test coverage, write missing tests, fill
  coverage gaps, or add tests for untested code. Also use when the user says
  "add tests", "improve coverage", "fill test gaps", "what's untested", or
  wants coverage-driven test generation for a branch, directory, or the whole
  project. Requires .claude/skills.md with coverage commands configured.
argument-hint: "[--branch <target> | --path <dir> | --all]"
---

# Fill Test Gaps

Scan the project for untested code and fill gaps with meaningful, coverage-driven unit tests.

**Arguments:** `$ARGUMENTS` controls the scope. One of:

- `--branch <target>` — Only test source files changed between `<target>` and HEAD. Also extends existing test files if they don't cover new code paths.
- `--path <dir>` — Only scan the given directory.
- `--all` — Full project scan. Tests everything that's untested.
- *(empty)* — Auto-detect from PR base branch. If no PR found, stop with usage help.

---

## Test Quality Guardrails

All test quality rules (anti-patterns, quality checklist, positive patterns, layer-specific conventions) are defined in `TEST_PATTERNS.md` at the project root. Every agent MUST read that file before writing any test.

---

## Setup: Load Project Config

**Before doing anything else**, read `.claude/skills.md` and find the `## Fill Test Gaps` section. This section defines:
- **Coverage Command** — the command to run tests with coverage (e.g., `pnpm test:ci`, `uv run pytest --cov=src --cov-report=json`)
- **Coverage Output** — where the coverage JSON lives (e.g., `coverage/coverage-final.json`, `coverage.json`)
- **Skip List** — files/patterns to exclude from testing even if coverage reports them
- **Verification Commands** — linter/type checker commands to run after writing tests

If `.claude/skills.md` does not exist or has no `## Fill Test Gaps` section, **stop** and tell the user:
> This project needs a `.claude/skills.md` file with a `## Fill Test Gaps` section.

Also read `CLAUDE.md` to understand the project's technology stack, test conventions, and commit rules.

---

## Phase 0: Scope Resolution

Parse `$ARGUMENTS` to determine the mode:

1. **`--branch <target>`** — Get changed files via `git diff --name-only`. Filter to source files (exclude test files). If no testable files remain, stop.
2. **`--path <dir>`** — Set scope to the given directory.
3. **`--all`** — No scope filter.
4. ***(empty)*** — Auto-detect PR base branch. If found, behave as `--branch <base>`. Otherwise stop with usage help.
5. ***(unrecognized)*** — Stop with usage help.

## Phase 1: Coverage Collection & Reconnaissance

#### Step 1 — Collect coverage baseline

Run the **coverage command** from config.

**Do NOT read the full test output into context.** Instead, dispatch an **Explore agent** to parse the coverage data:
- Read the coverage JSON file (path from config)
- For each source file in scope, extract: covered/uncovered **functions** (by name), uncovered **branches** (by line number), and overall line/branch/function percentages
- Return a structured summary: `{ file, uncoveredFunctions[], uncoveredBranches[], linePct, branchPct, fnPct }`
- Ignore files with 100% coverage

**Scope narrowing:**
- In `--branch` mode: only parse coverage for changed files
- In `--path` mode: only parse coverage for files in the specified directory
- In `--all` mode: parse all files, sorted by coverage % ascending

#### Step 2 — Convention reference (parallel with Step 1)

Dispatch an **Explore agent** simultaneously to gather testing conventions:
- Read `CONVENTIONS.md` and `CLAUDE.md` for project standards
- Read test configuration files (e.g., `pyproject.toml`, `jest.config.ts`, `jest.setup.ts`)
- Read shared test setup files (e.g., `conftest.py`, `jest.setup.ts`)
- Read 2-3 existing test files per layer to catalog actual patterns
- Return a conventions summary to pass to writing agents

## Phase 2: Gap Analysis & Batching

Using the **coverage data from Phase 1** (not guesswork), determine what needs testing:

For each source file with < 100% function or branch coverage:
1. List the specific **uncovered functions** by name
2. List the specific **uncovered branches** by line number — read those lines to understand the untested condition
3. Determine if a test file already exists -> extend it; otherwise -> create new

**Skip** files matching the skip list from config, even if coverage reports them.

**Prioritize by impact:**
- **High**: Functions with 0% coverage containing branching logic
- **Medium**: Partially-covered functions with untested error/edge branches
- **Low**: High-coverage functions missing only trivial branches

**In `--branch` mode:**
- Changed files with no test file -> full test file needed
- Changed files with existing test file -> extend with additional test methods

Group gaps into independent batches by layer or domain. Each batch must be self-contained.

**If no gaps remain after filtering**, stop and report the current coverage state.

## Phase 3: Parallel Test Writing

Determine agents to dispatch (minimum 3, max 6). Each batch must be fully independent — no two agents may write to the same file.

**File conflict rules:**
- Agents must NOT modify shared files (test config, conftest, shared utilities)
- If a fixture is needed but doesn't exist, define it locally within the test file
- Each agent owns its test files exclusively

Dispatch all agents **simultaneously in the background**. Each agent receives:
1. Specific uncovered functions and branches (from coverage data)
2. Exact list of files allowed to create/modify
3. Whether each test file is new or an extension
4. Conventions summary from Phase 1
5. **Full contents of `TEST_PATTERNS.md`** (copy verbatim)

Each agent MUST follow this workflow:

#### Step 1 — Learn conventions
- Read `TEST_PATTERNS.md` for anti-patterns, quality checklist, and layer-specific conventions
- Read `CONVENTIONS.md` and `CLAUDE.md`
- Read shared test setup files (read-only)
- Read 2-3 existing test files from the same layer

#### Step 2 — Understand the code under test
- Read source file(s) thoroughly
- Identify specific uncovered functions and branches
- For each uncovered branch, understand what condition triggers it
- Plan tests targeting specific gaps — NOT already-covered code

#### Step 3 — Write tests
- Follow the project's test file location pattern (colocated or mirrored — determined from existing test files and CLAUDE.md)
- When extending existing files: read first, append new tests, continue existing patterns
- Before writing each test, verify it passes the Quality Checklist from TEST_PATTERNS.md
- Follow layer-specific conventions from TEST_PATTERNS.md

#### Step 4 — Self-review against guardrails
- Re-read TEST_PATTERNS.md
- Delete any test failing quality checklist or matching an anti-pattern
- If fewer than 2 tests remain, reconsider if file genuinely needs testing

#### Step 5 — Verify
- Run new tests in background; wait for completion
- If tests fail, read failure summary, fix, re-run
- Review against CONVENTIONS.md, fix violations
- Do NOT add suppress comments unless no other way

#### Step 6 — Atomic commit
- Stage only new/modified test files for this batch
- Descriptive commit message: `Add tests for <what was tested>`
- Check CLAUDE.md for commit rules
- Do NOT push

## Phase 4: Fixture Consolidation

After all agents complete, dispatch a **general-purpose agent in foreground**:
1. Scan ALL test files for locally defined fixtures/helpers/mocks
2. Identify duplicates across 2+ files or broadly useful utilities
3. Promote to shared location
4. Update imports in test files
5. Run full test suite to verify
6. Commit: `Consolidate shared fixtures and test utilities`

Skip if no duplicates found.

## Phase 5: Coverage Verification

Run the coverage command again, capturing only the summary output.

Compare against baseline:
- If coverage didn't increase for target files, flag for review (tests may be tautological)
- Verify overall coverage meets CI threshold if applicable

If tests fail, dispatch agent to fix, create separate commit.

## Phase 6: Report

```
| File | Tests Added | New/Extended | Layer | Coverage Before | Coverage After |
|------|-------------|--------------|-------|-----------------|----------------|
```

Include:
- Total tests before/after
- Overall coverage before/after
- Per-file coverage delta
- Tests deleted during self-review (with reason)
- Remaining gaps not addressed (with reason)
- In `--branch` mode: changed files and their test coverage status
