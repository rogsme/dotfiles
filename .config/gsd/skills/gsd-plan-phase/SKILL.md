---
name: gsd-plan-phase
description: Creates executable plan files ({NN}-{PP}-PLAN.md) for a roadmap phase by orchestrating planner and plan-checker subagents, with optional research. Use when the user says "plan phase 2", "/gsd-plan-phase 3", "plan phase 4 --research", "replan with the review feedback" (--reviews), or "create gap-closure plans" (--gaps). Reads CONTEXT.md and other phase inputs, spawns a planner subagent, verifies plan quality with a checker subagent (max 2 revision cycles), commits the plans, and presents a plan/wave summary table.
argument-hint: <phase-number> [--research] [--reviews] [--gaps]
---

Read $HOME/.config/gsd/shared/conventions.md before doing anything — it defines project-root discovery, the .planning/ tree, commit conventions, config keys, and status vocabularies.

# Plan Phase

Turn a roadmap phase into executable plans. The orchestrator (you) stays light:
gather input paths, spawn subagents for the heavy thinking, check the result,
commit. Never write plans inline yourself — the planner subagent gets a fresh
context for a reason.

**Arguments:** phase number (required; integer or decimal like `2.1`), plus flags:

- `--research` — spawn a researcher subagent before planning (or force-refresh
  existing research).
- `--reviews` — revise existing plans to incorporate `/gsd-review` findings.
- `--gaps` — create targeted gap-closure plans from verification/UAT gaps.

`--reviews` and `--gaps` are mutually exclusive — error if both are present.

## 1. Locate and load

1. Discover the project root per conventions.md. No `.planning/` → stop with the
   standard suggestion.
2. Read `.planning/STATE.md` and `.planning/config.json` (note `mode` and
   `planning.commit_docs`).
3. Parse this phase's section of `.planning/ROADMAP.md`: goal, requirement IDs,
   success criteria. Phase not found → error, list available phases.
4. Resolve the phase directory `.planning/phases/{NN}-{slug}/` (create it if the
   phase exists in ROADMAP.md but has no directory yet).
5. Collect input paths (paths, not contents — subagents read files themselves):
   - `{NN}-CONTEXT.md` — if **absent**, recommend running
     `/gsd-discuss-phase {N}` first so the user's decisions are captured; ask
     whether to proceed without it (allowed) or stop to discuss.
   - `{NN}-UI-SPEC.md` — include if present.
   - `.planning/codebase/*.md` — include whichever maps exist.
   - `{NN}-RESEARCH.md` — include if present.
   - `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`.
6. Flag prerequisites:
   - `--reviews` requires `{NN}-REVIEWS.md` in the phase dir. Missing → error:
     run `/gsd-review {N}` first, then re-run with `--reviews`.
   - `--gaps` requires `{NN}-VERIFICATION.md` or `{NN}-UAT.md` containing gaps.
     Missing → error: nothing to close; run `/gsd-execute-phase {N}` or
     `/gsd-verify-work {N}` first.
7. If plans already exist and neither `--reviews` nor `--gaps` is set, ask the
   user: add more plans / view existing / replan from scratch.

## 2. Research (only with --research)

Spawn one researcher subagent:

> Read $HOME/.claude/skills/gsd-plan-phase/references/researcher-prompt.md and
> follow it.
>
> Phase: {N} — {name}. Phase goal: {goal}.
> Inputs: {list the collected paths — ROADMAP section, CONTEXT, REQUIREMENTS,
> codebase maps}.
> Output: write `{phase_dir}/{NN}-RESEARCH.md`.

Wait for it to finish. On success, add the RESEARCH.md path to the planner
inputs and (honoring `planning.commit_docs`) commit:

```
docs({NN}): phase research
```

If the researcher reports it is blocked, relay the blocker and ask the user:
provide the missing context / skip research / abort.

If `{NN}-RESEARCH.md` already exists and `--research` was passed, treat it as a
force-refresh and overwrite.

## 3. Spawn the planner

Determine the mode: `standard` (default), `reviews`, or `gaps`.

Spawn ONE planner subagent:

> Read $HOME/.claude/skills/gsd-plan-phase/references/planner-prompt.md and
> follow it.
>
> Phase: {N} — {name}. Mode: {standard|reviews|gaps}.
> Inputs (read these files): {ROADMAP.md (this phase's section), REQUIREMENTS.md,
> STATE.md, CONTEXT.md if present, RESEARCH.md if present, UI-SPEC.md if present,
> codebase maps if present; plus REVIEWS.md when mode is reviews; plus
> VERIFICATION.md / UAT.md when mode is gaps}.
> Plan template: $HOME/.config/gsd/shared/templates/plan.md
> Output: write plan files to `{phase_dir}/{NN}-{PP}-PLAN.md`.

Mode-specific instructions to include:

- **reviews** — revise the existing plans in place, incorporating every current
  actionable finding from REVIEWS.md: each finding is either folded into a plan
  task or explicitly deferred/rejected with rationale in the plan. No silent
  drops.
- **gaps** — create targeted gap-closure plans (new plan numbers after the
  existing ones, `gap_closure: true` in frontmatter) that close the specific
  gaps recorded in VERIFICATION.md/UAT.md — not a re-plan of the phase.

**Multi-subsystem exception:** if the phase clearly spans 3+ distinct subsystems
(e.g. API + worker + frontend), you MAY split the work across 2–3 planner
subagents, one per subsystem, launched in parallel (all spawns in a single
message, then wait — never poll). Assign each a disjoint range of plan numbers
up front so their outputs can't collide. Default remains one planner.

Wait for the planner(s) to return a short confirmation listing the plan files
written.

## 4. Check the plans

Spawn a plan-checker subagent:

> Read $HOME/.claude/skills/gsd-plan-phase/references/plan-checker-prompt.md and
> follow it.
>
> Phase: {N} — {name}. Phase goal and requirement IDs: {from ROADMAP.md}.
> Check these plans: {list of {NN}-{PP}-PLAN.md paths}.
> Context inputs: {CONTEXT.md, RESEARCH.md, REVIEWS.md as applicable}.
> Return a verdict: pass, or a numbered list of concrete issues.

- **Pass** → continue to step 5.
- **Issues** → spawn the planner again in revision mode: same prompt reference
  and inputs, plus the checker's numbered issues, instructing it to revise the
  existing plan files. Then re-run the checker on the revised plans.

**Max 2 revision cycles.** If issues remain after the second re-check, present
them to the user and ask (2–4 options):

- **Accept as-is** — proceed with the plans despite the listed issues.
- **Guide a fix** — user points at what matters; run one more targeted revision.
- **Abandon** — delete nothing, stop, and let the user rethink the phase.

## 5. Confirm and commit

If `mode` in config.json is `interactive`, show a concise summary of the plans
(per plan: objective, wave, task count, files touched) and confirm with the user
before committing. In `yolo` mode, skip the confirmation.

Honoring `planning.commit_docs`, stage the plan files (and RESEARCH.md if not
yet committed) explicitly and commit:

- standard: `docs({NN}): create phase plans`
- reviews: `docs({NN}): revise phase plans from review findings`
- gaps: `docs({NN}): create gap closure plans`

## 6. Present the result

Show a table of what was planned:

| Plan | Wave | Tasks | Objective |
|---|---|---|---|
| {NN}-01 | 1 | 4 | … |
| {NN}-02 | 1 | 3 | … |
| {NN}-03 | 2 | 5 | … |

Note anything the checker flagged that the user accepted as-is.

## Next up

- **After a first planning pass:** `/gsd-review {N}` — multi-model adversarial
  review of the plans (recommended for non-trivial phases), then
  `/gsd-plan-phase {N} --reviews` to fold the findings back in. Repeat until
  the review comes back clean.
- **After reviews are clean (or for simple phases):** `/gsd-execute-phase {N}`.
- `/gsd-progress` anytime — where am I, what's next.

Suggestions, not gates — the user decides.
