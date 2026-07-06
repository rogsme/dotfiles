---
name: gsd-progress
description: Reports where a GSD project stands and routes to exactly one recommended next command. Use when the user asks "where am I", "what's next", "gsd progress", "project status", "how far along are we", or wants to resume work after a break. Reconciles STATE.md against the planning artifacts actually on disk (disk wins), shows current position with a progress bar, recent work, and open items (incomplete UAT, verification gaps, open questions, open security threats), then recommends the single next pipeline step with 1-2 alternatives. Read-only except for an offered STATE.md fix.
---

Read $HOME/.config/gsd/shared/conventions.md before doing anything — it defines project-root discovery, the .planning/ tree, commit conventions, config keys, and status vocabularies.

# GSD Progress

Answer three questions: Where am I? What happened recently? What should I do next?
This skill is read-only, with one exception: it may fix a stale STATE.md, and only
after asking.

## Step 1 — Locate and reconcile

1. Find the project root (conventions §1). No `.planning/` → stop per conventions.
2. Read `.planning/STATE.md` and `.planning/ROADMAP.md`.
   - ROADMAP.md missing but PROJECT.md exists → a milestone was completed and
     archived; report that and recommend `/gsd-milestone new`. Done.
3. **Reconcile STATE against disk truth** (conventions §6: disk wins). For every
   phase directory under `.planning/phases/`, list what actually exists:
   - `{NN}-CONTEXT.md` — discussed?
   - `{NN}-{PP}-PLAN.md` files — how many plans?
   - `{NN}-{PP}-SUMMARY.md` files — how many executed?
   - `{NN}-VERIFICATION.md` — read its `status` (passed | gaps_found | human_needed)
   - `{NN}-UAT.md` — read its `status`
   - `{NN}-REVIEWS.md`, `{NN}-SECURITY.md` — present? Read their open-item state.

   Derive each phase's true status from these artifacts:
   - no directory or empty → **not started**
   - CONTEXT but no plans → **discussed**
   - plans, fewer summaries than plans → **executing** (or stalled mid-execution)
   - all plans have summaries but VERIFICATION missing or not `passed` → **needs verification**
   - all plans summarized and VERIFICATION `passed` → **complete**
4. Compare the derived picture with what STATE.md claims (current phase, progress
   counters, status). If they disagree, say so explicitly — show both versions —
   and offer to update STATE.md to match disk. Ask first; only edit STATE.md if
   the user says yes. This is the skill's only write. Do not touch any other file.

## Step 2 — Report

Present a compact status report:

```
# {Project name} — {milestone version/name from ROADMAP.md}

**Position:** Phase {X} of {Y}: {phase name} — {derived status}
**Progress:** [████████░░░░░░░░░░░░] {completed}/{total} phases

## Recent Work
- {NN}-{PP}: {one-liner from the most recent SUMMARY.md}
- {NN}-{PP}: {one-liner}
- {NN}-{PP}: {one-liner}

## Open Items
- {only sections with content; omit empty ones}
```

Details:

- **Progress bar:** completed phases / total phases in the current ROADMAP.md.
  Count decimal (inserted) phases as phases.
- **Recent work:** the 3 most recent SUMMARY.md files across all phases and
  `.planning/quick/` (by file modification time). One line each — use the
  summary's own one-liner or first heading, don't re-read whole files.
- **Open items — scan ALL phases, not just the current one:**
  - UAT files with `status` ≠ complete: list phase, status, and unresolved count.
  - VERIFICATION files with `gaps_found` or `human_needed`: list the gaps or
    human-verification items.
  - CONTEXT.md files with open questions (an unresolved "Open Questions" or
    "Deferred" section): list them briefly.
  - SECURITY.md files with `threats_open > 0`: list phase and open-threat count.
  - If STATE.md was stale (Step 1), note it here too.

Keep the report scannable — this is a dashboard, not an essay.

## Step 3 — Route to exactly ONE next command

Derive the recommendation from **disk state** (never from STATE.md's claim).
Find the lowest-numbered phase that is not complete — call it phase N. Then
evaluate top to bottom; the first matching row is THE recommendation:

| # | Condition (disk truth) | Recommend |
|---|------------------------|-----------|
| 1 | Phase N has plans without matching SUMMARYs | `/gsd-execute-phase N` |
| 2 | Phase N VERIFICATION has `status: gaps_found` | `/gsd-plan-phase N --gaps` |
| 3 | Phase N REVIEWS.md has unaddressed blockers (BLOCK verdicts with no revision noted) | `/gsd-plan-phase N --reviews` |
| 4 | Phase N has CONTEXT.md but no plans | `/gsd-plan-phase N` |
| 5 | Phase N has no CONTEXT.md | `/gsd-discuss-phase N` |
| 6 | Phase N complete, a next phase exists in ROADMAP.md | `/gsd-discuss-phase {next}` |
| 7 | All phases complete | `/gsd-milestone complete` |

Notes on applying the table:

- Row 1 also covers the resume case: a session died mid-execution and STATE.md
  moved on. Plans without summaries always take priority — never route forward
  past unexecuted plans in an earlier phase.
- Row 2/3 only fire for artifacts in phase N's own directory.
- VERIFICATION `human_needed` in phase N → recommend `/gsd-verify-work N` (the
  human items block completion, not planning).
- If ROADMAP.md is missing entirely (between milestones), you already handled it
  in Step 1: `/gsd-milestone new`.

Present the routing like this:

```
## Next Up

**{one-line reason, e.g. "Phase 3 has 2 unexecuted plans"}**

→ `/gsd-execute-phase 3`

Also worth considering:
- `/gsd-verify-work 2` — UAT for phase 2 is still partial
- `/gsd-code-review 3` — optional review after execution
```

Rules for the recommendation block:

- **Exactly one** primary recommendation. Never present two "next steps".
- Mention 1-2 sensible alternatives below it — e.g. optional `/gsd-code-review N`
  or `/gsd-verify-work N --auto` after an execution completes, or an open item
  from Step 2 the user might want to clear first. Alternatives are context, not
  choices to agonize over.
- Suggestions are never gates (conventions §10) — the user decides. Do not run
  the recommended command yourself; just recommend it.

## Worked example

```
# invoice-pilot — v1.0 MVP

**Position:** Phase 3 of 5: PDF Export — executing
**Progress:** [████████░░░░░░░░░░░░] 2/5 phases

## Recent Work
- 03-01: Wired PDF renderer behind export endpoint
- 02-02: Session-cookie auth with refresh rotation
- quick/2: Fixed currency rounding in totals

## Open Items
- Phase 2 UAT: status partial — 2 tests pending
- Phase 1 CONTEXT: open question — "retention policy for uploaded PDFs?"
- STATE.md was stale (claimed phase 4) — reconciled view shown above; say the
  word and I'll fix STATE.md.

## Next Up

**Phase 3 has 1 plan without a summary (03-02-PLAN.md)**

→ `/gsd-execute-phase 3`

Also worth considering:
- `/gsd-verify-work 2` — finish the 2 pending UAT tests
```

Here row 1 of the routing table fired (plans without summaries in the lowest
incomplete phase), so everything else — the stale STATE, the open UAT — appears
as context, not as competing recommendations.
