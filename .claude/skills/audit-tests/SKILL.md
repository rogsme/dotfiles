---
name: audit-tests
description: >-
  Use when the user wants to check test suite health, find orphaned or misnamed
  test files, detect anti-patterns in tests, or clean up test structure. Also
  use when the user says "audit tests", "check test quality", "find bad tests",
  "clean up test suite", or wants a structural review of the testing layer.
  Requires .claude/skills.md with test structure configured.
argument-hint: "[--branch <target> | --path <dir> | --all]"
---

# Audit Tests

Audit the test suite for structural issues, naming violations, and quality problems. Fixes orphaned and misnamed test files in place; reports-only for missing tests.

**Arguments:** `$ARGUMENTS` controls the scope:

- `--branch <target>` — Only audit test files for source files changed between `<target>` and HEAD.
- `--path <dir>` — Only audit files in the given directory.
- `--all` — Full project audit.
- *(empty)* — Auto-detect from PR base branch. If no PR found, stop with usage help.

---

## Setup: Load Project Config

**Before doing anything else**, read `.claude/skills.md` and find the `## Audit Tests` section. This section defines:
- **Test Structure** — how tests are organized: `colocated` (test file next to source: `foo.test.ts`) or `mirrored` (separate test dir: `src/tests/<dir>/test_<file>.py`)
- **Known Exceptions** — files/patterns to skip during audits (intentional deviations)
- **Scope Groups** (optional) — how to group files for parallel audits
- **Verification Command** — the command to verify tests are still discoverable after fixes

If `.claude/skills.md` does not exist or has no `## Audit Tests` section, **stop** and tell the user:
> This project needs a `.claude/skills.md` file with a `## Audit Tests` section.

Also read:
- `CONVENTIONS.md` to understand the project's test naming and structure conventions
- `TEST_PATTERNS.md` to understand test quality anti-patterns (needed for Audit 10)
- `CLAUDE.md` for project-level rules and commit conventions

---

## Phase 0: Scope Resolution

Parse `$ARGUMENTS` to determine the mode:

1. **`--branch <target>`** — Get changed source files via `git diff --name-only`. For each source file, include its corresponding test file in scope.
2. **`--path <dir>`** — Set scope to the given directory.
3. **`--all`** — All source and test files (excluding known exceptions).
4. ***(empty)*** — Auto-detect PR base branch. If found, behave as `--branch <base>`. Otherwise stop with usage help.
5. ***(unrecognized)*** — Stop with usage help.

If scope groups are defined in config, group files accordingly. Otherwise, group by directory.

---

## Phase 1: Parallel Directory Audits

Launch **one Explore sub-agent per scope group** (or per test directory) in parallel. Each agent audits source files and their corresponding test files. Each sub-agent runs ALL audits below and reports findings (no fixes yet).

Each sub-agent prompt MUST include:
- The full anti-patterns section from `TEST_PATTERNS.md` (copy verbatim)
- The known exceptions list from config
- The test structure pattern (colocated vs mirrored) so it knows where to look for test files

### Audit 1: Missing test files
Source file exists but no corresponding test file.

### Audit 2: Orphaned test files
Test file exists but no matching source file. Analyze imports to determine what it actually tests. Recommend merge or rename.

### Audit 3: Test file naming
Test file name doesn't match the expected pattern for its source file.

### Audit 4: Test class/function naming
Test functions don't follow `test_*` (Python) or `it('...')` (JS) conventions. Test classes don't follow `Test*` (Python) or `describe('...')` (JS) conventions.

### Audit 5: Missing docstrings/headers
Test functions or files missing required documentation.

### Audit 6: Cross-test imports
Test files importing from other test files instead of source code.

### Audit 7: Empty test files
Test files with no actual test functions.

### Audit 8: No-assertion tests
Test functions that never assert anything.

### Audit 9: Duplicate test names
Test functions with identical names within the same scope that would shadow each other.

### Audit 10: Anti-pattern violations
Check against the anti-patterns defined in `TEST_PATTERNS.md`:
1. **Tautological tests** — restate implementation without exercising logic
2. **"Doesn't throw" / trivial property tests** — no meaningful assertions
3. **Redundant input variations** — same code path with trivially different inputs
4. **Testing the mock** — only assert mock calls, not actual behavior
5. **Snapshot abuse** — large snapshot assertions instead of specific field checks
6. **Trivial function tests** — tests for re-exports, constants, single-line getters

---

## Phase 2: Fix Orphaned and Misnamed Files

After all sub-agents complete, review reports. For fixable issues, launch **general-purpose sub-agents**:

### Fixable (apply changes):
- **Orphaned test files** (Audit 2): Merge contents into correct test file, delete orphan via `git rm`
- **Naming mismatches** (Audit 3): Rename via `git mv`
- **Missing docstrings** (Audit 5): Add appropriate docstrings
- **Empty test files** (Audit 7): Delete via `git rm`
- **No-assertion tests** (Audit 8): Add meaningful assertions or delete
- **Anti-pattern violations** (Audit 10): Fix per anti-pattern type (delete tautological, add assertions to mock-only tests, etc.)

### Report-only (do not fix):
- Missing test files (Audit 1)
- Class/function naming issues (Audit 4)
- Cross-test imports (Audit 6)
- Duplicate test names (Audit 9)

Each fix agent MUST:
1. Read all involved files before making changes
2. Run the project's linter on modified files
3. Create atomic commits with descriptive messages
4. Check CLAUDE.md for commit rules

---

## Phase 3: Verification

After all fixes:
1. Run the **verification command** from config to ensure all tests are still discoverable
2. If any collection errors occur, fix immediately

---

## Phase 4: Report

Present a consolidated report:

### Changes Applied
| Change | File | Details |
|--------|------|---------|
| Renamed | `old.test.ts` -> `New.test.tsx` | Match source |
| Merged | `orphan.test.ts` -> `correct.test.ts` | N tests moved |
| Deleted | `empty.test.ts` | No test functions |
| Fixed | `foo.test.ts` | Removed N anti-pattern violations |

### Issues to Address Manually
| Audit | Scope | Issue | Count |
|-------|-------|-------|-------|
| Missing tests | ... | `Foo.tsx` has no tests | 1 |
| ... | ... | ... | ... |

Include totals at the bottom.
