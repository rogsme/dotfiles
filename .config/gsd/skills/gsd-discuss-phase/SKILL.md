---
name: gsd-discuss-phase
description: Captures the user's implementation decisions for a roadmap phase through a focused discussion, producing {NN}-CONTEXT.md for downstream planning. Use when the user says "discuss phase 3", "/gsd-discuss-phase 2", "let's talk through phase 4 before planning", "capture context for phase 5", or wants to clarify how a phase should be built before plans are written. Identifies phase-specific gray areas, asks targeted questions with concrete options, redirects scope creep into deferred ideas, and commits the context file.
argument-hint: <phase-number>
---

Read $HOME/.config/gsd/shared/conventions.md before doing anything — it defines project-root discovery, the .planning/ tree, commit conventions, config keys, and status vocabularies.

# Discuss Phase

Extract the implementation decisions downstream agents need. You are a thinking
partner, not an interviewer: the user is the visionary, you are the builder. The
user knows how they imagine it working, what it should look and feel like, and
what's essential vs nice-to-have. The user should NOT be asked about codebase
patterns, technical risks, implementation approach, or success metrics — research
and planning figure those out from the decisions you capture here.

**Argument:** phase number (required). Integer or decimal insertion (`2.1`).

## 1. Locate and load

1. Discover the project root per conventions.md. No `.planning/` → stop with the
   standard suggestion.
2. Read `.planning/STATE.md`, the phase's section of `.planning/ROADMAP.md`
   (goal, requirement IDs, success criteria), and `.planning/REQUIREMENTS.md`.
   If the phase isn't in ROADMAP.md, tell the user and list available phases.
3. Read prior phases' `{NN}-CONTEXT.md` and `{NN}-{PP}-SUMMARY.md` files (the 2–3
   most recent phases are enough) and extract decisions that carry forward —
   locked preferences, rejected approaches, established patterns. Never re-ask a
   question a prior phase already answered; carry the answer forward and say so.
4. If this phase's `{NN}-CONTEXT.md` already exists, ask the user (2–4 options):
   - **View it** — show the existing context, then stop.
   - **Re-discuss** — run the full discussion again and overwrite.
   - **Continue** — keep existing decisions, discuss only new/remaining areas.

## 2. Quick codebase scout (inline — no subagent)

Read the handful of files most relevant to this phase: the 2–3 most relevant
`.planning/codebase/*.md` maps if they exist, plus the few source files the phase
will most likely touch (entry points, the module named by the phase, existing
analogs of what's being built). Keep it light — the goal is to annotate gray-area
options with real code context ("you already have a Card component…"), not to map
the codebase. If there is no code yet, skip silently.

## 3. Derive gray areas

Gray areas are implementation decisions the user cares about — things that could
go multiple ways and would visibly change the result.

1. State the **domain boundary**: what capability this phase delivers, in one line.
2. Derive **3–4 phase-specific gray areas** from the phase goal, requirements,
   codebase scout, and carried-forward decisions.

**Never use generic category labels** (UI, UX, Behavior). Generate specific gray
areas. Examples of the required specificity:

| Phase | Gray areas |
|---|---|
| User authentication | Session handling, Error responses, Multi-device policy, Recovery flow |
| Organize photo library | Grouping criteria, Duplicate handling, Naming convention, Folder structure |
| CLI for database backups | Output format, Flag design, Progress reporting, Error recovery |
| API documentation | Structure/navigation, Code examples depth, Versioning approach, Interactive elements |

Don't ask about things Claude handles: technical implementation details,
architecture patterns, performance optimization, or scope (the roadmap defines
scope). Skip gray areas that prior context already decided — list them under
"Carrying forward" instead.

Present the domain boundary, any carried-forward decisions, and the gray areas.
Ask the user (multi-select) which areas to discuss; each option gets a concrete
label plus a one-line description of the question at stake, annotated with code
context or prior decisions where relevant. Also invite the user to add their own
area. Do NOT include a "skip" or "you decide" option — the user ran this command
to discuss.

If no meaningful gray areas exist (pure infrastructure, clear-cut work, all
decided already), say so and offer to write a minimal CONTEXT.md from what's known.

## 4. Discuss each selected area

For each selected area, ask up to ~4 focused questions — **one at a time**, each
with 2–4 concrete options plus a freeform choice. Options should be real
positions, not placeholders, and annotated with consequences ("infinite scroll
matches Phase 4's feed; pagination is simpler to test"). After each answer,
reflect it back briefly and move on; stop early once the area is settled. After
~4 questions, check whether the user wants to go deeper or move to the next area.

**Scope guardrail (CRITICAL — no scope creep).** The phase boundary comes from
ROADMAP.md and is FIXED. Discussion clarifies HOW to implement what's scoped,
never WHETHER to add new capabilities.

- **Allowed (clarifying ambiguity):** "How should posts be displayed?" (layout);
  "What happens on empty state?" (within the feature).
- **Not allowed (scope creep):** "Should we also add comments?" / "What about
  search/filtering?" / "Maybe include bookmarking?" — new capabilities that
  belong in their own phase.
- **Heuristic:** does this clarify how we implement what's already in the phase,
  or does it add a new capability that could be its own phase?
- **When the user suggests scope creep**, respond:

  > "[Feature X] would be a new capability — that's its own phase.
  > Want me to note it for the roadmap backlog?
  > For now, let's focus on [phase domain]."

  Capture the idea under "Deferred Ideas". Don't lose it, don't act on it.

**Canonical references.** Whenever the user cites a doc, URL, spec, ADR, or file
("read X", "follow Y", "it should work like Z"), immediately read or confirm it
exists and record it as a canonical reference with its full path or URL. These
are often the most important inputs for downstream agents — more so than
ROADMAP.md itself. Use what you learn from them to sharpen later questions.

Throughout, accumulate: decisions per area, canonical refs, deferred ideas, and
anything the user explicitly left to Claude's discretion.

## 5. Write CONTEXT.md

Create the phase directory `.planning/phases/{NN}-{slug}/` if it doesn't exist
(slug from the phase name in ROADMAP.md; never renumber existing phases).

Write `{phase_dir}/{NN}-CONTEXT.md` following the template at
`$HOME/.config/gsd/shared/templates/context.md`. It captures:

- **Domain** — what this phase delivers and where its boundary sits.
- **Decisions** — per discussed area: what was decided and why, concrete enough
  that the planner can act without re-asking. Include carried-forward decisions
  and anything explicitly left to Claude's discretion.
- **Canonical references** — every doc/spec/ADR/URL cited, with full paths. If
  none exist, state that explicitly.
- **Deferred ideas** — scope-creep captures, each with a one-line description.
- **Open questions** — anything the user deferred or couldn't answer yet.

Capture actual decisions, not vague vision. "Cards with author + timestamp,
newest first" beats "a clean feed layout".

## 6. Commit

If `planning.commit_docs` is not `false` in `.planning/config.json`, stage the
CONTEXT.md explicitly and commit:

```
docs({NN}): capture phase context
```

If `commit_docs` is `false`, skip the commit and say so.

Then show a short recap: decisions captured per area, deferred ideas noted, and
the CONTEXT.md path.

## Next up

- `/gsd-ui-phase {N}` — if this phase has visual/frontend work, produce the UI
  design contract before planning.
- `/gsd-plan-phase {N}` — plan the phase. Add `--research` when the phase touches
  unfamiliar tech, new integrations, or architectural changes.
- Or review/edit `{NN}-CONTEXT.md` by hand first.

Suggestions, not gates — the user decides.
