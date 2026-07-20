---
name: create-pr
description: >-
  This skill should be used when the user asks to "create a PR", "create a PR to dev",
  "open a PR to main", "submit a PR", "make a pull request to X", "PR to X branch",
  or any variation of creating a pull request targeting a specific branch. Also triggers
  on "/create-pr".
compatibility: Requires Git, an authenticated GitHub CLI, and network access; designed for Claude Code and OpenCode.
---

# Create Pull Request

Create a GitHub pull request from the current branch. A target/base branch is mandatory; ask
for it if absent. Create a ready PR unless the user explicitly requests a draft.

Use available file-reading, skill/subagent, and shell capabilities. Require `git`, `gh`, a Git
worktree with a GitHub remote, authenticated GitHub access, and network access. Keep commands
non-interactive. Report a missing or failed capability with the command and relevant error;
never suggest that authentication succeeded when `gh auth status` failed.

## 1. Preflight and Existing PR

1. Validate the target as a branch name and identify the current branch. Stop for detached
   `HEAD` or when source and target are the same.
2. Resolve the GitHub host and source remote without printing embedded credentials. Prefer the
   current branch's GitHub upstream, then an appropriate GitHub `origin`.
3. Check `gh` authentication non-interactively for that host.
4. Before doing quality work or pushing, query open PRs for the current source branch and
   requested target. If one exists, return its URL, state, and draft status;
   do not create a duplicate.
5. Inspect `git status --short`. If the worktree is dirty, ask whether to invoke the `commit`
   skill/capability first or continue with only existing commits. If continuing, clearly state
   that uncommitted changes are excluded. Do not stash, discard, or silently commit them.

## 2. Resolve the Current Remote Base

Fetch only the requested target safely into its remote-tracking ref, without tags or force, and
use that freshly fetched ref as the base for every log, diff, review, and check. Stop if the
remote or target cannot be resolved.

Compare the fetched base with `HEAD`:

- Stop if there are no source commits to include.
- Use a non-mutating merge analysis such as `git merge-tree` to detect conflicts. Block the PR
  when conflicts are detected and report the affected paths.
- If the source is behind the fetched base but the merge analysis is conflict-free, warn and
  continue. Never merge, rebase, reset, or force-push to update the branch.

## 3. Read-Only Review

Run the `review-conventions` skill/capability against the fetched remote base in read-only mode.
If that capability is unavailable, perform the equivalent read-only review from applicable
project guidance. Block only clear, objective violations of repository rules. Report subjective
or advisory suggestions without blocking or editing files.

## 4. Repository-Defined Checks

Discover pre-PR commands from repository instructions, manifests, task runners, and CI
configuration. Run only checks the repository actually defines for this change; do not invent a
generic lint/typecheck/test suite. Use non-fixing/read-only options and do not edit files,
auto-fix, commit, or weaken configuration. If a command fails or modifies tracked content, stop
and report the command and relevant output without reverting user work.

## 5. Build and Create

1. Find a PR template using common case variants and locations: root, `.github/`, or `docs/`
   `pull_request_template.md`/`PULL_REQUEST_TEMPLATE.md`, plus Markdown files in root or
   `.github/` `PULL_REQUEST_TEMPLATE/`/`pull_request_template/` directories. If several templates
   exist, choose the clearly applicable one or ask; do not combine them arbitrarily.
2. Derive a concise title and fill the selected template from the commits and diff against the
   fetched base. Without a template, use a short body containing `Summary` and `Test plan`.
3. Push normally with upstream tracking to the resolved source remote. Never force-push.
4. Query again for an existing PR to the requested target to avoid a race or recovering from a
   partially successful prior run. Return it if found.
5. Create the PR with explicit source and base, the prepared title/body, and `--assignee '@me'`.
   Add `--draft` only when requested; omission creates a ready PR.
6. Output the PR URL returned by `gh`. If push or creation fails, report the relevant error and
   do not claim success.

Never merge, rebase, force-push, auto-fix, edit project files, or create commits as part of this
workflow. Use the commit skill only after the user chooses that option.
