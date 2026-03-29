---
name: test
description: >-
  Use when the user wants to fix all failing tests, get the test suite green,
  or resolve test failures before a commit or PR. Also use when CI tests are
  failing, or the user says "run tests", "fix tests", "make tests pass", or
  similar. Works with any framework (Jest, pytest, Vitest, cargo test, go test).
argument-hint: ""
---

# Test — Iterative Fix Loop

## Step 1: Discover the test command

Read the project's `CLAUDE.md` and find the `## Commands` section. Look for the CI/full test
command (e.g., `pnpm test:ci`, `make test`, `uv run pytest`). Prefer the CI variant if one
exists (it typically includes coverage and strict flags).

## Step 2: Detect ecosystem rules

Based on the project files and CLAUDE.md, determine:

| Ecosystem | Skip directive to AVOID | Framework |
|-----------|------------------------|-----------|
| JS/TS (Jest) | `it.skip`, `xit`, `xdescribe` | Jest |
| JS/TS (Vitest) | `it.skip`, `describe.skip` | Vitest |
| Python (pytest) | `pytest.mark.skip`, `pytest.mark.xfail` | pytest |
| Rust | `#[ignore]` | cargo test |
| Go | `t.Skip()` | go test |

## Step 3: Iterative fix loop

1. Run the test command using the Bash tool with `run_in_background: true`. Then immediately
   call `TaskOutput` with the returned task ID, `block: true`, and `timeout: 600000` (the
   maximum) to wait for results. This handles test suites that exceed the Bash tool's 10-minute
   hard limit.
2. Read the failing test files and source files involved and fix the failures.
3. Run the test command again (same way) to verify fixes and catch new failures.
4. Repeat until the test framework reports no failures (exit code 0).

**Rules:**
- Do NOT delete or skip tests to make them pass — fix the underlying code or test logic.
- Do NOT use skip/xfail directives unless the user explicitly asks.
- Keep fixes minimal — only change what's needed to make the tests pass.

## Step 4: Atomic commit

After all tests pass, create an atomic commit:
- Stage only the files you modified — never use `git add -A` or `git add .`
- Commit message: `fix: resolve test failures`
- If no files were changed, do not create a commit
- Check CLAUDE.md for commit rules (e.g., some projects forbid `Co-Authored-By` lines)
