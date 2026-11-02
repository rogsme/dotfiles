---
name: create-ticket
description: "Audit the code and the tracker, then draft and create independent, worktree-safe tickets with real blocking relations, only after the user approves a preview. Use when the user asks to create a ticket, add something to the backlog, file a bug, draft tickets, turn a plan, spec or conversation into tickets, or check whether requested work is already done or tracked."
license: MIT
metadata:
  rogs-skills/contract: "1"
---

# Create tickets

Prepare accurate, independently implementable tickets from verified product and code context. Drafting is read-only; the tracker changes only after the user explicitly approves the preview, and every created ticket is read back before the work counts as done.

## 0. Configuration preflight

Read only, before any git, tracker or forge action. Run this check; it prints one line per problem, and nothing when the configuration is complete:

```sh
sh -c '
cd "$(git rev-parse --show-toplevel)" || exit 1
need() { f="docs/agents/${1}"; id="${2}"; shift 2
  [ -f "$f" ] || { echo "$f: file missing"; return; }
  case "$(head -n 1 "$f")" in
    "<!-- rogs-skills config v1: $id -->") ;;
    *"rogs-skills config v"*) echo "$f: version: $(head -n 1 "$f")" ;;
    *) echo "$f: marker missing" ;;
  esac
  grep -qF "{{FILL:" "$f" && echo "$f: unfilled {{FILL: text"
  for h in "$@"; do grep -qxF -- "$h" "$f" || echo "$f: $h"; done; }
has() { f="docs/agents/${1}"; shift; [ -f "$f" ] || return 0
  for h in "$@"; do grep -qxF -- "$h" "$f" || echo "$f: $h"; done; }
on() { grep -qiE "^[|] *${1} *[|] *on *[|]" docs/agents/workflow.md 2>/dev/null; }
need issue-tracker.md issue-tracker "## Tracker" "## Operating rules" "## Operations" "### resolve" "### load" "### search" "### metadata" "### create" "### update" "### relate" "### comment" "## States" "## Labels and priority" "## Ticket conventions"
need workflow.md workflow "## Features" "## Project rules"
need domain.md domain "## Glossary" "## ADRs" "## Consumer rules" "## Recording decisions"
on Bundles && has issue-tracker.md "## Bundles"
on "Model routing" && has issue-tracker.md "## Model routing"
on "Client notes" && has workflow.md "## Client notes"
true'
```

When it prints nothing, read the files it checked and continue. When it prints anything, change nothing and reply with exactly:

```
rogs-skills is not configured for create-ticket in this repository.
Missing: <every line the check printed, separated by commas>
Run /setup-rogs here, then run /create-ticket again.
Status: SETUP_REQUIRED
```

When the check reports files missing here that exist in the main worktree (the first entry of `git worktree list --porcelain`), the second line says instead: "The configuration exists in <path> but not on this branch. Commit `docs/agents/` to the base branch, then merge the base into this branch." When it reports a version, the second line says: "The configuration is version <n>; this skill expects version 1.", followed by "Run /setup-rogs here to update it." for an older version or "Run `npx skills update` to update the installed skills." for a newer one.

From here on, "the tracker" and every operation named in backticks (`search`, `create`, `relate`, ...) mean what `issue-tracker.md` defines, under its `## Operating rules`. When an operation says `Capability: Unsupported`, follow its fallback or the gap the file describes; stop with `Status: BLOCKED` and a `Reason:` line when no way forward exists. Any other stop below that names no status of its own ends with `Status: BLOCKED` and a one-line `Reason:`.

## 1. Classify the request

Treat the request as one of: audit only; draft or prepare tickets; create confirmed tickets; update existing tickets.

Wording such as "don't create yet", "prepare" or "draft" is strictly read-only. Create only after explicit wording such as "create these tickets" or "add them to the backlog", and only after resolving assignment per `## Ticket conventions`.

## 2. Audit the implementation before drafting

Read the glossary and the ADRs for the area (per `domain.md`), and the rule files `## Project rules` lists for it. Inspect the relevant code and tests before claiming anything about what exists. Trace the actual behavior end to end and classify each requested capability as done, partial or not done.

- Never create a ticket for completed functionality; create one for the remaining gap when functionality is partial.
- Distinguish production behavior from scaffolding, documentation, test fixtures or incidental behavior. A decision recorded in an ADR is an intention, not a shipped feature.
- For bugs, find the shared root cause before splitting symptoms into separate tickets.
- Cite concrete code or test evidence in the audit when it helps.

Keep a cross-stack outcome (a client consuming a server's API shape, a schema change with its migration and tests, a data contract and its consumer) in one ticket when splitting it would leave either worktree incomplete. Such a ticket carries the labels of the side with more work and its own section of acceptance criteria for the other side.

When bundles are on and the outcome already exists as separate tickets, propose a bundle instead of rewriting them (`## Bundles`): the relations and matching `Delivers with:` lines go on every member after the user confirms the set.

When client notes are on, read the notes on the topic per `## Client notes` before drafting, and report anything newer than the request that changes it.

## 3. Search for duplicates

Run `search` across open, closed and archived tickets with title terms, area terms and likely synonyms, following every page. Report each likely duplicate and ask whether to reuse it, update it or go ahead. Never silently create a duplicate, and never modify an existing ticket without the user's go-ahead. Skip the tickets `## Ticket conventions` says to ignore.

## 4. Verify tracker metadata

Resolve the team or project, the ticket key, the states mapped to `new` and `blocked`, active members, labels and projects live with `metadata`. Stop and ask when the key or another value in `## Tracker` changed in a way that affects the request.

## 5. Choose ticket boundaries

Create the smallest coherent vertical tickets that can each run in an independent worktree. Slice them as [references/slicing.md](references/slicing.md) describes: tracer bullets through every layer, blocking edges, and expand-contract sequencing for wide refactors.

- Include all coupled client, server, schema and test work needed for one outcome.
- Avoid hidden dependencies and speculative follow-up scaffolding.
- Use a discovery ticket when platform behavior or product policy has to be established first, and mark the implementation tickets that depend on it as conditional.
- Name genuine prerequisites in the description, then add real blocked-by relations once ids exist.
- Keep coordination notes separate from functional dependencies.
- Apply the splitting rules in `## Ticket conventions`.

## 6. Assign priority and labels

Map planning priority (P0 to P3) through `## Labels and priority` and follow its guidance on what each level means. Apply every label group the section requires, and the matching project. Ask before creating a label the project does not have.

## 7. Draft the tickets

Title each ticket per `## Ticket conventions`, never with an id: the tracker assigns it. Write the body from [references/ticket-body.md](references/ticket-body.md) unless the user asks for implementation-ready detail. Add the extra body lines the conventions require.

- When the work borrows from a reference implementation that `## Project rules` lists, add a `## <name> reference` section before `## Dependencies`, citing exact files and lines at the pinned version, split into what to borrow and what to avoid. Verify every citation in the source before the preview.
- When model routing is on, propose a `## Model routing` section per the criteria in `## Model routing`, and say why.
- When bundles are on and the ticket rides in a bundle, add its `Delivers with:` line.

## 8. Preview and gate creation

Present the breakdown as a numbered list. For each ticket show the title, priority, labels, project, assignee or `Unassigned`, the tickets that block it, the state it starts in, what it delivers, whether it is conditional, and its model routing when that is on. Never invent ids.

Ask whether the granularity is right, whether each blocking edge is real, and whether any ticket should merge or split. Iterate until the user approves. While waiting, end with `Status: AWAITING_CREATE_APPROVAL`.

Before the first tracker write, confirm all of these:

- The user explicitly authorized creation.
- The team or project still resolves with the expected key.
- Each ticket starts in the state mapped to `new`, or in the one mapped to `blocked` when `## States` maps one and a ticket outside its bundle that blocks it is not `done`, unless the user chose another.
- Assignment follows `## Ticket conventions` and is checked against active members.
- The duplicate search is complete.
- Labels, project, priorities, descriptions and dependencies are resolved.

Ask instead of creating a partial batch when anything is unresolved.

## 9. Create and link

1. Create the tickets with `create`, blockers first, in the configured team or project, each in the state the preview shows.
2. Apply the assignee (or none), priority, labels and project.
3. Record every returned id and URL.
4. After the ids exist, add the blocked-by relations with `relate`, then the bundle relations and `Delivers with:` lines.
5. On each ticket created in `blocked`, post a `## Blocked` comment with `comment`: each open blocker, what would clear it, and the state mapped to `new` as the state it had: the merge that clears its last blocker moves it there.
6. Keep the dependency prose in descriptions, but never as a substitute for relations the tracker supports.
7. When the source was an existing ticket, attach each new ticket to it as a child where the tracker supports that. Never close or modify the parent.

Perform no other mutation.

## 10. Verify after creation

Read every created ticket back with `load` rather than trusting the write responses.

- The created count matches the approved preview.
- Every id matches the format in `## Tracker`.
- State, priority, labels, project and assignee are what the preview promised.
- Every blocked-by and bundle relation exists on the ticket that should carry it.
- Every ticket created in `blocked` carries its `## Blocked` comment.

Report the ids and URLs concisely. The work is complete only when this verification passes; then end with `Status: TICKETS_CREATED`.

## Gotchas

- Team membership changes; resolve assignees live every time.
- Archived tickets still count in the duplicate search.
- A documented intention or a test fixture is not proof that a feature shipped.
- A conditional ticket must not start before its discovery prerequisite resolves.
- Read the `update` and `create` notes on label writes: some trackers replace the whole label set, so an update sends the complete intended set.
