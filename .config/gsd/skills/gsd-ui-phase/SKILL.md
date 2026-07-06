---
name: gsd-ui-phase
description: Creates a UI design contract ({NN}-UI-SPEC.md) for a frontend phase before planning. Triggers on "/gsd-ui-phase N", "UI phase N", "create the UI spec for phase N", "design contract for phase N", or "lock the design before planning". Spawns a UI researcher subagent that grounds the spec in the existing codebase's real components and tokens, then sanity-checks it against the phase CONTEXT decisions inline. Locks layout, components, spacing, color, typography, interaction states, and empty/loading/error states so execution never makes ad-hoc styling decisions. Sits between /gsd-discuss-phase and /gsd-plan-phase for frontend phases.
argument-hint: "<phase>"
---

Read $HOME/.config/gsd/shared/conventions.md before doing anything — it defines project-root discovery, the .planning/ tree, commit conventions, config keys, and status vocabularies.

## Purpose

A UI-SPEC is the visual source of truth for a frontend phase: the planner folds it
into tasks and the executor implements against it without design ambiguity. Ad-hoc
styling decisions made mid-execution are how design debt is born — this contract
prevents them.

## Arguments

- `<phase>` (required) — phase number (integer or decimal insertion like `2.1`).

## Step 1 — Locate phase and check inputs

1. Discover the project root per conventions. Resolve the phase from
   `.planning/ROADMAP.md`: `{N}`, `{NN}` (padded), `{slug}`, and
   `{phase_dir}` = `.planning/phases/{NN}-{slug}/` (create the directory if it
   doesn't exist yet). Unknown phase → stop, list available phases.
2. Read `{phase_dir}/{NN}-CONTEXT.md`. If absent, warn:
   "No CONTEXT.md for phase {N} — /gsd-discuss-phase {N} first is recommended so
   the spec reflects your decisions." Ask (2 options): **Run discuss first**
   (stop, point at `/gsd-discuss-phase {N}`) / **Proceed without it** (the
   researcher will lean on the codebase and sensible defaults).
3. If `{phase_dir}/{NN}-UI-SPEC.md` already exists, ask (3 options):
   - **View** — display it and exit.
   - **Redo** — regenerate from scratch (existing file passed to the researcher as
     baseline context, then overwritten).
   - **Keep** — exit; the current spec stands.

## Step 2 — Spawn the UI researcher

Identify inputs before spawning (paths only, never contents):

- `{phase_dir}/{NN}-CONTEXT.md` (if it exists — locked user decisions)
- `.planning/ROADMAP.md` plus the phase number (researcher reads its own section)
- `.planning/REQUIREMENTS.md`
- Existing frontend code directories — detect what's real here: component dirs
  (`src/components`, `app/`, `components/`…), style entry points (global CSS,
  `tailwind.config.*`, theme files), design-system files (`components.json`,
  token files), and the package manifest.
- `.planning/codebase/CONVENTIONS.md` and `STRUCTURE.md` if a codebase map exists.

Spawn ONE subagent whose prompt starts with:

> Read $HOME/.claude/skills/gsd-ui-phase/references/ui-researcher-prompt.md and
> follow it.

then lists: phase number and name, every input path above, the template path
`$HOME/.config/gsd/shared/templates/ui-spec.md`, and the required output path
`{phase_dir}/{NN}-UI-SPEC.md`. The researcher writes the spec directly to disk and
returns a short confirmation. Wait for it — don't poll, don't do parallel work on
the same files.

## Step 3 — Sanity-check and one revision pass

Read the written spec and check it yourself, inline — there is no checker agent:

1. **CONTEXT compliance** — every locked decision in CONTEXT.md is respected;
   nothing in the spec contradicts or silently re-decides one.
2. **Concreteness** — spacing in px/rem, colors as hex/oklch tokens, named font
   stacks with sizes/weights/line-heights. No "appropriate spacing" vibes.
3. **State coverage** — every interactive element in the component inventory
   declares default/hover/focus/disabled; every data surface declares
   empty/loading/error.
4. **Completeness** — all template sections filled or explicitly marked not
   applicable; existing components reused rather than reinvented.

Fix trivial mechanical gaps yourself by editing the spec. Then present a summary
to the user: layout in one line, component inventory (existing vs new), the token
tables (spacing/color/type), and anything you flagged. Ask (2 options):

- **Approve** — continue to commit.
- **Request changes** — collect all edits, apply them inline by editing the spec
  yourself (ONE revision pass — do not re-spawn the researcher), re-present,
  then commit. Further changes after that are the user's to make by hand or by
  re-running `/gsd-ui-phase {N}`.

## Step 4 — Commit

Per conventions (honor `planning.commit_docs`):

```bash
git add .planning/phases/{NN}-{slug}/{NN}-UI-SPEC.md
git commit -m "docs({NN}): create UI design contract"
```

## Next up

- `/gsd-plan-phase {N}` — the planner reads UI-SPEC.md automatically and bakes the
  contract into tasks.
- If you skipped discussion: `/gsd-discuss-phase {N}` still works before planning.

Suggestions, not gates — the user decides.
