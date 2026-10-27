---
name: finish-ticket
description: "Merge the current branch's reviewed pull request and complete its ticket or bundle, only after explicit merge authorization and confirmed human verification, or, in an autonomous run the user started, verify-pr's passing report: require exact-head CI, a final independent review verdict for the same head and base, and no open feedback; then verify the merge, move every ticket to done, and verify post-merge CI. Use only when the user explicitly says \"merge the PR\", \"finish the ticket\" or \"ship this\"."
license: MIT
metadata:
  rogs-skills/contract: "1"
---

# Finish a reviewed ticket

Close the lifecycle only after explicit merge authorization. This skill owns one merge and the matching tracker completion. It never implements fixes and never infers that manual testing happened. Its only writes are the merge, a conversation comment recording a failed human verification step, the completion comments, the move of each member from `in-review` to `done`, and moving the tickets the merge unblocked out of `blocked`, with their `## Unblocked` comments.

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
need issue-tracker.md issue-tracker "## Tracker" "## Operating rules" "## Operations" "### resolve" "### load" "### search" "### comment" "### transition" "## States"
need forge.md forge "## Forge" "## Operations" "### find-pr" "### read-pr" "### ci" "### feedback" "### comment" "### merge" "### post-merge-ci" "## CI gate" "## Pull requests" "## Identity limits"
need workflow.md workflow "## Features" "## Worktrees" "## Human verification"
on Bundles && has issue-tracker.md "## Bundles"
on "Browser pass" && need browser-pass.md browser-pass "## When it applies" "## Instances" "## Procedure" "## Captures"
on "Autonomous runs" && has workflow.md "## Autonomous runs"
on "CI review" && has workflow.md "## CI review"
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

When the request says the run is autonomous, follow [Autonomous runs](#autonomous-runs) in place of every question below.

## 1. Verify authorization and context

1. Require an explicit instruction from the user to merge this pull request. A green check or a reviewer's verdict is not merge authorization. In an autonomous run, [Autonomous runs](#autonomous-runs) says what authorizes the merge.
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

When CI review is on, the CI reviewer's summary with `Automated review: CLEAR` for that same head SHA is the final review summary, as `## CI review` says, here and in every step below. It names no base, so the base it includes is the base SHA that is an ancestor of that head, and its numbered procedure is the pull request body's `## Human verification` section at that head.

The user may accept a review's findings as they are. A pull request conversation comment headed `## Review accepted` records it, with an `Accepted head:` line naming the head, an `Accepted review:` line naming the review, and a `Reason:` line. It holds for the accepted head, and for a later head when every commit after the accepted head is a clean merge of the base, checked as below. An acceptance that holds for the head stands in for the final review summary, here and in every step below: the base it includes is the base SHA that is an ancestor of that head, its numbered procedure is the pull request body's `## Human verification` section at that head, and the findings of the reviews on the accepted head, or on a head it holds for, count as answered rather than open feedback. Any other commit after the accepted head voids it. Only the user accepts a review: never post such a comment yourself, and treat one without a `Reason:` line as absent.

The user may confirm steps from the evidence `verify-pr` posted instead of running them; that confirmation is the user's and counts like any other. When the merge instruction says so, require a `verify-pr` report for the confirmed head that marks each of those steps `PASSED`, and whose `Procedure:` line links that final review summary or whose step lines match that summary's steps by action and expected result: the user confirmed what the report shows. A step it marks otherwise, a report that ran another procedure, or a report that is missing leaves that step unconfirmed.

When human steps remain and the merge instruction did not confirm them, ask one concise question that lists only those step numbers and actions. When any step failed, do not merge: post one conversation comment with `comment` that records the failed step, what the user observed, and the reviewed head SHA, so `address-pr-review` picks it up as feedback; leave the tracker unchanged; and end with `Status: HUMAN_QA_FAILED`. Never infer that a step passed, invent observations, or accept a verdict for an older head.

A confirmation counts for the head it names, or, when it names none, for the head of the final review summary the user had when they gave it. A confirmation given on an earlier head still counts when every commit after that head is a clean merge of the base and the final review summary asks the same steps as the summary for the confirmed head, matched by action and expected result rather than by number; a step that is new, or whose action or expected result changed, needs its own confirmation. A clean merge of the base is a merge commit whose second parent is an ancestor of the base, and whose tree (`git rev-parse <merge>^{tree}`) equals the one `git merge-tree --write-tree <merge>^1 <merge>^2` prints; check each one yourself. The commits after a head are the branch's own, the ones `git rev-list --first-parent <that head>..<the current head>` lists, and the oldest of them has that head as its first parent; the base's commits come in through each merge's second parent. Any other commit after the confirmed head, such as a fix or a conflict resolution, voids the confirmations given before it.

Fetch the base and require its SHA to equal the base SHA in the final verdict; after the CI reviewer's CLEAR or the user's acceptance, require it to be an ancestor of the reviewed head. When the base moved at all after the review, stop with `Status: BLOCKED_FOR_SYNC`: even a clean merge would produce an integration nobody reviewed. Never re-sync, re-verify or re-review from this skill, even when the gap looks mechanical; `address-pr-review` brings the branch up to date, and a fresh review follows.

When the pull request is already merged, this run is recovering from a partial earlier one. Load the latest `Verdict: READY_FOR_HUMAN` summary, or with CI review on the CI reviewer's latest CLEAR, or the user's acceptance that held for the merged head, reuse its reviewed head and base and the recorded merge commit, skip the merge, and continue with the verification in step 3. Stop when that review summary is absent. Never create a second pull request or a second merge. Recovery does not waive human QA: require the same numbered procedure, and an explicit pass or reasoned waiver for every step, before completing any ticket.

## 3. Merge and verify

Merge with `merge`, using the style `## Forge` names. Never enable auto-merge, bypass protections, force-push, delete branches, or alter the active worktree.

When `merge` is a fallback that hands the merge to a person (a merge queue or a merge train), stop here instead: tell the user to merge through the queue or train, and to run `/finish-ticket` again once the pull request shows as merged. That run takes the already-merged path above. A queue can merge onto a newer base than the reviewed one, so on that path step 4 below reports the merge commit's actual parents instead of requiring the reviewed base, and the post-merge CI in step 6 is required. When the forge rejects the merge because the base moved or the pull request became unmergeable, do not retry: end with `Status: BLOCKED_FOR_SYNC`.

After the merge:

1. `read-pr` and require the merged state plus a merge commit SHA.
2. Fetch the base and verify the merge commit is an ancestor of it.
3. Verify the pull request's merged head equals the reviewed head SHA.
4. Inspect the merge commit. With the `merge` style its parents are the reviewed base and the reviewed head; with `squash` its only parent is the reviewed base. Under either style its tree equals the reviewed head's tree (`git rev-parse <merge commit>^{tree}` against `<reviewed head>^{tree}`): the reviewed head already contained the reviewed base, so nothing else may differ. After a merge through a queue or train, require only that the merged head is the reviewed head, and record the actual parents in the completion comment.
5. Once items 1 to 4 prove the merge, `transition` every member from `in-review` to `done` and read each state back, before any wait: the change is merged, and the board shows it. When tracker automation already moved a member to `done` on the merge (`## States`), verify the state and skip that transition.
6. Post-merge CI: when the merged diff touches a path in the `## CI gate` filters, wait with `post-merge-ci` and require success for the merge commit; when it touches none, record that no post-merge run is expected; in the no-CI mode, record that.
7. When the merge is not proven, report the exact partial state and leave the tracker unchanged. When the post-merge check is not proven, report the exact partial state; the members stay `done`, since their change is merged. A failed post-merge gate ends with `Status: BLOCKED_POST_MERGE`.

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
- Review: {the final review summary's link, or "findings accepted by the user on `{accepted head}` ({link to the acceptance}): {reason}"}

### Human verification

- Step {number}: {passed on `{the head it was confirmed on}`, and who confirmed it, adding "from verify-pr's evidence ({report link})" when the user confirmed it that way; or waived, with the reason}
- Observed limitations: {any limitation the user reported, or None}
```

On each rider, post a `## Completion` comment with only the pull request URL, the merge commit, and a link to the lead's comment. Read each comment back, with its pull request link.

On a retry, accept an already merged pull request and already completed members, repair only the members still missing their comment or transition, and never attempt a duplicate merge or transition.

Then find what the merge unblocked. Take the tickets each member blocks: from the relations `load` returns, and, where the tracker keeps blockers only as `Blocked by:` lines, from `search` for the lines that name the member. Leave out the members themselves, every ticket in a terminal state, and every ticket already in progress or in review. `load` each one left and read its blockers: it is unblocked when every one of them is now `done`, this merge's members included. A canceled blocker keeps it blocked, since start-ticket treats one as an open question. With bundles on, judge a ticket's whole bundle, resolved as `## Bundles` defines: it is unblocked when the blockers of all its members outside the bundle are, since a blocked-by relation between two members is build order, and it goes by its lead's id, the one start-ticket starts.

A ticket the merge unblocked can sit in `blocked`. When every blocker its `## Blocked` comment names is a ticket that is now `done`, `transition` each of its members back to the state that comment records, and post an `## Unblocked` comment beside the `## Blocked` one naming this merge. Leave a ticket blocked for anything else as it is. The report names each ticket moved.

## 5. Report

Return the pull request URL, the reviewed head, the merge commit, the verification evidence, the tracker result for every member, and any remaining cleanup. Then name the tickets the merge unblocked on one line, `Unblocked: ACM-15, ACM-16`, or `Unblocked: none`, and end with `Status: DONE`. When the tracker cannot answer for them after the merge, write `Unblocked: unknown` and the reason instead; the merge still ends with `Status: DONE`.

Never delete branches, remove the active worktree, or switch checkouts. Report the worktree's path for the user to remove when they are ready.

## Autonomous runs

An autonomous run is one whose request says "This run is autonomous". Follow `## Autonomous runs` in `workflow.md` in place of every step that asks the user, and stop with `Status: BLOCKED` when the row for autonomous runs is off or that section is missing. The user authorized this merge up front, when they started the ticket as an autonomous run. In this skill:

- The authorization is the request, and it holds only when the lead carries the `## Autonomous run` comment start-ticket posted. Without that comment, stop with `Status: BLOCKED`: a request alone cannot make a ticket autonomous.
- In place of the user's confirmations, require a `verify-pr` report that says `Verification: PASSED` for the head the request names, or for an earlier head under the same carry-over rule a confirmation follows, and whose `Procedure:` line links that final review summary or whose step lines match that summary's steps by action and expected result. Each numbered step then counts as waived, with the reason "autonomous run: verify-pr passed it on `{head}`" and the report's link. A report that is missing, `FAILED` or `INCOMPLETE`, or that ran another procedure, ends the run with `Status: BLOCKED`.
- Every other requirement of step 2 holds: the exact-head gate, review-pr's `READY_FOR_HUMAN` summary for the same head and base (with CI review on, the CI reviewer's CLEAR for that head, and in either case the user's acceptance that holds for it), no open feedback, and an unmoved base, which still ends with `Status: BLOCKED_FOR_SYNC`.
- Before merging, check the diff from the base to the head against the hard stops. When it touches one, stop with `Status: BLOCKED`, naming it.
- A merge queue or train hands the merge to a person: stop with `Status: BLOCKED` instead of telling the user to merge.
- The completion comment's `### Human verification` adds a line: "Autonomous run: started by the user as an autonomous run ({link to the `## Autonomous run` comment}); no person verified this change."
