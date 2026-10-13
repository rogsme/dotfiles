---
name: address-pr-review
description: "Verify and address review feedback on the current branch's pull request: fix the valid findings at their root cause, push back with evidence on the rest, push, get green CI on the exact head, and reply to every comment, at most two rounds per run and never resolving threads. Also brings the branch up to date when the base moved after a review. Use when the user says \"address the review\", \"fix the PR comments\", \"I added comments to the PR\", or \"sync the PR with the base\"."
license: MIT
metadata:
  rogs-skills/contract: "1"
  opencode/slash: "true"
---

# Address review feedback

Treat review comments as claims to verify, not instructions to apply blindly. Make the smallest justified fixes, push them before replying, and answer every feedback channel. The tracker stays read-only, apart from replacement captures.

One run performs at most two address rounds, then stops. A round is steps 3 to 7 against one head: collect the unanswered feedback, classify it, fix the accepted findings, push, wait for the exact-head CI, and reply. Step 8 decides whether a second round happens and enforces the cap. When there is no feedback but the base moved, the run does the sync-only pass in step 9 instead.

## 0. Configuration preflight

Read only, before any git, tracker or forge action. Run this check; it prints one line per problem, and nothing when the configuration is complete:

```sh
sh -c '
cd "$(git rev-parse --show-toplevel)" || exit 1
need() { f="docs/agents/$1"; id="$2"; shift 2
  [ -f "$f" ] || { echo "$f: file missing"; return; }
  case "$(head -n 1 "$f")" in
    "<!-- rogs-skills config v1: $id -->") ;;
    *"rogs-skills config v"*) echo "$f: version: $(head -n 1 "$f")" ;;
    *) echo "$f: marker missing" ;;
  esac
  grep -qF "{{FILL:" "$f" && echo "$f: unfilled {{FILL: text"
  for h in "$@"; do grep -qxF -- "$h" "$f" || echo "$f: $h"; done; }
has() { f="docs/agents/$1"; shift; [ -f "$f" ] || return 0
  for h in "$@"; do grep -qxF -- "$h" "$f" || echo "$f: $h"; done; }
on() { grep -qiE "^[|] *$1 *[|] *on *[|]" docs/agents/workflow.md 2>/dev/null; }
need issue-tracker.md issue-tracker "## Tracker" "## Operating rules" "## Operations" "### resolve" "### load" "## States"
need forge.md forge "## Forge" "## Operations" "### find-pr" "### push" "### read-pr" "### edit-pr" "### ci" "### feedback" "### reply" "### comment" "## CI gate" "## Pull requests"
need workflow.md workflow "## Features" "## Worktrees" "## Verification" "## Commits" "## Sync" "## Project rules" "## Human verification"
need domain.md domain "## Glossary" "## ADRs" "## Consumer rules" "## Recording decisions"
on Bundles && has issue-tracker.md "## Bundles"
on "Browser pass" && { has issue-tracker.md "### attach"; has forge.md "### attach"; need browser-pass.md browser-pass "## When it applies" "## Instances" "## Procedure" "## Captures"; }
grep -qF "docs/agents/pull-request.md" docs/agents/forge.md 2>/dev/null && need pull-request.md pull-request "## Review brief"
true'
```

When it prints nothing, read the files it checked and continue. When it prints anything, change nothing and reply with exactly:

```
rogs-skills is not configured for address-pr-review in this repository.
Missing: <every line the check printed, separated by commas>
Run /setup-rogs here, then run /address-pr-review again.
Status: SETUP_REQUIRED
```

When the check reports files missing here that exist in the main worktree (the first entry of `git worktree list --porcelain`), the second line says instead: "The configuration exists in <path> but not on this branch. Commit `docs/agents/` to the base branch, then merge the base into this branch." When it reports a version, the second line says: "The configuration is version <n>; this skill expects version 1.", followed by "Run /setup-rogs here to update it." for an older version or "Run `npx skills update` to update the installed skills." for a newer one.

From here on, "the tracker", "the forge" and every operation named in backticks (`feedback`, `reply`, `push`, ...) mean what those files define, under their operating rules. Any stop below that names no status of its own ends with `Status: BLOCKED` and a one-line `Reason:`.

## 1. Verify the branch and the pull request

1. Read the current branch and require the checkout directory's basename to match it (`## Worktrees`).
2. Find the open pull request for that exact branch with `find-pr`. Stop gracefully when none exists.
3. Verify that the pull request's head is the current branch and its base is the base `## Forge` names.
4. Read `git status --short --branch`. Never overwrite, revert, stage or commit unrelated existing changes.
5. Fetch the remote branch and compare the local `HEAD` with the pull request's head. Fast-forward a clean checkout that is behind; ask before handling divergence or overlapping uncommitted work.

Never edit from the wrong worktree, and never create a replacement pull request.

## 2. Load the requirements

Derive the pull request's tickets: the lead is the head branch when it matches the id format in `## Tracker`, otherwise the first id in the title. When bundles are on, the riders are the other ids in the title and the related-work lines, checked against the bundle the tracker records (`## Bundles`). Stop and ask when they disagree or no id exists; never fuzzy-match the title.

`load` every member in full: relations, every comment, and the current state of every blocking ticket. Verify the team or project, and request more blocker detail only when its scope affects the feedback. Expect every member in `in-review`; report and ask before editing when one is in another state. Never repair or transition tracker state from this skill.

Build a requirements ledger from the acceptance criteria, the scope, the approved plan, explicit decisions and clarifications in comments, dependency states, and the limitations the handoff names. Later decisions may supersede older ones when their authority and intent are clear. Treat unclear or conflicting comments as open questions rather than requirements.

## 3. Collect all feedback

Refresh and record the pull request number and head commit, then collect every channel with `feedback`: each inline review comment and its replies, review-summary bodies (including requested changes outside the diff), conversation comments, and thread states. Keep the comment ids, so replies land in the original threads.

A reply this skill posted starts with one of the four prefixes in step 6. Treat a comment as answered when such a reply follows it, unless the reviewer added new feedback after that reply. A conversation comment from `finish-ticket` recording a failed human verification step (`HUMAN_QA_FAILED`) is feedback like any other.

When there is no unanswered feedback:

- If the base moved past the pull request (the fetched base is not an ancestor of the head), which is also what a review or a merge attempt that stopped with `BLOCKED_FOR_SYNC` found, run the sync-only pass in step 9.
- Otherwise report that and stop, without creating commits or comments, ending with `Status: READY_FOR_REVIEW`: the pull request is still waiting for review.

## 4. Validate each comment

Classify every unanswered point as accepted, partially accepted, rejected, or no code change. Trace the changed code, every relevant caller, the repository's contracts and the tests before deciding.

- Accept comments that identify a real bug, a regression, contract drift, a cheap and meaningful maintainability problem, or an unmet acceptance criterion.
- Partially accept when the risk is real but the proposed fix is too broad or changes behavior without evidence; prefer the smallest change that satisfies the requirement.
- Push back when the claim is incorrect, speculative, contradicted by the requirements, or would add machinery without solving a demonstrated problem.
- Check each finding against the ADRs (`domain.md`), the contracts and the approved plan before accepting it. Reject a finding that contradicts a recorded decision, citing the decision, unless the finding independently shows a real correctness, regression, privacy or security problem.
- When two findings demand opposite results for the same input, pick one principled rule, pin it with a test, and reply to both with the contradiction as evidence. A heuristic added only to satisfy one finding is how regressions start.
- Treat acknowledgements and notes that only gather evidence as no code change, but still answer them.

Ask the user only when a decision needs unresolved product policy or unavailable external evidence. Uncertainty is never a reason to accept every suggestion.

## 5. Implement the accepted fixes

Fix each accepted issue at its shared root cause, with the smallest regression test; in the test-first areas `## Verification` lists, call the Skill tool with "tdd" for it. When an accepted bug's root cause is not evident from the comment and the code, as with a failed human verification step, call the Skill tool with "diagnosing-bugs" first. Preserve unrelated work, and follow `AGENTS.md` (or `CLAUDE.md`) and the rule files `## Project rules` lists for the touched areas.

Commit each fix with its test as one unit: state the exact paths, the constraints (never amend; no AI attribution and no co-author trailers unless `## Commits` says otherwise; never bypass a hook; leave every other path untouched) and the intent, then call the Skill tool with "commit" and confirm the commit with `git log`. Create no commit for a rejected or no-code-change comment.

When the browser pass is on and an accepted fix changes what a page shows, rerun the affected part of the pass per `browser-pass.md` after the push below, upload the new captures to the lead ticket and to the forge with their `attach` operations, and point the pull request's screenshot links at them. Replacement captures are the only tracker write this skill makes.

After the fixes, run the format command and commit any intended changes it makes, then run the focused checks that prove the fixes. Reuse the pull request's CI gate instead of rerunning the full check locally.

Confirm the worktree is clean apart from explicitly unrelated pre-existing files, then sync per `## Sync`: merge the base. When the merge stops on conflicts, call the Skill tool with "resolving-merge-conflicts" with the constraints that it stays a merge, stages only resolved paths and asks about any hunk that decides product behavior; then conclude it with `git commit --no-edit`. Rerun the affected focused checks when the sync changed code.

Immediately before pushing, fetch and require `<remote>/<base>` to still be an ancestor of `HEAD`; when the base moved (`## CI gate` names the automation that moves it), sync again first.

`push` before replying. Never force-push. Record the new head SHA and wait with `ci`, always through that operation rather than an invented alternative. Require successful gate checks for that exact SHA and a mergeable pull request, applying the path-filter rule in `## CI gate`. Fix deterministic failures inside the round and repeat; report infrastructure, permission or unavailable-service failures with `Status: BLOCKED`, the check URL and the exact partial state.

## 6. Reply to every unanswered comment

After pushing, refresh the feedback and re-read every ticket with its relations, state and comments, so new feedback is not missed, existing replies are not duplicated, and every classification still matches the current requirements.

Reply directly to every previously unanswered comment: `reply` on the original comment of each inline thread, and `comment` for review-body notes and conversation comments, quoting the point you answer. One generic summary never replaces the individual replies. Start each reply with exactly one of **Accepted**, **Partially accepted**, **Rejected** or **No code change**, then give:

- What changed, and the pushed commit, when code changed.
- The verification result.
- Concise evidence and reasoning for a partial acceptance or a pushback, citing the decision record or contract when one decides it.
- Any boundary intentionally left unverified, or follow-up evidence still needed.

After each pushed round, update the pull request body in place with `edit-pr`: pin the `## Review brief` and its evidence to the new head, and update the `## Human verification` procedure when a fix changed its setup, navigation, actions, expected results, regression checks, cleanup or coverage.

Post one conversation comment only when the fixes require human verification again. It carries the new head SHA, the base SHA it contains, the CI result (or the path-filter note), the focused checks, the acceptance evidence the fixes affected, the current numbered procedure, and the hand-off to a fresh review. Post no generic summary comment otherwise.

Never resolve a thread. The reviewer owns resolution after evaluating the response.

## 7. Verify the round

Confirm all of these before the round counts as done:

- Every accepted fix is on the pull request's remote head.
- The required checks passed, or every failure is reported accurately.
- The successful checks belong to the current head, and the pull request is mergeable.
- Every previously unanswered inline, review-body and conversation point received exactly one direct reply, and a conversation comment exists only when human verification changed.
- This skill resolved no thread.
- Every member was read again, still belongs to the configured team or project, and is still `in-review`, and no tracker write other than replacement captures happened. Report state drift instead of correcting it.

## 8. Round limit: two, then stop

Fixing deterministic CI failures inside a round is part of that round, not an extra one: a round is complete only when its CI is green and its replies are posted, so the cap never cuts a round in half.

After round 1, refresh the feedback once (step 3). When new unanswered feedback exists on the current head, run exactly one more round, steps 3 to 7, and stop when it completes.

Two rounds is the hard cap for one run of this skill. An automated reviewer can be very insistent, and a third round never starts: not when the reviewer comments again, not when a thread feels unanswered, not when finishing looks one small fix away. When feedback remains after round 2, list it as unaddressed in the report; the user can run this skill again for two more rounds.

## 9. Sync-only pass

When there is no unanswered feedback but the base moved past the pull request, this pass replaces the address rounds:

1. Sync per `## Sync`, using "resolving-merge-conflicts" for conflicts as in step 5.
2. Rerun the focused checks for the code the sync changed. Commit nothing beyond the merge.
3. Fetch and require the base to be an ancestor of `HEAD`, `push`, and wait with `ci` for the new head. Require green gate checks and a mergeable pull request.
4. Refresh the `## Review brief` in the body with `edit-pr`, pinned to the new head and base SHAs.
5. Post one conversation comment only when the sync changed what the human verification covers.

## Report

Return the classifications, the commits, the push result, the verification performed, links to the replies, and any behavior intentionally left unchanged, or for a sync-only pass, the new head and its CI result. End with `Status: READY_FOR_REVIEW`, so a fresh review session can revalidate the head and resolve the threads.

## Gotchas

- Review summaries can carry actionable notes for files outside the diff; read more than the inline comments.
- Reply through the original inline comment so the discussion stays threaded.
- A pushed commit must precede any reply that says "fixed": a local-only commit is not something the reviewer can check.
