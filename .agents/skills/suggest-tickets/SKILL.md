---
name: suggest-tickets
description: "Suggest which ready tickets to start next, as a batch that can run side by side: keep the ones clear to start, rank them by what each unblocks and by priority, and drop any that would collide with work in flight or with another pick. Read only. Use when the user asks what to work on next, which tickets to start, or to suggest a number of tickets."
license: MIT
metadata:
  rogs-skills/contract: "1"
---

# Suggest tickets

Pick the next tickets to start, so that several agents can work at once without stepping on each other or on the work already in flight. This skill only reads: no tracker, forge or git writes beyond `git fetch`. The user starts the picks, each with `start-ticket`.

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
need issue-tracker.md issue-tracker "## Tracker" "## Operating rules" "## Operations" "### resolve" "### load" "### list-in-flight" "### list-ready" "## States" "## Labels and priority" "## Ticket conventions"
need forge.md forge "## Forge"
need workflow.md workflow "## Features" "## Worktrees"
on Bundles && has issue-tracker.md "## Bundles"
on "Model routing" && has issue-tracker.md "## Model routing"
true'
```

When it prints nothing, read the files it checked and continue. When it prints anything, change nothing and reply with exactly:

```
rogs-skills is not configured for suggest-tickets in this repository.
Missing: <every line the check printed, separated by commas>
Run /setup-rogs here, then run /suggest-tickets again.
Status: SETUP_REQUIRED
```

When the check reports files missing here that exist in the main worktree (the first entry of `git worktree list --porcelain`), the second line says instead: "The configuration exists in <path> but not on this branch. Commit `docs/agents/` to the base branch, then merge the base into this branch." When it reports a version, the second line says: "The configuration is version <n>; this skill expects version 1.", followed by "Run /setup-rogs here to update it." for an older version or "Run `npx skills update` to update the installed skills." for a newer one.

From here on, "the tracker", "the forge" and every operation named in backticks (`list-ready`, `load`, ...) mean what those files define, under their operating rules. The tracker stays read-only for this whole skill. Any stop below that names no status of its own ends with `Status: BLOCKED` and a one-line `Reason:`.

Ask the user through the harness's structured question tool (`AskUserQuestion` in Claude Code, `question` in OpenCode) when it has one, and again when an answer leaves the decision open. A turn that ends in plain text while the run waits for the user is a stop, even one that only answers the user's reply to an earlier question: its `Reason:` names the decision. After the report, a reply to a later message from the user ends with the status line that applies then. A runner that watches the session reads a turn with neither a pending question nor a status line as a finished run.

## 1. Read the request

The batch size is the number the request names, or 3. A constraint the request adds, such as an area, a label or a model, narrows the candidates.

## 2. Gather the candidates and the work in flight

1. `list-ready` for the candidates. Leave out the tickets `## Ticket conventions` says to ignore.
2. Fetch the remote `## Forge` names. A candidate with a worktree (`git worktree list --porcelain`), a local branch or a `<remote>/<id>` branch named after its id was started already, even before start-ticket moves it: it is work in flight, never a pick.
3. With bundles on, resolve each candidate's bundle as `## Bundles` defines. A bundle is one candidate, named by its lead, and it was started when any member was.
4. `load` each candidate, and every member of a bundle: its description, priority, labels, relations with their states, and, with model routing on, its `## Model routing` section. With more than 30 candidates, load the 30 with the highest priority, and say so in the report.
5. `list-in-flight` for the rest of the work in flight: the tickets in progress and in review.
6. For each ticket in flight, list the files its branch changes: `git diff --name-only <remote>/<base>...<remote>/<id>`, or its local branch when the remote has none. For one with no commits yet, read the areas its `## Approved implementation plan` comment names, or else its description.

## 3. Choose the batch

1. A candidate is clear to start when every one of its blockers is `done`. A canceled blocker is an open question, and a blocker still in flight is not done. A bundle's blockers are its members' blockers outside the bundle: a blocked-by relation between two members is build order, not a blocker. Only clear candidates can be picks.
2. Rank the clear ones by how many tickets wait on each, directly or through other tickets, then by priority (P0 first), then oldest first.
3. Walk the ranking and pick each candidate that collides with nothing: neither with work in flight nor with a ticket already picked. Two tickets collide when they would change the same files, the same contract (an API and its client, a schema and its migrations, shared configuration) or the same user-visible flow. Judge it from the files in flight, each candidate's description, acceptance criteria and labels, and the code they name; a shared topic alone is no collision. A collision keeps a ticket out of this batch only.
4. With model routing on, a batch takes at most one heavy ticket: one that runs on the frontier model under `## Model routing`, as a ticket without the section does, and as a bundle does unless every member names the cheaper model. Pass over the other heavy ones.
5. Stop at the batch size, or when the ranking runs out.

## 4. Report

1. Waiting on you: the tickets in review, one line each. Each keeps its files until it merges, and moves on only through a review, a human verification or a merge.
2. The picks in order, one line each: the id, the title, the priority, what it unblocks, and, with model routing on, its model.
3. Not yet: every candidate left out, one line each, with the reason, such as its open blocker, the ticket it collides with, or the batch's heavy ticket.
4. One line naming the picks in order, a bundle by its lead. With model routing on, each carries the model it runs on in parentheses: the model id alone, without the conditions a `Model:` line may add, `frontier` for a ticket without the section, and for a bundle the model `## Model routing` gives it. `Suggested: ACM-14 (frontier), ACM-21 (acme-small-2)`. Without model routing: `Suggested: ACM-14, ACM-21`. Without any pick: `Suggested: none`.

End with `Status: TICKETS_SUGGESTED`.
