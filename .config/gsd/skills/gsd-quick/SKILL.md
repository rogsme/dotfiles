---
name: gsd-quick
description: Runs a small out-of-band task through a lightweight plan-then-execute loop with fresh-context subagents. Use when the user says "gsd quick", "quick task", or asks for a self-contained change that's too big for an inline fix but doesn't deserve a roadmap phase — a small feature, a contained refactor, a multi-file fix. Creates .planning/quick/{seq}-{slug}/ with a single PLAN.md (max 3 tasks) and SUMMARY.md. Trivial one-liners get redirected to /gsd-fast; anything needing research or verification should become a phase via /gsd-phase add.
argument-hint: <task description>
---

Read $HOME/.config/gsd/shared/conventions.md before doing anything — it defines project-root discovery, the .planning/ tree, commit conventions, config keys, and status vocabularies.

# GSD Quick

A middle path between `/gsd-fast` (inline, no docs) and a full phase (context,
research, verification). One planner subagent, one executor subagent, one plan of
at most 3 tasks, artifacts in `.planning/quick/`.

Deliberately dropped from upstream: flag matrix (--full/--validate/--discuss/
--research), checker and verifier passes. Rationale: if a task needs research and
verification, it deserves a phase — `/gsd-phase add "{description}"`.

## 1. Parse and gate

The arguments are the task description. If empty, ask for one sentence describing
the task. Locate the project root (conventions §1) — quick tasks require an
existing GSD project.

**Reverse triviality check:** if the task is trivial (≤3 file edits, about a
minute of work, no multi-step coordination), redirect and stop:

```
This is small enough to do inline. Use /gsd-fast instead:
  /gsd-fast "{task description}"
```

## 2. Create the quick task directory

- Determine `{seq}`: scan `.planning/quick/` for existing `{seq}-{slug}/` dirs and
  take the highest integer + 1 (start at 1; match the zero-padding style already
  in use, if any).
- Derive `{slug}`: kebab-case from the task description, short.
- Create `.planning/quick/{seq}-{slug}/`.

## 3. Plan — spawn the planner subagent in QUICK MODE

Spawn a fresh-context planner subagent (conventions §9 — pass paths, not
contents) with this prompt:

```
Read $HOME/.claude/skills/gsd-plan-phase/references/planner-prompt.md and follow
it in QUICK MODE: produce a SINGLE plan with AT MOST 3 tasks. Context is limited
to .planning/STATE.md and .planning/PROJECT.md — do not read phase directories
or do research.

Task: {task description}
Write the plan to: {project root}/.planning/quick/{seq}-{slug}/PLAN.md
Return a one-line confirmation when the file is written.
```

Wait for it to finish. Confirm PLAN.md exists on disk; if not, surface the
subagent's response and stop. Show the user the plan's task list in 3 lines or
fewer before executing (if config `mode` is `interactive`, ask to proceed;
`yolo` proceeds without asking).

## 4. Execute — spawn the executor subagent

Spawn a fresh-context executor subagent:

```
Read $HOME/.claude/skills/gsd-execute-phase/references/executor-prompt.md and
follow it.

Plan to execute: {project root}/.planning/quick/{seq}-{slug}/PLAN.md
This is a QUICK task, not a phase: commit with `{type}: description` (no phase
scope). Write the summary to:
{project root}/.planning/quick/{seq}-{slug}/SUMMARY.md
Return a one-line confirmation when done.
```

Wait for completion. Confirm SUMMARY.md exists. If the executor reports failure
or deviations, relay them to the user before continuing.

## 5. Update STATE and commit docs

1. If `.planning/STATE.md` has a "Quick Tasks Completed" table, append a row
   (conventions §6 schema):

   ```
   | {seq} | {task description} | {YYYY-MM-DD} | {last code commit short hash} | quick/{seq}-{slug}/ |
   ```

   Create the table if STATE.md exists without it.
2. Commit the planning docs — unless config `planning.commit_docs` is false:

   ```bash
   git add .planning/quick/{seq}-{slug}/ .planning/STATE.md
   git commit -m "docs: complete quick task {seq} — {slug}"
   ```

## 6. Report

```
Quick task {seq} complete: {task description}
  Plan:    .planning/quick/{seq}-{slug}/PLAN.md
  Summary: .planning/quick/{seq}-{slug}/SUMMARY.md
  Commits: {code commit hashes from the executor}
```

No pipeline "Next up" — quick tasks are out-of-band. If the executor's summary
notes leftover work that outgrew the task, suggest `/gsd-phase add` for it.

## Guardrails

- One plan, ≤3 tasks — if the planner can't fit the task in 3 tasks, stop and
  suggest `/gsd-phase add "{description}"` instead
- No research, no checker, no verifier passes — that's what phases are for
- Subagents write their own artifacts and return confirmations, never bodies
- Trivial task → `/gsd-fast`, never burn two subagents on a typo
