---
name: typecheck
description: >-
  Use when the user wants to fix all type errors, resolve type check failures,
  or ensure the codebase passes type checking before a commit or PR. Also use
  when CI type checks are failing, or the user says "fix types", "run
  typecheck", "fix mypy errors", "fix tsc errors", or similar. Works with any
  type checker (TypeScript, MyPy, Pyright).
argument-hint: ""
---

# Typecheck — Iterative Fix Loop

## Step 1: Discover the typecheck command

Read the project's `CLAUDE.md` and find the `## Commands` section. Look for the type-check
command (e.g., `pnpm typecheck`, `uv run mypy src`, `make type-check`).

## Step 2: Detect ecosystem rules

Based on the project files and CLAUDE.md, determine:

| Ecosystem | Suppress directive to AVOID | Config to NOT weaken |
|-----------|----------------------------|----------------------|
| TypeScript (tsc) | `@ts-ignore`, `@ts-expect-error` | tsconfig.json |
| Python (MyPy) | `# type: ignore` | mypy config |
| Python (Pyright) | `# type: ignore`, `# pyright: ignore` | pyrightconfig.json |
| Rust | `#[allow(...)]` | Compiler settings |

## Step 3: Iterative fix loop

1. Run the typecheck command discovered in Step 1.
2. Read the files with errors and fix them.
3. Run the typecheck command again to verify fixes and catch new errors.
4. Repeat until the type checker reports zero errors (exit code 0).

**Rules:**
- Do NOT add type-ignore/suppress comments unless there is genuinely no other way to fix the error. Prefer actual fixes.
- Do NOT change the type checker configuration to be more lenient.
- Keep fixes minimal — only change what's needed to satisfy the type checker.

## Step 4: Atomic commit

After all type errors are resolved, create an atomic commit:
- Stage only the files you modified — never use `git add -A` or `git add .`
- Commit message: `fix: resolve type errors`
- If no files were changed, do not create a commit
- Check CLAUDE.md for commit rules (e.g., some projects forbid `Co-Authored-By` lines)
