---
name: gsd-milestone
description: Closes out or starts a milestone. Use "gsd-milestone complete" when all roadmap phases are done and the user says "complete the milestone", "ship v1", "wrap up this milestone" — it verifies readiness, writes a MILESTONES.md entry with stats and lessons, archives the roadmap to .planning/milestones/, trims ROADMAP.md, updates PROJECT.md/STATE.md, and optionally tags. Use "gsd-milestone new" when starting the next cycle — "start the next milestone", "plan v1.1" — it gathers goals, bumps the version, appends requirements with continuing REQ-IDs, and extends the roadmap with phases that continue the existing numbering.
argument-hint: complete | new
---

Read $HOME/.config/gsd/shared/conventions.md before doing anything — it defines project-root discovery, the .planning/ tree, commit conventions, config keys, and status vocabularies.

# GSD Milestone

Two operations, one boundary: `complete` closes the current milestone,
`new` opens the next. Locate the project root first (conventions §1). Parse the
argument as the operation; missing/unrecognized → show usage and stop.

Deliberately dropped from upstream: seeds scan, todo linking, branch cleanup
ceremony, separate retrospective file, audit-milestone, milestone-summary.

---

## complete

### 1. Verify readiness

Check disk truth for every phase in the current ROADMAP.md:

- Every PLAN.md has a matching SUMMARY.md
- VERIFICATION.md exists with `status: passed`
- Open items: UAT files with status ≠ complete, VERIFICATIONs with gaps_found or
  human_needed, SECURITY.md with threats_open > 0

If anything is incomplete, list it concretely:

```
Not all work is closed out:
- Phase 4: 1 plan without a summary
- Phase 2: UAT status partial (3 pending)
```

Ask whether to proceed anyway or stop. If proceeding, record the gaps in the
MILESTONES.md entry under `### Known Gaps`. If everything is clean, show the
phase list and confirm: "Ready to mark v{X.Y} as shipped?" (skip the
confirmation when config `mode` is `yolo`).

### 2. Gather stats and accomplishments

- Phases and plans: counted from `.planning/phases/`.
- Commits and dates: `git log --oneline` count and first→last commit dates over
  the milestone's range (from the previous milestone's completion — check
  MILESTONES.md / the previous tag — to HEAD).
- One accomplishment line per phase, taken from its SUMMARY one-liners.

### 3. Write the MILESTONES.md entry

Append to `.planning/MILESTONES.md` (create with a `# Milestones` header if
missing):

```markdown
## v{X.Y} — {Name} (shipped {YYYY-MM-DD})

**Stats:** {P} phases, {N} plans, {C} commits, {D1} → {D2}

**Accomplishments:**
- Phase 1: {one-liner}
- Phase 2: {one-liner}
...

**Lessons:**
- {lesson 1}
- {lesson 2}

### Known Gaps   {only if completing with open items}
- {gap with phase/REQ reference}
```

Lessons: ask the user for 2-3, offering candidates you derive from deviations
and surprises recorded in the SUMMARY files ("executor deviated from plan in
phase 3 because..."). User's words win; derived candidates fill silence.

### 4. Archive the roadmap

Copy the current `ROADMAP.md` to `.planning/milestones/v{X.Y}-ROADMAP.md`
(create the directory if needed). Phase directories stay where they are —
they're history, and phase numbering continues into the next milestone.

### 5. Trim ROADMAP.md

Rewrite `.planning/ROADMAP.md` as a next-milestone skeleton:

```markdown
# Roadmap: {Project Name}

## Milestones
- v{X.Y} {Name} — Phases {A}-{B} (shipped {date}, archived: milestones/v{X.Y}-ROADMAP.md)

## Completed Phases
- [x] Phase {A}: {name} — {one-liner}
- [x] Phase {B}: {name} — {one-liner}

## Phases (v-next)
_Not yet defined. Run /gsd-milestone new._
```

Keep the completed-phase one-liner index (one line per phase, all shipped
milestones) — full details live in the archive.

### 6. Update PROJECT.md and STATE.md

- PROJECT.md: move requirements delivered this milestone from Active to
  Validated (`- ✓ {requirement} — v{X.Y}`), audit Out of Scope reasoning,
  refresh the current-state/context section, note key decisions from the
  SUMMARYs, and update the "Last updated" footer.
- STATE.md: status → milestone complete / between milestones; current position
  → "v{X.Y} shipped, next milestone not started"; keep Accumulated Context and
  the Quick Tasks table.

### 7. Tag (config-gated) and commit

- Only if config `git.create_tag` is `true`: `git tag v{X.Y}`.
- Commit (unless `planning.commit_docs` is false), staging the touched files
  explicitly:

  ```bash
  git add .planning/MILESTONES.md .planning/milestones/ .planning/ROADMAP.md .planning/PROJECT.md .planning/STATE.md
  git commit -m "docs: complete milestone v{X.Y}"
  ```

Report the entry, archive path, and suggest `/gsd-milestone new` as next up.

---

## new

### 1. Gather goals

Read PROJECT.md (validated requirements, active leftovers), MILESTONES.md (what
shipped), STATE.md. Ask the user for the new milestone's theme and goals:

- What should this milestone deliver? (features, outcomes)
- What's explicitly out of scope?

Reflect back a summary — "Milestone v{X.Y}: {name}, goal: {one sentence},
target features: {list}" — and iterate until the user confirms.

### 2. Version bump

Parse the last version from MILESTONES.md. Ask: minor (v1.0 → v1.1, iteration)
or major (v1.0 → v2.0, rethink)? Suggest based on the goals' scope.

### 3. Define requirements

Turn the goals into scoped requirements with REQ-IDs **continuing the existing
sequence** in REQUIREMENTS.md (if it ends at REQ-014, start at REQ-015; keep
whatever ID format the file uses). Append under a new section:

```markdown
## Milestone v{X.Y} Requirements

### {Category}
- [ ] {REQ-ID}: {requirement}
```

Confirm the requirement list with the user before writing.

### 4. Extend ROADMAP.md

Define the new milestone's phases and append them to ROADMAP.md. **Phase
numbering CONTINUES from the previous milestone — if v1.0 ended at phase 5,
v1.1 starts at phase 6. Never renumber, never restart at 1** (conventions §3;
phase numbers are stable identifiers across the project's life).

Per phase: name, outcome-shaped Goal, mapped REQ-IDs (every new requirement
maps to exactly one phase — check coverage), 2-5 success criteria, depends_on.
Aim for 3-6 phases; each should be independently plannable. Replace the
"Phases (v-next)" placeholder, update the Milestones list with the new
in-progress milestone, and present the proposed roadmap for approval before
finalizing.

### 5. Update PROJECT.md and STATE.md

- PROJECT.md: set `## Current Milestone: v{X.Y} {Name}` with goal and target
  features; add the new requirements to Active; update the footer.
- STATE.md: milestone → v{X.Y}, status → planning, reset phase/progress
  counters to the new totals, current position → "Phase {first new}: not
  started", next step → `/gsd-discuss-phase {first new phase}`. Preserve
  Accumulated Context and Quick Tasks.

### 6. Commit

Unless `planning.commit_docs` is false:

```bash
git add .planning/ROADMAP.md .planning/REQUIREMENTS.md .planning/PROJECT.md .planning/STATE.md
git commit -m "docs: start milestone v{X.Y}"
```

Report the new milestone summary and recommend next up:
`/gsd-discuss-phase {first new phase}`.
