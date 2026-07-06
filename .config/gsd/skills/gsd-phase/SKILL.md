---
name: gsd-phase
description: Roadmap CRUD — add, insert, remove, or edit phases in ROADMAP.md directly. Use when the user says "gsd phase", "add a phase", "insert an urgent phase after N", "remove phase N", "edit phase N", or wants to reshape the roadmap without replanning. add appends an integer phase to the end of the current milestone; insert creates a decimal phase (N.1, N.2) marked (INSERTED) for urgent mid-milestone work; remove deletes an unexecuted phase; edit changes a phase's goal, requirements, or success criteria in place. Existing phases are never renumbered.
argument-hint: add "<description>" | insert after <N> "<description>" | remove <N> | edit <N>
---

Read $HOME/.config/gsd/shared/conventions.md before doing anything — it defines project-root discovery, the .planning/ tree, commit conventions, config keys, and status vocabularies.

# GSD Phase

Direct edits to ROADMAP.md — no subagents, no planning. Locate the project root
(conventions §1); require `.planning/ROADMAP.md` (if missing, stop and suggest
`/gsd-new-project` or `/gsd-milestone new`).

Parse the first argument as the operation: `add` | `insert` | `remove` | `edit`.
No/unrecognized operation → show usage from the argument hint and stop.

Iron rule for every operation (conventions §3): **existing phases are NEVER
renumbered.** Numbers are stable identifiers — commit scopes, directory names,
and depends_on references all point at them.

## add — append an integer phase to the current milestone

`/gsd-phase add "description"`

1. Find the highest existing integer phase number in ROADMAP.md; new phase
   N = max + 1. Derive a kebab-case slug from the description.
2. Build the phase entry. Match the structure of existing entries in this
   ROADMAP.md. Populate:
   - **Goal** — one outcome-shaped sentence (what will be true when done, not a
     task list). Derive it from the description; if the description is purely
     activity-shaped ("refactor auth"), ask the user what outcome it serves.
   - **Requirements** — check REQUIREMENTS.md for existing REQ-IDs this phase
     delivers and map them. If none fit, ask whether to create new REQ-IDs
     (continue the existing ID sequence, append to REQUIREMENTS.md) or leave
     the phase requirement-free.
   - **Success Criteria** — 2-5 observable, checkable statements. Derive from
     the goal; confirm with the user if you had to invent substance.
   - **Depends on** — previous phase by default; ask if unclear.
3. Append the entry at the end of the current milestone's phase list, and add
   the phase to any progress/checkbox index the ROADMAP keeps.
4. Do NOT create the phase directory — `/gsd-discuss-phase` / `/gsd-plan-phase`
   do that when real artifacts appear.

## insert — decimal phase for urgent mid-milestone work

`/gsd-phase insert after <N> "description"`

1. Validate phase N exists in ROADMAP.md (must be an integer phase). Determine
   the decimal: N.1, or N.2 if N.1 exists, and so on.
2. Build the entry exactly as in **add** (goal, requirements, success criteria),
   but title it `Phase {N.M}: {Name} (INSERTED)` — the marker signals urgent,
   unplanned-at-roadmap-time work.
3. Place it numerically: after phase N (and after any existing N.x), before
   phase N+1. Never touch neighboring phases' content or numbers.
4. Point out dependency implications: if phase N+1 depends on N, ask whether it
   should now also depend on N.M.

Don't insert before phase 1 (0.1 makes no sense) — that's an **add** at the
milestone start gone wrong; discuss with the user instead.

## remove — delete an unexecuted phase

`/gsd-phase remove <N>` (N may be decimal)

1. Validate the phase exists. Then check `.planning/phases/{NN}-{slug}/` for
   `*-SUMMARY.md` files. **Any SUMMARY present → refuse:** executed phases
   cannot be removed; their commits and artifacts are history. Suggest editing
   the phase or completing it instead.
2. Confirm with the user before deleting — show the phase name, goal, and what
   will be removed.
3. Delete the phase's ROADMAP.md entry (and its row/checkbox in any index).
   Delete the phase directory only if it contains no artifacts beyond what you
   verified (CONTEXT.md alone may be deleted with the phase; mention it).
4. Leave all other phase numbers exactly as they are — a gap in the sequence is
   correct and expected. The git commit is the historical record of removal.
5. If other phases' `depends_on` reference the removed phase, list them and fix
   with the user (usually re-pointing to the removed phase's own dependency).

## edit — change a phase's fields in place

`/gsd-phase edit <N>`

1. Validate the phase exists. Show its current values:

   ```
   Phase {N}: {name}
     Goal:             {goal}
     Requirements:     {REQ-IDs or (none)}
     Success Criteria: {numbered list}
     Depends on:       {list or (none)}
   ```

2. Ask what to change (freeform — the user may have said it in the invocation
   already). Apply the requested changes to the entry text only; number,
   position, and any (INSERTED) marker are preserved exactly.
3. Warn before editing a phase that already has SUMMARYs (executed) or plans on
   disk — changing the goal may invalidate them; proceed only on confirmation.
4. Sanity-check after applying:
   - Every phase referenced in this phase's `depends_on` still exists and isn't
     the phase itself.
   - Any REQ-IDs referenced still exist in REQUIREMENTS.md.
   - If other phases depend on this one and its goal changed materially, flag
     them for the user.
5. Show a compact before/after diff of the changed lines and confirm before
   writing.

## All operations — finish up

1. **Update STATE.md totals:** phase counts and progress counters that the
   operation changed (add/insert increment totals; remove decrements). Note the
   change in one line under Accumulated Context (e.g. "Phase 3.1 inserted:
   fix auth bypass").
2. **Commit** (unless config `planning.commit_docs` is false), staging only the
   files touched:

   ```bash
   git add .planning/ROADMAP.md .planning/STATE.md {and REQUIREMENTS.md / removed dir if touched}
   git commit -m "docs: {add|insert|remove|edit} phase {N} — {name}"
   ```

3. Report what changed and suggest the natural next step — typically
   `/gsd-discuss-phase {N}` for a new phase, `/gsd-progress` after a remove or
   edit. Suggestions, not gates.
