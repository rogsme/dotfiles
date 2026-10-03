---
name: create-pr
description: >-
  This skill should be used when the user asks to "create a PR", "create a PR to dev",
  "open a PR to main", "submit a PR", "make a pull request to X", "PR to X branch",
  or any variation of creating a pull request targeting a specific branch. Also triggers
  on "/create-pr". Follows repository PR templates and conventions, assigns new PRs
  to rogsme, and verifies publication. Discussion, research, and description drafting
  alone do not authorize pushing or creating a PR.
compatibility: Requires Git, an authenticated GitHub CLI, and network access; designed for Claude Code and OpenCode.
---

# Create Pull Request

Create a GitHub pull request from the current branch only when publication is requested.
A target/base branch is mandatory; ask for it if absent. Create a ready PR unless the user
requests a draft. Every new PR must include `rogsme` as an assignee, regardless of the account
authenticated in `gh`. Preserve any additional explicitly requested assignees.

Require `git`, `gh`, a Git worktree, authenticated access to the resolved GitHub host, and
network access. Report missing capabilities and relevant errors without exposing credentials.
Use available file-reading and shell capabilities; keep commands non-interactive, disable
pagers, quote arguments safely, and use NUL-delimited Git records when parsing filenames.
Run Git from the worktree root. Use explicit repositories, refs, and push destinations rather
than ambient `GH_REPO`, GitHub CLI defaults, or broad push configuration.

## 1. Preflight and Existing PR

1. Read applicable `AGENTS.md`, `CLAUDE.md`, and `CONTRIBUTING.md` guidance. Validate the base
   branch name, identify the source branch, and record its `HEAD` OID. Stop on unborn or
   detached `HEAD`, unresolved merges, or an operation in progress. Compare repository and
   branch together: identical branch names in different fork repositories can be valid.
2. Resolve the source repository/remote to push to and the destination repository/remote to
   fetch from independently. Prefer the source branch's GitHub upstream when appropriate;
   resolve the intended destination from guidance and remote metadata, asking if ambiguous.
   For forks or multiple remotes, read [Repository identity](references/github-pr-details.md#repository-identity).
3. Check `gh auth status --hostname <host>` without printing tokens. Failed authentication
   is a blocker; do not initiate interactive login or change the active account automatically.
4. Query open PRs in the destination repository for the exact head repository, source branch,
   and requested base. If one already exists, return its URL, state, draft status, and assignment.
   Leave it unchanged unless editing was requested. A branch name alone is not sufficient proof.
5. Confirm that `rogsme` is eligible for assignment in the destination repository before
   publishing. Read [Assignment and recovery](references/github-pr-details.md#assignment-and-recovery).
   Treat permission or eligibility failures as blockers, not reasons to substitute `@me`.
6. Inspect staged, unstaged, and untracked status. If dirty, ask whether to invoke `commit`
   first or continue with existing commits only. Explain that pending changes are excluded;
   preserve the index and worktree. Re-run preflight after an authorized commit.

## 2. Inspect the Committed Change

Fetch the requested destination base safely, without tags or force, into an appropriate
remote-tracking ref. Stop if the destination or target cannot be resolved. Record the fetched
base OID and source OID; use those fixed commits throughout review and description generation.

- Use `git log <base>..<head>` for commits and `git diff <base>...<head>` for the PR change.
  Stop if there are no source commits or no net PR changes. Stop if a reliable merge base
  cannot be established, including insufficient shallow history.
- Screen changed-path metadata for likely secrets, credentials, dumps, or suspicious artifacts
  before reading contents. Inspect safe diffs without external diff/textconv execution; redact
  suspected credentials and block publication of suspected secrets rather than leaking them.
- Detect merge conflicts without changing the index or worktree, using supported merge analysis
  such as `git merge-tree --write-tree`. This can write Git objects, but does not perform a merge.
  Distinguish conflicts from command errors; block on either and report relevant paths/errors.
- Warn and continue when behind the fetched base but conflict-free. Never merge, rebase,
  reset, or force-push to update the branch as part of this workflow.
- Review the committed diff against applicable repository rules. Use `review-conventions` in
  read-only mode if available, otherwise perform the equivalent review directly. Block clear,
  objective violations; report advisory suggestions without editing project files.

## 3. Required Checks

Run checks explicitly required by the user or applicable repository pre-PR guidance. Discover
their exact commands from manifests, task runners, and CI where needed; a script's existence
or a CI job alone does not require running it locally. Keep additional suites opt-in.

Check the committed contents that will be pushed. A dirty worktree can contaminate results:
use a safely isolated committed snapshot for required checks or report the blocker. See
[Check evidence](references/github-pr-details.md#check-evidence). Use non-fixing modes; never
auto-fix, weaken configuration, or revert user work. Stop on required-check failure or unexpected
tracked/index changes. Record exact commands, outcomes, and the tested commit. Distinguish local
checks from pending or unobserved CI; a template checkbox is not proof a check passed.

## 4. Prepare the Title and Body

Read [Template resolution](references/github-pr-details.md#template-resolution) before choosing
a template. Use the destination repository's default-branch templates, respecting documented
location precedence and inherited owner defaults. Honor an explicit template or project rule;
ask when selection remains ambiguous. A failed lookup is not evidence that no template exists.

Derive the title from project guidance and, when useful, recent merged PR titles for the affected
area. Follow that style instead of imposing Conventional Commits. With no convention, use a
concise, specific title describing the change. Honor an exact requested title unless it conflicts
with explicit repository requirements; ask about conflicts.

Fill the selected template from the inspected commits, net diff, user context, and verified
check evidence. Preserve headings, section order, checklists, and meaningful comments. Replace
instructional placeholders with supported answers; use `Not run` or an explained `N/A` where
appropriate. Leave unverified certifications unchecked, including human approval and sign-offs.
Ask for missing mandatory information rather than fabricate it. Link only supported issues;
use closing keywords only when the change actually resolves them and explain non-default-base
limitations when relevant. See [Body preparation](references/github-pr-details.md#body-preparation).

Without a template, use `Summary` and `Test plan`: explain the problem and change briefly,
then checks actually run, failures, or why checks were not run. Include material risks or
compatibility changes when supported. Write the completed body to a private temporary file
outside the repository. Prepare the body yourself; `--fill` is not template completion.

## 5. Publish Once

1. Recheck repository identity, source branch, `HEAD`, and pending work against the inspected
   state. Stop on unexpected concurrent changes. Push only the reviewed source branch normally
   to the resolved source remote with an explicit refspec and upstream tracking. Respect hooks
   and push protection; never bypass them. Verify the remote source OID matches the reviewed
   commit, including after a failed push. Stop on hook edits or an unexpected remote OID.
2. Query again for an exact existing PR to avoid races. Return a preexisting/concurrently
   created PR unchanged; distinguish it from a PR created by this attempt during recovery.
3. Create with explicit destination repository, base, head, title, completed body file, and
   `--assignee rogsme`. Include any additional requested assignees and `--draft` only if requested.
   Use the command pattern in [Non-interactive submission](references/github-pr-details.md#non-interactive-submission).
   Do not use implicit forking/pushing, `--web`, an editor, or `--template` with `--body-file`.
   For a preview, display the prepared input without publication; `--dry-run` can still push.

## 6. Verify and Recover

After every creation attempt, inspect the returned URL and query the exact PR, regardless of
exit status. Verify destination repository, head repository/branch/OID, base branch, title,
body, draft status, and all required assignees, including `rogsme`. Do not infer success from a
URL, clean worktree, or zero exit status alone.

If this attempt created a PR but assignment failed or is missing, add `rogsme` to that PR without
removing existing assignees, then verify again. Read [Assignment and recovery](references/github-pr-details.md#assignment-and-recovery)
before retrying. Never create a second PR to repair metadata. Preserve errors and report a
created-but-incomplete PR with its URL and precise blocker if recovery fails. If creation outcome
is uncertain and cannot be queried, stop rather than retry blindly. Do not overwrite a body or
other metadata changed concurrently by someone else.

Report the verified URL, base/head, draft status, assignment, checks actually run, excluded pending
changes, and any remaining failure. Delete only your own temporary body files once no longer
needed; retain and report their location when useful for recovery, without exposing sensitive data.

Never merge, rebase, force-push, auto-fix, edit project files, or create commits as part of this
workflow. Invoke `commit` only after the user chooses it. Maintainer regression prompts live in
`evals/evals.json`; they are not routine pre-PR checks.
