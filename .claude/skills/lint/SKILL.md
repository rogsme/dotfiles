---
name: lint
description: >-
  Use when the user wants to fix all lint errors, clean up lint warnings, or
  ensure the codebase passes linting before a commit or PR. Also use when lint
  checks are failing in CI, or the user says "run the linter", "fix lint",
  "clean up warnings", or similar. Works with any ecosystem (ESLint, Ruff,
  Clippy, golangci-lint).
argument-hint: ""
---

# Lint — Iterative Fix Loop

## Step 1: Discover the lint command

Read the project's `CLAUDE.md` and find the `## Commands` section. Look for the lint command
(the one labeled "lint" or "linting" — NOT "lint:fix" or "lint-format" variants unless the
standard lint command is not present, in which case use the auto-fix variant).

## Step 2: Detect ecosystem rules

Based on the project files and CLAUDE.md, determine:

| Ecosystem | Suppress directive to AVOID | Config to NOT weaken |
|-----------|----------------------------|----------------------|
| JS/TS (ESLint) | `eslint-disable` comments | ESLint config |
| Python (Ruff) | `# noqa` comments | Ruff config |
| Python (Flake8) | `# noqa` comments | Flake8 config |
| Rust (Clippy) | `#[allow(...)]` attributes | Clippy config |
| Go (golangci-lint) | `//nolint` comments | Linter config |

## Step 3: Iterative fix loop

1. Run the lint command discovered in Step 1
2. Read the files with errors and fix them
3. Run the lint command again to verify fixes and catch new issues
4. Repeat until the linter reports zero errors and zero warnings (exit code 0)

**Rules:**
- Do NOT add suppress/disable comments unless there is genuinely no other way to fix the issue. Prefer actual fixes.
- Do NOT change the linter configuration to be more lenient.
- Keep fixes minimal — only change what's needed to satisfy the linter.

## Step 4: Atomic commit

After all lint errors are resolved, create an atomic commit:
- Stage only the files you modified — never use `git add -A` or `git add .`
- Commit message: `style: fix lint errors`
- If no files were changed, do not create a commit
- Check CLAUDE.md for commit rules (e.g., some projects forbid `Co-Authored-By` lines)
