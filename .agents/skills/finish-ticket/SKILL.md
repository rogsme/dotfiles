---
name: finish-ticket
description: "Merge the current branch's reviewed pull request and complete its ticket or bundle, only after explicit merge authorization and confirmed human verification: require exact-head CI, a final independent review verdict for the same head and base, and no open feedback; then verify the merge and post-merge CI and move every ticket to done. Use only when the user explicitly says \"merge the PR\", \"finish the ticket\" or \"ship this\"."
license: MIT
metadata:
  rogs-skills/contract: "1"
---

# Finish a reviewed ticket

Close the lifecycle only after explicit merge authorization. This skill owns one merge and the matching tracker completion. It never implements fixes and never infers that manual testing happened. Its only writes are the merge, a conversation comment recording a failed human verification step, the completion comments, and the move of each member from `in-review` to `done`.

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
need issue-tracker.md issue-tracker "## Tracker" "## Operating rules" "## Operations" "### resolve" "### load" "### comment" "### transition" "## States"
need forge.md forge "## Forge" "## Operations" "### find-pr" "### read-pr" "### ci" "### feedback" "### comment" "### merge" "### post-merge-ci" "## CI gate" "## Pull requests" "## Identity limits"
need workflow.md workflow "## Features" "## Worktrees" "## Human verification"
on Bundles && has issue-tracker.md "## Bundles"
on "Browser pass" && need browser-pass.md browser-pass "## When it applies" "## Instances" "## Procedure" "## Captures"
true'
```

When it prints nothing, read the files it checked and continue. When it prints anything, change nothing and reply with exactly:

```
rogs-skills is not configured for finish-ticket in this repository.
Missing: <every line the check printed, separated by commas>
Run /setup-rogs here, then run /finish-ticket again.
Status: SETUP_REQUIRED
```

When the check reports files missing here that exist in the main worktree (the first entry of `git worktree list --porcelain`), the second line says instead: "The configuration exists in <path> but not on this branch. Commit `docs/agents/` to the base branch, then merge the base into this branch." When it reports a version, the second line says: "The configuration is version <n>; this skill expects version 1.", followed by "Run /setup-rogs here to update it." for an older version or "Run `npx skills update` to update the installed skills." for a newer one.

From here on, "the tracker", "the forge" and every operation named in backticks (`merge`, `transition`, ...) mean what those files define, under their operating rules. Any stop below that names no status of its own ends with `Status: BLOCKED` and a one-line `Reason:`.

Ask the user through the harness's structured question tool (`AskUserQuestion` in Claude Code, `question` in OpenCode) when it has one, and again when an answer leaves the decision open. A turn that ends in plain text while the run waits for the user is a stop, even one that only answers the user's reply to an earlier question: its `Reason:` names the decision. After the report, a reply to a later message from the user ends with the status line that applies then. A runner that watches the session reads a turn with neither a pending question nor a status line as a finished run.

## 1. Verify authorization and context

1. Require an explicit instruction from the user to merge this pull request. A green check or a reviewer's verdict is not merge authorization.
2. Read the current branch, the checkout root, the worktree registration and the status. Require the branch and the directory's basename to equal the lead ticket id (`## Worktrees`).
3. Find the unique pull request for that exact branch across open and merged states with `find-pr`, and verify its base is the base `## Forge` names. Reject a closed, unmerged pull request.
4. Derive the tickets (the lead from the branch; with bundles on, the riders from the title and the related-work lines, checked against `## Bundles`) and `load` every member: relations and every comment. Verify the team or project. Accept `in-review`, or `done` only when recovering an already merged pull request. A `done` ticket with an open, unmerged pull request is an inconsistent state: stop with `Status: BLOCKED` and report it for repair instead of merging.
5. Never discard, stage or commit local changes. Stop when local state makes the final verification unsafe.

## 2. Verify the merge packet

For an open pull request, refresh it with `read-pr` immediately before merging and record its exact head SHA. Require:

- A passing gate for that exact SHA per `## CI gate`: successful gate checks belonging to it, or no checks confirmed against the path filters, or the no-CI mode.
- A mergeable, non-conflicting pull request.
- A final independent review summary for that same head SHA and the base SHA it includes, carrying `Verdict: READY_FOR_HUMAN`.
- No unresolved actionable inline, review-body or conversation feedback (`feedback`).
- An acceptance-evidence row for every criterion of every member, and, for a user-visible change with the browser pass on, the captures the review verdict accepted.
- A concrete, numbered human verification procedure in that final review summary.
- Every numbered human step explicitly confirmed as passed by the user, or explicitly waived by the user with a reason.

When human steps remain and the merge instruction did not confirm them, ask one concise question that lists only those step numbers and actions. When any step failed, do not merge: post one conversation comment with `comment` that records the failed step, what the user observed, and the reviewed head SHA, so `address-pr-review` picks it up as feedback; leave the tracker unchanged; and end with `Status: HUMAN_QA_FAILED`. Never infer that a step passed, invent observations, or accept a verdict for an older head.

Fetch the base and require its SHA to equal the base SHA in the final verdict. When the base moved at all after the review, stop with `Status: BLOCKED_FOR_SYNC`: even a clean merge would produce an integration nobody reviewed. Never re-sync, re-verify or re-review from this skill, even when the gap looks mechanical; `address-pr-review` brings the branch up to date, and a fresh review follows.

When the pull request is already merged, this run is recovering from a partial earlier one. Load the latest `Verdict: READY_FOR_HUMAN` summary, reuse its reviewed head and base and the recorded merge commit, skip the merge, and continue with the verification in step 3. Stop when that review summary is absent. Never create a second pull request or a second merge. Recovery does not waive human QA: require the same numbered procedure, and an explicit pass or reasoned waiver for every step, before completing any ticket.

## 3. Merge and verify

Merge with `merge`, using the style `## Forge` names. Never enable auto-merge, bypass protections, force-push, delete branches, or alter the active worktree.

When `merge` is a fallback that hands the merge to a person (a merge queue or a merge train), stop here instead: tell the user to merge through the queue or train, and to run `/finish-ticket` again once the pull request shows as merged. That run takes the already-merged path above. A queue can merge onto a newer base than the reviewed one, so on that path step 4 below reports the merge commit's actual parents instead of requiring the reviewed base, and the post-merge CI in step 5 is required. When the forge rejects the merge because the base moved or the pull request became unmergeable, do not retry: end with `Status: BLOCKED_FOR_SYNC`.

After the merge:

1. `read-pr` and require the merged state plus a merge commit SHA.
2. Fetch the base and verify the merge commit is an ancestor of it.
3. Verify the pull request's merged head equals the reviewed head SHA.
4. Inspect the merge commit. With the `merge` style its parents are the reviewed base and the reviewed head; with `squash` its only parent is the reviewed base. Under either style its tree equals the reviewed head's tree (`git rev-parse <merge commit>^{tree}` against `<reviewed head>^{tree}`): the reviewed head already contained the reviewed base, so nothing else may differ. After a merge through a queue or train, require only that the merged head is the reviewed head, and record the actual parents in the completion comment.
5. Post-merge CI: when the merged diff touches a path in the `## CI gate` filters, wait with `post-merge-ci` and require success for the merge commit; when it touches none, record that no post-merge run is expected; in the no-CI mode, record that.
6. When the merge or the post-merge check is not proven, report the exact partial state and leave the tracker unchanged. A failed post-merge gate ends with `Status: BLOCKED_POST_MERGE`.

## 4. Complete the tickets

Post this on the lead with `comment`, reusing an equivalent existing completion comment:

```markdown
## Completion

- Pull request: {URL}
- Reviewed head: `{head SHA}`
- Reviewed base: `{base SHA}`
- Merge commit: `{merge commit SHA}`
- Pull request CI: {URL, "no checks: the diff touches no CI-filtered path", or "no CI configured"}
- Post-merge CI: {URL, "not expected: the diff touches no CI-filtered path", or "no CI configured"}

### Human verification

- Step {number}: {passed, and who confirmed it; or waived, with the reason}
- Observed limitations: {any limitation the user reported, or None}
```

On each rider, post a `## Completion` comment with only the pull request URL, the merge commit, and a link to the lead's comment. Then `transition` every member from `in-review` to `done` and read each one back: the comment, the pull request link and the `done` state. When tracker automation already moved a member to `done` on the merge (`## States`), verify the state and skip that transition.

On a retry, accept an already merged pull request and already completed members, repair only the members still missing their comment or transition, and never attempt a duplicate merge or transition.

## 5. Report

Return the pull request URL, the reviewed head, the merge commit, the verification evidence, the tracker result for every member, and any remaining cleanup. End with `Status: DONE`.

Never delete branches, remove the active worktree, or switch checkouts. Report the worktree's path for the user to remove when they are ready.
