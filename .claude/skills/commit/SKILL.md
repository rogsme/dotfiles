---
name: commit
description: >-
  This skill should be used when the user asks to "commit", "commit changes",
  "commit my work", "make a commit", "create commits", "commit what I have",
  or any variation of committing unstaged/staged changes. Also triggers on
  "/commit". Analyzes changes and creates one or more logical atomic commits
  following the repository's own commit conventions.
compatibility: Requires Git and a non-interactive shell; designed for Claude Code and OpenCode.
---

# Commit

Create the smallest useful set of atomic commits while preserving all worktree content.
A bare request to "commit" includes the entire worktree: staged, unstaged, and untracked
changes. Treat supplied text as message guidance, not a literal message or a path scope,
and adapt it to repository conventions.

Use available file-reading and shell capabilities. Require a working `git` executable and
a Git worktree; otherwise report the missing capability and stop. Use only non-interactive
commands. Never use interactive staging, editors, or pagers.

## 1. Inspect Safely

1. Read status and change metadata before file contents: `git status --short`, staged and
   unstaged name/status and numstat output, and metadata for untracked files.
2. Classify likely secrets or credentials (`.env` except documented examples, private keys,
   tokens, credential files), database/data dumps, and suspicious generated, binary, or large
   artifacts by name, type, size, and ignore rules before reading or staging them. Skip and
   warn about each suspicious path; do not expose its contents.
3. Stop on unresolved merges or an operation already in progress unless completing that
   operation was explicitly requested.
4. Read applicable repository guidance, including `CLAUDE.md`, `AGENTS.md`, and
   `CONTRIBUTING.md` wherever present. Follow explicit project rules over inferred style.
5. Inspect all remaining in-scope diffs and untracked files. Bare `commit` means all safe
   changes; honor an explicit narrower scope if the user supplied one.
6. Inspect recent non-merge subjects and, when useful, bodies. If `HEAD` does not exist,
   use project guidance and a concise imperative subject as the unborn-repository fallback.
   Do not impose Conventional Commits unless the repository does.

If no safe in-scope changes remain, report that and stop.

## 2. Plan Atomic Commits

Group changes by coherent purpose and order dependent commits first. Keep implementation and
its tests together unless repository history clearly separates them. Separate independent
behavior, formatting, generated output, and unrelated documentation. Do not split one logical
change merely to create more commits.

Existing staged state is input, not an immutable boundary: temporarily reorganize it when
needed to make correct commits. Never discard or overwrite worktree content.

## 3. Stage Exactly

For each group:

1. Record status and the current staged diff. Normalize only the index back to `HEAD` with
   `git reset HEAD -- <paths>` as needed; this must leave the worktree untouched. In an
   unborn repository, use index-only operations such as
   `git rm --cached -r --ignore-unmatch -- <paths>` instead.
2. Stage whole paths with `git add -- <paths>`. Always use `--` before path arguments; never
   use `git add .`, `git add -A`, or an interactive Git command.
3. When one file contains changes for different commits, build a temporary patch outside the
   repository from `git diff HEAD -- <path>` (or against Git's empty tree when unborn), retain
   only the group's complete hunks, then run
   `git apply --cached --check <patch>` followed by `git apply --cached <patch>`. If changes
   share a hunk, split the patch carefully with valid hunk ranges and verify it with `--check`.
   This stages partial hunks non-interactively while leaving every worktree byte intact.
4. Compare `git diff --cached -- <paths>` with the intended group, then inspect the exact full
   cached diff using `git diff --cached --check` and `git diff --cached`. Remove accidental
   staged content with index-only operations and repeat until the cache contains exactly one
   atomic change. Do not proceed on ambiguity.

Temporary patches must not be added to the repository and should be removed after use. Any
previously staged change not included in the current commit remains in the worktree and can be
staged for its intended later group.

## 4. Commit and Handle Hooks

Write a concise message matching project history: format, type/scope usage, case, punctuation,
and body style. Incorporate supplied message guidance where accurate, but rewrite it when needed
to fit the repository and actual diff.

Run `git commit` non-interactively with `-m` arguments or `-F <message-file>`. This runs the
repository's configured Git hooks; never bypass them with `--no-verify`. Do not proactively run
linters, tests, type checks, or other quality suites merely to commit.

If a configured hook fails:

- Fix a clear root cause automatically when the fix is safe and in scope.
- Never weaken hook or tool configuration, add suppressions, or delete/disable tests merely to
  pass.
- If a hook deterministically modifies files, inspect those changes, stage only the intended
  paths or hunks with `git add -- <paths>` or a cached patch, and re-verify the exact cached diff.
- Retry only while making clear progress. Stop and report ambiguity, unrelated required changes,
  nondeterminism, or a repeated failure with no progress.

A failed hook creates no commit, so retry the same commit after correction. Never amend unless
the user explicitly requested it.

## 5. Verify

After every commit, confirm its recorded diff and reassess the remaining staged, unstaged, and
untracked changes before building the next group. At the end, run `git status --short` and show
the newly created commits with a bounded `git log --oneline` query. Report intentionally skipped
or remaining paths explicitly.

Never push or amend unless explicitly requested.
