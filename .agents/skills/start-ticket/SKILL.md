---
name: start-ticket
description: "Investigate an existing ticket, or the bundle it rides in, from its prepared worktree and return an implementation plan for approval: move it to in-progress as planning starts, and write no code. Use when the user says \"start ticket ACM-123\", \"work on ACM-123\", \"pick up this ticket\", or asks to pull a ticket from the tracker and plan it."
license: MIT
metadata:
  rogs-skills/contract: "1"
---

# Start a ticket

Load and investigate an existing ticket from its isolated worktree and return a plan. Stop before implementation: the user approves the plan and starts the work phase (`work-ticket`) separately. Planning changes no code and makes no commits.

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
need forge.md forge "## Forge"
need workflow.md workflow "## Features" "## Worktrees" "## Verification" "## Project rules"
need domain.md domain "## Glossary" "## ADRs" "## Consumer rules" "## Recording decisions"
on Bundles && has issue-tracker.md "## Bundles"
on "Model routing" && has issue-tracker.md "## Model routing"
on "Client notes" && has workflow.md "## Client notes"
on "Plan review" && has workflow.md "## Plan review"
on "Plan presentation" && has workflow.md "## Plan presentation"
on "Browser pass" && need browser-pass.md browser-pass "## When it applies" "## Instances" "## Procedure" "## Captures"
true'
```

When it prints nothing, read the files it checked and continue. When it prints anything, change nothing and reply with exactly:

```
rogs-skills is not configured for start-ticket in this repository.
Missing: <every line the check printed, separated by commas>
Run /setup-rogs here, then run /start-ticket again.
Status: SETUP_REQUIRED
```

When the check reports files missing here that exist in the main worktree (the first entry of `git worktree list --porcelain`), the second line says instead: "The configuration exists in <path> but not on this branch. Commit `docs/agents/` to the base branch, then merge the base into this branch." When it reports a version, the second line says: "The configuration is version <n>; this skill expects version 1.", followed by "Run /setup-rogs here to update it." for an older version or "Run `npx skills update` to update the installed skills." for a newer one.

From here on, "the tracker", "the forge" and every operation named in backticks (`load`, `list-in-flight`, ...) mean what those files define, under their operating rules. The tracker stays read-only for this whole skill, apart from the state moves in step 2 and the comments [Blocked tickets](#blocked-tickets) asks for. Any stop below that names no status of its own ends with `Status: BLOCKED` and a one-line `Reason:`.

## 1. Verify the ticket worktree

Extract the full ticket id from the request, in the format `## Tracker` gives. Ask when it is missing or ambiguous. When the request says the run is unattended, follow [Unattended runs](#unattended-runs) from here on.

Before reading the tracker:

1. Read the current branch with `git branch --show-current`.
2. Read the checkout root with `git rev-parse --show-toplevel`.
3. Confirm the checkout appears in `git worktree list --porcelain`.
4. Require the branch name and the checkout directory's basename to be the same ticket id.
5. Require that id to equal the requested ticket, or (confirmed in step 2) the lead of the bundle the requested ticket rides in.
6. Fetch, and compare the local `HEAD` with `<remote>/<branch>` (the remote from `## Forge`): fast-forward a clean checkout that is behind; ask before working from a diverged branch.

When any check fails, stop and report the expected id, the actual branch and the actual checkout path. Never create, switch or repair a worktree, and never touch the tracker from the wrong checkout. Creating worktrees is the user's job (`## Worktrees`).

Read `git status --short --branch` after the preflight. Record existing changes, but never modify, discard or include them in the investigation.

## 2. Load, cross-check and move the ticket

`resolve` and `load` the ticket with its relations and every comment. Verify that it belongs to the configured team or project; stop when it does not exist or belongs elsewhere.

When bundles are on, resolve the ticket's bundle as `## Bundles` defines and load every rider the same way. The branch must name the bundle's lead; otherwise stop and report the lead and its expected worktree. From here on, "the ticket" means every member of the bundle.

Read every declared blocker and its current state. A blocked-by relation between two members of the bundle is build order inside the plan, not a blocker. Run `list-in-flight`, and load full descriptions, relations and comments only for the tickets whose title, scope or named contracts suggest a plausible implementation conflict. Planning is not an exhaustive scan of unrelated work.

Treat another ticket as a blocker only on concrete evidence: an unresolved prerequisite, a conditional discovery gate, a superseding decision, a contradictory requirement, or an in-flight implementation conflict that makes independent work unsafe. Similar topics or shared files alone are not blockers. A blocker stays unresolved until it reaches the `done` role, unless its ticket or an explicit decision says this ticket may proceed sooner. A canceled blocker is an open question, not a satisfied prerequisite.

When the scan finds an unrecorded blocker, report the evidence in the plan; never add a relation while planning. When an unresolved blocker makes independent work unsafe, mark the ticket blocked as [Blocked tickets](#blocked-tickets) says. Ask before planning a ticket that is already `in-review`, `done`, `canceled`, or in a state `## States` does not list. Never change the assignee.

Once the checks above pass, and before the investigation, `transition` every member that is `new`, `ready` or `blocked` to `in-progress` and read the states back, so the board shows the ticket started as soon as work on it does; [Blocked tickets](#blocked-tickets) says when a blocked one comes back. When the user drops the ticket instead of approving a plan, `transition` each member this run moved back to the state it had, or, for one that was blocked, to the state its `## Blocked` comment records.

## 3. Investigate before planning

Read `AGENTS.md` (or `CLAUDE.md`), the glossary and the ADRs that touch the affected area (per `domain.md`), the rule files `## Project rules` lists for the areas the ticket touches, and the full ticket with its comments and relations. Then trace the current implementation end to end: callers, shared contracts, tests and adjacent patterns, before proposing any change. Treat a missing piece of the planned system as a finding, not an error.

When the ticket cites reference material, such as a `## <name> reference` section, open the cited files, confirm they still show what the ticket says, and carry the borrow and avoid points into the plan, on the terms `## Project rules` sets for that reference.

When client notes are on, read them as `## Client notes` describes before planning, and report anything newer than the ticket that changes or contradicts it.

When model routing is on, read each member's `## Model routing` section and resolve the bundle's model per `## Model routing` in `issue-tracker.md`. Carry the section's guardrails into the plan.

Distinguish verified facts from unresolved product behavior, and research current authoritative documentation when needed. Respect the data boundaries in `## Project rules`.

Ask the user about every material uncertainty that the code, the tests, the ticket and approved references do not resolve. Never silently choose product policy, external behavior, data semantics or compatibility requirements.

Finish the complete report described in step 4 before review, including the overview and its diagrams. Keep diagrams in the candidate plan; presentation adds no new design claims. Planning artifacts may be written only outside every checkout, in a location this planning agent allows.

## 4. Prepare the investigation report

Open the report with `## Overview`, written for a person who has not read the code:

- What changes and why, in a few plain sentences, with no paths, line numbers or function names.
- Mermaid diagrams wherever a picture explains the change faster than prose, as many as this ticket needs: none for a one-line fix, several for a change across many parts. Candidates are the behavior today next to the behavior after the change, the parts of the system the change touches and how they connect, a sequence or state change, and which plan step covers which acceptance criterion. Each diagram shows only what the plan below says. Prefer `flowchart`: the reviewer can comment on each of its boxes.
- The main risk, and the decisions the user still needs to make, or "none".

Keep diagrams local-only: no URLs, images, icons or `%%{` directives, or the presenter shows them as source text. Every claim in the overview restates a detail below it.

After the overview, report:

- The title, current state, dependencies and acceptance criteria of the lead and of every rider, naming the bundle first.
- The cross-ticket scan: the tickets inspected as possible blockers, and whether this ticket is safe to start independently.
- The current behavior and the root-cause findings, with code references.
- Remaining questions, blockers and explicitly unverified surfaces.
- An ordered implementation plan naming the affected areas, coupled contracts, tests and required verification, using the commands in `## Verification` and saying so plainly where one is `not configured`. Every acceptance criterion of every member maps to a plan step.
- The seams under test, each with one line on what it catches and what it misses. In the test-first areas `## Verification` lists, these are the agreement `tdd` works from during implementation.
- When the browser pass is on, the pass the work phase will run per `browser-pass.md`: which instance, which criteria it walks, the negative check, and which flows get a video; or the one-line reason the change has no user-visible surface.
- When model routing is on, a `Model:` line naming the model the work should run on, and whether this session runs on it.

## 5. Review the plan

When plan review is on, call the Skill tool with "review-plan" once the complete report is ready, before the user sees any of it. Hand over the report, every ticket with its acceptance criteria and the comments that change its scope, and the worktree root. Continue with the plan it hands back. Append its review section and the findings left for the user to decide unchanged. A plan handed back unreviewed still goes to the user, with its `Not reviewed:` line.

When plan review is off, mark the report `Not reviewed: plan review is off in this repository.` Presentation never implies adversarial review.

## 6. Present and hand off

When plan presentation is on, outside an unattended run, call the Skill tool with "present-plan" after step 5, handing over the complete settled report, the unchanged review section or warning, the main repository and worktree roots, the lead and riders, and `## Plan presentation` settings. A missing feature row means off. When off, return the report in the terminal as before.

For browser feedback, verify each request against the ticket, code and recorded decisions before revising the canonical report. A substantive human-requested change creates a new finished candidate: when plan review is on, call the Skill tool with "review-plan" once for that candidate, settle its findings, then call the Skill tool with "present-plan" for the same owned session. This is one round per human-requested candidate, never an automatic review retry loop. Layout-only changes preserve the plan and review result without another model review. Ask about stale or ambiguous feedback instead of applying it to a newer revision.

When presentation succeeds, return a short handoff with the ticket/bundle, current canonical source path and revision/digest, browser URL and HTML path, adversarial-review outcome, and remaining questions. Keep rejected blockers or risks available in the browser and identify any still needing a decision. Do not repeat the full report unless requested. When presentation fails, return `Not presented: <reason>` and the complete report, retaining the review table or `Not reviewed:` line.

Browser feedback, closing the review, `Send & End`, and delivery receipts do not approve a plan. Wait for explicit approval of the current canonical content in this conversation; the user still starts `work-ticket` separately. End every completed handoff with `Status: AWAITING_APPROVAL`.

Never edit application files, create commits, push, or open a pull request in this phase, even when the session can write. Wait for the user to approve the plan and explicitly start the work phase.

## Unattended runs

An unattended run is one whose request says so. The runner that sent the request approves the plan itself, with nobody reading it first, and calls the user only when this session waits on a question. In an unattended run:

- Ask every question through the harness's structured question tool (`AskUserQuestion` in Claude Code, `question` in OpenCode): a pending question is what the runner watches for. Without such a tool, ask in plain text and end the turn there, with no status line.
- Settle everything before the handoff. Every remaining question, open decision and review finding left for the user becomes a question asked that way, and its answer goes into the report. An answer that changes the plan substantively is a human-requested change: give it the single review round step 6 describes. `Status: AWAITING_APPROVAL` then means nothing is left to decide.
- Skip plan presentation even when it is on, since nobody watches the browser. Return the complete report in the terminal, with its review section or `Not reviewed:` line, marked `Not presented: unattended run.`

## Blocked tickets

A ticket is blocked while something outside this session has to happen before its work can go on: another ticket landing, a decision being made, or work in flight that would conflict. A question the user can answer here, or a problem with the run itself, does not block the ticket.

To mark the ticket blocked, `transition` every member to `blocked`, or keep the states when `## States` maps none, and post a `## Blocked` comment on the lead with `comment`, with a pointer naming the lead on each rider. The comment names each blocker with its evidence, what would clear it, and the state each member had. Then stop with `Status: BLOCKED` and a `Reason:` that names the blockers.

A member in `blocked` comes back once every blocker its `## Blocked` comment names is cleared: `transition` it to the state this run works in (`in-progress` in start-ticket and work-ticket, `in-review` in address-pr-review), and post an `## Unblocked` comment beside the `## Blocked` one that says what cleared each blocker. When a blocker is still open, refresh the `## Blocked` comment and stop as above. Ask before working on a member in `blocked` that has no `## Blocked` comment.

## Gotchas

- The tracker's own branch-name suggestion is not this workflow's branch name: the branch and the worktree directory use the lead ticket id itself, such as `ACM-27`.
