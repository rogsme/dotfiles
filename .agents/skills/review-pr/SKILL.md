---
name: review-pr
description: "Independently review one pull request at its exact head against its tickets and the repository's contracts, then post evidence-backed findings and a verdict. Never edits code or writes to the tracker. Use from a fresh session when the user says \"review the current PR\", \"review PR 12\" or \"re-review the PR\", or asks for review comments another agent will address; drafts only when the user asks not to post."
license: MIT
metadata:
  rogs-skills/contract: "1"
  opencode/slash: "true"
---

# Review a pull request independently

Review one exact head of a pull request against its tickets and the repository's contracts. A normal run posts validated findings and one summary pinned to that head, in a single invocation. Never edit the branch, and keep the tracker read-only throughout.

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
need forge.md forge "## Forge" "## Operations" "### find-pr" "### read-pr" "### ci" "### feedback" "### post-review" "### reply" "### resolve-thread" "### comment" "## CI gate" "## Pull requests" "## Identity limits"
need workflow.md workflow "## Features" "## Project rules" "## Review" "## Human verification"
need domain.md domain "## Glossary" "## ADRs" "## Consumer rules" "## Recording decisions"
on Bundles && has issue-tracker.md "## Bundles"
on "Browser pass" && need browser-pass.md browser-pass "## When it applies" "## Instances" "## Procedure" "## Captures"
grep -qF "docs/agents/pull-request.md" docs/agents/forge.md 2>/dev/null && need pull-request.md pull-request "## Review brief"
true'
```

When it prints nothing, read the files it checked and continue. When it prints anything, change nothing and reply with exactly:

```
rogs-skills is not configured for review-pr in this repository.
Missing: <every line the check printed, separated by commas>
Run /setup-rogs here, then run /review-pr again.
Status: SETUP_REQUIRED
```

When the check reports files missing here that exist in the main worktree (the first entry of `git worktree list --porcelain`), the second line says instead: "The configuration exists in <path> but not on this branch. Commit `docs/agents/` to the base branch, then merge the base into this branch." When it reports a version, the second line says: "The configuration is version <n>; this skill expects version 1.", followed by "Run /setup-rogs here to update it." for an older version or "Run `npx skills update` to update the installed skills." for a newer one.

From here on, "the tracker", "the forge" and every operation named in backticks (`feedback`, `post-review`, ...) mean what those files define, under their operating rules. Any stop below that names no status of its own ends with `Status: BLOCKED` and a one-line `Reason:`.

## 1. Verify independence and resolve the pull request

1. Require a session that did not implement or fix this change: a fresh local session or an automated reviewer both qualify. When the current context shows this session wrote the change, stop and ask for a separate session.
2. Resolve the pull request: an explicitly given number with `read-pr`, or the open pull request for the current branch with `find-pr`, verifying that its head is the current branch.
3. Verify that its base is the base branch `## Forge` names.
4. Read its metadata, body, commits, exact head SHA, checks, every feedback channel with `feedback`, and the changed files.
5. Fetch the base, record its SHA, and require it to be an ancestor of the head. That proves the reviewed head contains the current base, rather than relying on a stale branch that merely does not conflict.
6. Wait for the forge to compute mergeability, then require a mergeable pull request and a passing gate for the exact head per `## CI gate`. When the diff touches none of the path filters, no checks is legitimate: confirm it from the changed files and note it in the summary. An unknown mergeability is not proof of a conflict. When checks are stale, pending or failing, or the branch conflicts with the base, post nothing and end with `Status: BLOCKED_FOR_SYNC`.

Never treat a green check from an older commit as evidence for the current head.

## 2. Load the requirements

Derive the pull request's tickets: the lead is the head branch when it matches the id format in `## Tracker`, otherwise the first id in the title. When bundles are on, the riders are the other ids in the title and the related-work lines, checked against the bundle the tracker records (`## Bundles`). Stop when they disagree or no id exists; never fuzzy-match the title.

`load` every member in full: relations, blocker states and every comment. Verify the team or project, and expect every member in `in-review`. Build one requirements ledger, grouped by ticket, from:

- The acceptance criteria and scope in each description.
- The `## Approved implementation plan` comment.
- Explicit decisions and clarifications, later authoritative ones superseding older ones.
- Dependency states.
- Pull request and handoff claims, treated as evidence rather than requirements.
- The human verification procedures, treated as instructions to validate against the actual routes, controls, setup and changed behavior.

Treat unclear or conflicting comments as questions.

## 3. Review the complete change

Read `AGENTS.md` (or `CLAUDE.md`), the glossary and the relevant ADRs (per `domain.md`), the rule files `## Project rules` lists for the touched areas, `## Review`, and the complete `<base>...HEAD` diff. Inspect surrounding implementations and shared callers rather than isolated hunks. Apply [references/standards.md](references/standards.md) throughout.

Prioritize:

- Unmet acceptance criteria, and contradictions with confirmed decisions or ADRs.
- Correctness bugs and behavioral regressions.
- Authentication, authorization, tenant isolation, exposure or deletion of data, secrets, injection and XSS.
- The invariants `## Review` lists.
- Data loss, ordering, idempotency and concurrency.
- Violations of coupled contracts, such as a client typed against an API shape or a data contract and its consumer.
- Migration, dependency, build and compatibility failures.
- Missing tests for a credible failure mode the change introduces.
- Claims the change makes about itself (docstrings, contract tables, READMEs, the pull request body), checked against every surface they cover. A claim the code does not honor is a defect even when the code is otherwise sound.
- An inconsistency that is logged and then written anyway, and tests that pin a known gap as expected behavior.
- Gates and guards, judged against the surfaces the contract and the tickets' successors name, not only what exists at this head.
- Boundaries between eventually consistent systems, and whether the contract states what a client sees inside the window.

Reuse the exact-head CI as the deterministic baseline, and never rerun the full check during review. Run only the smallest focused command that reproduces or disproves a suspected defect, against the installed, locked dependencies (`## Review` says how): confirm a suspected library behavior with the pinned version, not its documentation.

Check existing feedback before drafting so the review does not repeat active points. Evaluate every acceptance criterion of every member against the implementation and the acceptance-evidence table. A diff that serves none of the tickets is a question. With the browser pass on and a user-visible change, open the captures the pull request links and require one per visible criterion, taken on the reviewed head; a missing or mismatched capture is a test gap. Missing evidence is a question or a test gap; missing required behavior is a finding.

Validate the human verification procedure against `workflow.md` `## Human verification`, without performing the user's final QA. It must use exact setup, environment, URLs or commands, navigation, controls, test data, actions and observable expected results; cover every criterion that still needs a person, with a negative or regression check; match the final implementation without repeating what CI proves; state cleanup and genuinely untestable surfaces; and offer a non-UI alternative only when the change truly has no visible behavior. A missing, generic, stale or impossible procedure is a handoff gap and prevents a `READY_FOR_HUMAN` verdict.

Validate the pull request's `## Review brief` against the reviewed diff, the exact-head evidence and the current gates. Treat it as the author's claims, not proof. Missing or misleading evidence and next actions are handoff gaps; wording preferences are not findings. An older pull request without a brief still gets one in the review summary, without a formatting finding.

Never report style preferences, formatter output, naming preferences, speculative architecture, unrelated refactors, generic test requests or low-value nits as defects.

## 4. Validate findings

Classify each candidate:

- `BLOCKING`: the pull request must not merge, because it violates requirements or creates a serious correctness, security, privacy or data-loss risk.
- `BUG`: a concrete behavioral defect with meaningful impact.
- `TEST GAP`: a credible failure mode on a changed path lacks a regression check.
- `HANDOFF GAP`: the human verification procedure or the review brief is missing, inaccurate, generic, or cannot verify the claimed behavior.
- `QUESTION`: the evidence is insufficient or the product intent is unresolved; never present it as a defect.
- `NIT`: a one-line note worth making; it never changes the verdict.

Every posted finding includes its class; the exact changed file and line when an inline anchor exists; the affected acceptance criterion, rule or invariant; the concrete code path, input or sequence that fails; the user-visible or operational impact; the reproduction, code proof or a specific failing-test expectation; and the smallest correction, written so it can be applied verbatim. One defect is one finding, listing every sibling file where it appears.

Before posting, try to refute each candidate: find the guard, test, caller or loader that makes it impossible, and drop what does not survive. Say in each finding whether it was reproduced or traced. Use no numerical confidence scores; when the evidence cannot support `BLOCKING`, `BUG`, `TEST GAP` or `HANDOFF GAP`, make it a `QUESTION` or drop it.

## 5. Draft-only mode

Use this mode only when the user explicitly asks for a draft, a preview or an analysis, or says not to post. Return the findings first, ordered by severity, then the reviewed head and base SHAs, the requirements checked, the focused verification, and the residual manual gaps. Make no forge or tracker writes, and end with `Status: AWAITING_POST_APPROVAL`.

## 6. Post the review

For a normal review request, posting is authorized by the request itself; do not ask for a second confirmation.

Before posting, refresh the head, the diff, the checks, mergeability and the feedback, and re-read every ticket with its comments. Fetch the base again: when its SHA changed, or it is no longer an ancestor of the unchanged head, post nothing and end with `Status: BLOCKED_FOR_SYNC`. Revalidate each finding and drop stale or duplicate ones.

Post one review with `post-review`, each finding anchored to its exact changed line in the new file version. A finding that cannot be anchored goes into the summary as `path:line`. Write the summary as [references/summary.md](references/summary.md) describes: a freshly derived `## Review brief`, then the lines naming the exact reviewed head SHA, the included base SHA, every ticket reviewed against, and the verdict.

- With actionable findings, summarize their classes; the summary carries `Verdict: CHANGES_REQUESTED`.
- Without them, the summary carries `Verdict: READY_FOR_HUMAN`, lists only genuinely manual checks or residual uncertainty, and reproduces the final numbered human verification procedure, so it is the user's current QA packet.

Questions never masquerade as blocking findings. `## Identity limits` applies: the verdict is workflow evidence, not an approval on the forge.

Return links to every posted comment, and end with `Status: REVIEW_POSTED` when changes were requested or `Status: READY_FOR_HUMAN` otherwise.

## 7. Re-review fixes

On a re-review, load every earlier actionable thread and the fixer's replies. For each thread:

1. Verify that the commit the reply claims is in the current head.
2. Recheck the original failure path and its regression evidence.
3. Check every sibling path the fix reaches for the same defect shape. Verifying the reported line alone is not a re-review.
4. `resolve-thread` only when the original finding is fixed or conclusively disproved, and never a thread a human opened or rejected with evidence. When the forge cannot resolve threads, list the ones to resolve by hand.
5. `reply` on each thread that stays open, with the remaining evidence, concisely.

A finding the fixer rejected by citing a decision record (an ADR or a contract) is settled, unless new evidence shows the record does not apply; cite the record instead of reopening the same edge case.

Post a new summary for the current head and its included base. Use `Verdict: READY_FOR_HUMAN` only when no actionable thread and no new finding remains, and refresh the brief and the human verification procedure in that summary.

## Gotchas

- No single listing shows every channel: `feedback` defines how to collect inline threads, review bodies and conversation comments together.
- Local line numbers are not diff positions; anchor to the new file version as `post-review` describes.
- Review is read-only: never fix code, commit, push, merge, or write to the tracker.
