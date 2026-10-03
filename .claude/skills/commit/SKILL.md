---
name: commit
description: >-
  This skill should be used when the user asks to "commit", "commit changes",
  "commit my work", "make a commit", "create commits", "commit what I have",
  or any variation of committing unstaged/staged changes. Also triggers on
  "/commit". Analyzes changes and creates one or more logical atomic commits
  following the repository's own commit conventions. Discussion, research,
  and message drafting alone do not authorize creating commits.
compatibility: Requires Git and a non-interactive shell; designed for Claude Code and OpenCode.
---

# Commit

Create the smallest useful set of atomic commits while preserving worktree content and
preexisting staged content, including versions that exist only in the index.
A bare request to "commit" includes the entire worktree: staged, unstaged, and untracked
changes. Honor explicit scope and exact-message requests. Otherwise treat supplied message
text as guidance and adapt it to repository conventions. Ask if explicit requirements conflict.

Use available file-reading and shell capabilities. Require a working `git` executable and
a Git worktree; otherwise report the missing capability and stop. Use only non-interactive
commands. Never use interactive staging, editors, or pagers.
Run Git from the worktree root. For discovered filenames, use shell-safe arguments and
`git --literal-pathspecs <command> ... -- <paths>`; `--` alone does not disable pathspec magic.
Use NUL-delimited output for machine parsing, not whitespace splitting or shell reparsing.

## 1. Inspect Safely

1. Record the initial `HEAD` (or unborn state). Read metadata before file contents:
   `git status --porcelain=v1 -z --untracked-files=all`, staged and unstaged name/status and
   numstat output with `-z`, and metadata for untracked files. Account for both rename paths.
2. Classify likely secrets or credentials (`.env` except documented examples, private keys,
   tokens, credential files), database/data dumps, and suspicious generated, binary, or large
   artifacts by name, type, size, repository policy, and ignore rules before reading or staging
   them. Skip and warn about suspicious paths, including already-staged paths, without exposing
   contents. Metadata screening is only triage: inspect safe changes for embedded credentials
   without reproducing suspected values. Ignore rules do not protect tracked files.
3. Stop on unresolved merges or an operation already in progress unless completing that
   operation was explicitly requested. Short status alone is insufficient; check merge,
   rebase, am, cherry-pick, revert, and sequencer state. Resolve administrative paths with
   `git rev-parse --git-path`, not a hard-coded `.git` directory. See
   [Git edge cases](references/git-edge-cases.md#operation-state).
4. Read applicable repository guidance, including `CLAUDE.md`, `AGENTS.md`, and
   `CONTRIBUTING.md` wherever present. Follow explicit project rules over inferred style.
5. Inspect all remaining in-scope diffs and untracked files. Bare `commit` means all safe
   changes; honor an explicit narrower scope if the user supplied one.
6. Inspect recent non-merge subjects and, when useful, bodies. If `HEAD` does not exist,
   use project guidance and a concise imperative subject as the unborn-repository fallback.
   Prefer history for the affected area when global history is mixed. Do not impose
   Conventional Commits unless the repository does.

If no safe in-scope changes remain, report that and stop.

## 2. Plan Atomic Commits

Group changes by coherent purpose and order prerequisites first. Each commit should leave a
coherent, working snapshot without relying on a later commit to repair it. Keep implementation,
related tests, required documentation, lockfiles, and required generated files together.
Separate independent behavior, mechanical refactoring, formatting, and unrelated documentation;
small incidental cleanup need not become its own commit. Split by purpose, not file count.

Existing staged state can be reorganized, but is user work. Before changing it, preserve a
recoverable private snapshot of the index and any dependencies, including staged-only versions.
Keep excluded changes staged after the operation. If staged and worktree versions suggest
conflicting intent, ask before flattening them. Read
[Index preservation](references/git-edge-cases.md#index-preservation) before regrouping,
excluding staged entries, or handling staged/worktree divergence.

## 3. Stage Exactly

For each group:

1. Recheck `HEAD`, index, and worktree against the inspected state. Stop on unexpected concurrent
   changes. Once preservation is secured, use path-scoped index-only operations to prepare the
   group; do not overwrite worktree files or restore an old index over newer work.
2. Stage whole files with `git --literal-pathspecs add -- <paths>`, enumerating approved files
   rather than directories. Avoid blanket staging and interactive commands.
3. For mixed-purpose text files, read
   [Partial staging](references/git-edge-cases.md#partial-staging). Build a replayable patch
   against the current index baseline, then check and apply it with `git apply --cached`.
   Handle new files and non-text changes explicitly. Applicability does not prove intent;
   inspect the resulting staged contents. Stop rather than inventing an uncertain hunk split.
4. Ensure the entire index contains exactly this group, with excluded or later groups safely
   preserved outside the candidate index. Screen staged paths before displaying contents.
   Review all safe cached changes and run `git diff --cached --check`; resolve reported issues
   within scope or report the blocker. This is not a runtime test or secret-safety guarantee.
5. Record the approved index tree with `git write-tree` and the current `HEAD` immediately
   before committing. This captures content and modes for post-commit verification.

Keep temporary patches and index snapshots in a private directory outside the repository.
Remove them only when their contents are committed, restored, or otherwise safely recoverable.
On interruption, report any retained recovery location without printing sensitive contents.

## 4. Commit and Handle Hooks

Write a concise message matching project history: format, type/scope usage, case, punctuation,
and body style. With no established rule, use a specific imperative subject, aim for roughly
50 characters, and omit a trailing period. For nontrivial changes, add a blank line and a body
explaining the problem, why this solution was chosen, and relevant consequences; wrap prose
around 72 columns where practical. These are fallbacks, not universal hard limits.
Use only supported facts; do not invent motivation, measurements, issue references, or testing.
If Conventional Commits applies, mark actual breaking changes with `!` or `BREAKING CHANGE:`.
Honor project attribution policies; do not fabricate reviewer approval or human DCO sign-offs.

Run `git commit` non-interactively with `-m` arguments or `-F <message-file>`, without path
arguments or options that stage content (`-a`, `--include`, `--only`, `--patch`). Commit the
reviewed index. Run configured hooks without bypassing or disabling them. Honor explicit
repository or user check requirements, but keep additional tests, linters, and type checks
opt-in; do not launch extra suites merely to commit.

After every attempt, inspect `HEAD`, the recorded commit if any, and index/worktree changes,
regardless of exit status. Pre-commit failures normally abort creation; post-commit hooks run
after creation, and other failures can occur after `HEAD` advances. A successful hook can also
change the index or message. Read [Hook outcomes](references/git-edge-cases.md#hook-outcomes)
when hooks change files, fail, or produce an unexpected commit.

If no commit was created and a configured hook fails:

- Fix a clear root cause automatically when the fix is safe and in scope.
- Never weaken hook or tool configuration, add suppressions, or delete/disable tests merely to
  pass.
- If a hook deterministically modifies files, inspect those changes, stage only intended files
  or hunks, and repeat the review and tree capture before retrying.
- Retry only while making clear progress. Stop and report ambiguity, unrelated required changes,
  nondeterminism, or a repeated failure with no progress.

If a commit exists, verify it instead of retrying the same commit. Stop and report unexpected
committed content or message changes; do not automatically amend or rewrite history.

## 5. Verify

For each created commit, record its ID and verify its parent (or root status), tree against the
approved tree, message, and recorded diff. Reassess staged, unstaged, and untracked changes after
success and failure. Reconcile preserved staging against the new `HEAD`, keeping excluded entries
intact; do not blindly restore an old index. Stop on unexpected concurrent or hook changes.
At the end, report the exact created IDs and subjects, remaining or skipped paths, checks actually
run, and unresolved failures. A clean status or bounded log alone is not proof of completion.

Never push or amend unless explicitly requested.

For command caveats and the primary sources behind these rules, see
[Git edge cases](references/git-edge-cases.md). Maintainer regression prompts are in
`evals/evals.json`; `scripts/check_git_behaviors.py` checks Git mechanics in disposable repos,
not agent behavior. Neither is a routine pre-commit check.
