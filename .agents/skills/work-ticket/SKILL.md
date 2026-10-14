---
name: work-ticket
description: "Execute the approved plan for the current ticket or bundle: post the plan and move to in-progress, implement test-first where configured, commit in atomic units, sync with the base, run the browser pass, open the pull request, get green CI on its exact head, hand off in the tracker and move to in-review. Use after start-ticket when the user approves the plan and says \"go\", \"do it\", \"execute the plan\", \"build this ticket\" or \"continue ACM-123\"."
license: MIT
metadata:
  rogs-skills/contract: "1"
---

# Work an approved ticket

Implement the approved plan through a verified pull request and a tracker handoff. The work is complete only when the pull request exists, its exact head passes the CI gate, and every ticket reads `in-review`; a local commit without the pull request is a partial state, not a finish.

This skill grants permission to create the commits, push the branch and open the pull request the workflow needs. Its only tracker writes are the ones listed here: the plan comment with the `in-progress` transition, the capture attachments, and the handoff comment with the `in-review` transition. The user's approval of the plan lifts any earlier instruction that kept the tracker read-only for these writes; make them without asking again.

When bundles are on, every rule that names "the ticket" applies to each member: the full comments go on the lead, each rider gets a pointer comment naming the lead and the pull request, and every member makes each transition together.

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
need issue-tracker.md issue-tracker "## Tracker" "## Operating rules" "## Operations" "### resolve" "### load" "### list-in-flight" "### comment" "### transition" "## States"
need forge.md forge "## Forge" "## Operations" "### find-pr" "### push" "### create-pr" "### read-pr" "### edit-pr" "### assign" "### ci" "### feedback" "## CI gate" "## Pull requests"
need workflow.md workflow "## Features" "## Worktrees" "## Verification" "## Commits" "## Sync" "## Project rules" "## Human verification"
need domain.md domain "## Glossary" "## ADRs" "## Consumer rules" "## Recording decisions"
on Bundles && has issue-tracker.md "## Bundles"
on "Model routing" && has issue-tracker.md "## Model routing"
on "Browser pass" && { has issue-tracker.md "### attach"; has forge.md "### attach"; need browser-pass.md browser-pass "## When it applies" "## Instances" "## Procedure" "## Captures"; }
grep -qF "docs/agents/pull-request.md" docs/agents/forge.md 2>/dev/null && need pull-request.md pull-request "## Review brief"
true'
```

When it prints nothing, read the files it checked and continue. When it prints anything, change nothing and reply with exactly:

```
rogs-skills is not configured for work-ticket in this repository.
Missing: <every line the check printed, separated by commas>
Run /setup-rogs here, then run /work-ticket again.
Status: SETUP_REQUIRED
```

When the check reports files missing here that exist in the main worktree (the first entry of `git worktree list --porcelain`), the second line says instead: "The configuration exists in <path> but not on this branch. Commit `docs/agents/` to the base branch, then merge the base into this branch." When it reports a version, the second line says: "The configuration is version <n>; this skill expects version 1.", followed by "Run /setup-rogs here to update it." for an older version or "Run `npx skills update` to update the installed skills." for a newer one.

From here on, "the tracker", "the forge" and every operation named in backticks (`comment`, `push`, `ci`, ...) mean what those files define, under their operating rules. When an operation says `Capability: Unsupported`, follow its fallback; stop with `Status: BLOCKED` and a `Reason:` line when no way forward exists. Any stop below that names no status of its own ends with `Status: BLOCKED` and a one-line `Reason:`.

## 1. Preconditions

1. Require an implementation-ready plan and the user's explicit approval of it: the plan approved in this session, or an `## Approved implementation plan` comment already on the lead ticket when resuming in a fresh session. When neither exists, stop, tell the user to run `/start-ticket <id>` first, and end with `Status: BLOCKED` and `Reason: no approved plan`.
2. Derive the lead id from the plan and require both the current branch and the checkout directory's basename to equal it exactly (`## Worktrees`).
3. Confirm that `git worktree list --porcelain` lists this checkout. Stop rather than switching or creating a worktree when it is wrong.
4. `resolve` and `load` the ticket with its relations and every comment, and verify the team or project. When bundles are on, resolve the bundle again and require the members the plan names; stop when the bundle changed.
5. Refresh every declared blocker and run `list-in-flight`. Load more detail only for plausible conflicts with the approved scope or its coupled contracts. Stop when an unresolved prerequisite or an unsafe in-flight conflict exists. Ask before adding a blocked-by relation for a real blocker that is not recorded.
6. When model routing is on and the plan's `Model:` line names a model other than the one this session runs on, ask before continuing.
7. Before the first edit, persist the plan: post one `## Approved implementation plan` comment on the lead with `comment`, reusing an equivalent existing comment, holding the goal, non-goals, affected areas, acceptance criteria, test strategy (the agreed seams) and known risks. Then `transition` every member that is `new` or `ready` to `in-progress`. Read the comment and the states back before the first edit.
8. Continue when the readback reports `in-progress`. Ask before reopening a ticket from any later or terminal state.
9. Read `git status --short --branch`. Never revert, overwrite, stage or commit unrelated existing changes; ask when they overlap the planned work or would prevent a safe sync.

## 2. Implement and verify

Follow the approved plan, `AGENTS.md` (or `CLAUDE.md`), the rule files `## Project rules` lists for the touched areas, and the glossary and ADRs `domain.md` points to. Trace root causes and shared callers before editing, and keep mirrored contracts synchronized. When the plan cites reference material, reuse its mechanisms on the terms `## Project rules` sets, never its code, and leave any local reference checkout exactly as you found it.

In the test-first areas `## Verification` lists, call the Skill tool with "tdd" and work in red-green slices at the seams the approved plan names. The approved plan is the seam agreement: add a seam only when the plan's intent needs it, and record each added seam in the pull request's summary. A public interface the plan did not cover is a plan change: stop and ask.

When the ticket is a bug whose cause the approved plan leaves open, call the Skill tool with "diagnosing-bugs" and find the cause with a loop that goes red before you write the fix.

Ask when a material unknown appears; never turn an unresolved product decision or external behavior into an implementation assumption. Don't interrupt for ordinary implementation choices the plan covers; record minor assumptions in the pull request. Stop only for unresolved product behavior, missing access, destructive operations, unsafe git divergence, newly discovered blockers, or evidence that the ticket itself is wrong.

Prefer the smallest complete change. Add the smallest test that proves each non-trivial fix, and run the focused checks from `## Verification` while working. Verification is discovered, not assumed: report a command marked `not configured` as such, and when an acceptance criterion needs verification no configured command can provide, report that gap in the handoff instead of claiming it passed.

When a ticket records a decision that meets the bar in `domain.md` `## Recording decisions`, write the ADR in the same commit as the change it explains.

## 3. Commit in atomic units

Commit each coherent unit as it becomes complete instead of accumulating one bulk commit. For each unit:

1. Format the touched code and run its focused checks.
2. State the unit's exact paths, its constraints, and its intent in one or two sentences. The constraints: never amend; no AI attribution and no co-author trailers unless `## Commits` says otherwise; never bypass a hook; leave every path outside the scope untouched.
3. Call the Skill tool with "commit" for that scope.
4. Confirm the commit with `git log`. When `commit` reports an in-scope path it skipped, or a hook failure it could not fix, resolve it before starting the next unit.

Keep coupled implementation and tests in one unit when splitting them would leave a broken commit, and separate independent features, harnesses, formatting and documentation. Never commit the paths `## Commits` excludes. Don't split one logical change merely to raise the commit count.

## 4. Finalize the branch

1. Run the format command, inspect what it changed, and commit those changes with their logical change.
2. Run the full check.
3. Confirm every intended change is committed and nothing unrelated is staged. Stop before syncing when the worktree is not safely clean.
4. Sync per `## Sync`: merge the base. When the merge stops on conflicts, call the Skill tool with "resolving-merge-conflicts" and state the constraints: this is a merge and stays one; stage only resolved paths; ask the user about any hunk that decides product behavior. Once it reports back, conclude the merge with `git commit --no-edit` and confirm it in `git log`.
5. When the sync changed the branch, rerun the complete verification.
6. Immediately before pushing, fetch and require `<remote>/<base>` to be an ancestor of `HEAD`. When the base moved in the meantime (`## CI gate` names the automation that moves it), repeat step 4 first.
7. `push`. Never force-push.

## 5. Verify in the browser

When the browser pass is on and the change has a user-visible surface per `browser-pass.md` `## When it applies`, call the Skill tool with "playwright-cli" and run the pass the approved plan names, exactly as `browser-pass.md` defines it, on the finalized and pushed head. The pass is done when every visible acceptance criterion of every member has a capture, the negative check passed, and every instance started for it is stopped. A change with no user-visible surface records its one-line reason instead.

A failure sends the work back to step 2. Captures from an older head are discarded, never reused.

Upload every capture to the lead ticket with the tracker's `attach` and to the forge with its `attach`, titled with the criterion it proves, and link the forge's permanent URL from the pull request and the handoff. When one side cannot attach, follow its fallback.

## 6. Create or reuse the pull request

Follow [references/open-pr.md](references/open-pr.md): write the body in the format `## Pull requests` names, call the Skill tool with "create-pr" with the handover it lists, then verify every field with `read-pr`. The create-pr skill finds an existing pull request before anything else, publishes at most once, and assigns the configured assignee or nobody.

Write the body from the final diff and the actual verification results:

- The `## Review brief` goes first, in the format the body template gives, populated from the final diff and the recorded evidence; detailed validation, captures, risks and the human procedure sit below it. At creation, CI and review may still be pending: say so.
- One related-work line per member, lead first, in the format `## Pull requests` names.
- `## Attribution` names the harness and model actually in use, never a placeholder or a copied example.
- `## Human verification` holds one concrete procedure that meets the standard in `workflow.md` `## Human verification`, derived from the final behavior and the acceptance criteria automation cannot prove. The same procedure goes into the handoff.
- With the browser pass on, `## Screenshots` links every capture by the criterion it proves, or gives the one-line reason the change has no visible surface.

Never claim that a command, surface or platform was tested when it was not, and never claim the human steps were performed.

## 7. Pass the exact-head CI gate

Apply `## CI gate`. When the diff touches none of its path filters, no checks is a pass: confirm it from the changed files and state it in the handoff instead of a CI link. In no-CI mode, say "no CI configured".

Otherwise record the pull request's head SHA and wait with `ci`. Refresh the pull request afterwards and require the successful gate checks to belong to that exact SHA. Fetch the base, record its SHA, and require it to be an ancestor of the head, so the checks cover the current base plus the change.

- Fix deterministic failures yourself: reproduce with the smallest relevant local command, commit the fix through "commit", push, and wait again for the new head. When the failing output does not show the cause, call the Skill tool with "diagnosing-bugs" before you change code.
- Report infrastructure, permission, quota or unavailable-service failures with `Status: BLOCKED`, the check URL and the exact partial state. Never ask the user to diagnose ordinary code failures.
- Require the pull request to be mergeable before the handoff. When the base advanced or the pull request conflicts, sync as in step 4 without force-pushing, rerun the verification, push, and wait for the new head's checks.

Never move a ticket to `in-review` while the current head's gate is pending, failing or stale.

Once the gate passes, stop changing code. Review comments that arrive while CI runs are normal (an automated reviewer may comment on every push): list them in the handoff's limitations with their count and where to read them, and leave every fix and reply to `address-pr-review`, which runs only when the user asks. A green gate with unaddressed review comments is a complete, expected end state for this skill.

## 8. Hand off in the tracker

Determine the agent product and the exact model from the session. Write `Unknown` when the harness does not expose one; never guess, and never interrupt the handoff over it.

Post the handoff on the lead with `comment`, following [references/handoff.md](references/handoff.md) and reusing an equivalent existing comment, and a pointer comment on each rider. Then `transition` every member from `in-progress` to `in-review`, and read both the comments and the states back.

When `## States` names tracker automation that moves tickets on pull request events, check whether it moved any member before the gate passed, and report it if so.

When a push, the pull request, a comment or a transition fails, report the exact partial state. On a retry, reuse every artifact that already exists instead of creating duplicate pull requests or comments.

## 9. Completion report

Return the commit subjects, the verification results, the browser-pass captures, the pull request URL, the tracker comment results, the final state of every member, the remaining limitations, and the review comments left for `address-pr-review`. End with `Status: READY_FOR_REVIEW`.
