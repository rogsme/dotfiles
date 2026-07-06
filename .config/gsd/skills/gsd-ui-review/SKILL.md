---
name: gsd-ui-review
description: Runs a retroactive 6-pillar visual audit of a phase's implemented frontend, then challenges it with a cross-AI reviewer panel. Triggers on "/gsd-ui-review N", "UI review phase N", "audit the UI", "visual audit", or "how does the frontend look". A primary UI auditor subagent scores Copywriting, Visuals, Color, Typography, Spacing, and Experience Design (each /4) against the phase's UI-SPEC or abstract standards and writes {NN}-UI-REVIEW.md; then every reviewer in the shared registry independently re-scores all six pillars, agrees or disagrees per pillar, and surfaces issues the primary missed. Results are appended with a dynamic score-comparison table. Ends with severity-based routing to /gsd-fast, /gsd-quick, or /gsd-verify-work.
argument-hint: "<phase>"
---

Read $HOME/.config/gsd/shared/conventions.md before doing anything — it defines project-root discovery, the .planning/ tree, commit conventions, config keys, and status vocabularies.
Read $HOME/.config/gsd/shared/reviewers.md — the reviewer panel, commands, timeouts, and invocation contract all come from it.

## Purpose

Retroactive visual audit of what was actually built, in two stages: a primary
6-pillar audit by a fresh-context subagent, then independent cross-AI perspectives
that validate, challenge, or extend the primary's scores. Different eyes catch
different things — the panel exists to find what the primary auditor missed.

## Step 1 — Validate input state

Resolve the project root, phase directory, `{N}`, and `{PADDED}` per conventions.

- No `{NN}-*-SUMMARY.md` files in the phase directory → stop:
  "Phase {N} not executed. Run /gsd-execute-phase {N} first."
- `{NN}-UI-REVIEW.md` already exists → ask the user (per conventions §9):
  1. **Re-audit** — run a fresh audit (continue below)
  2. **View** — display the existing review and stop.

## Step 2 — Primary audit (subagent)

Spawn ONE fresh-context subagent with this prompt (paths, not contents):

```
Read $HOME/.claude/skills/gsd-ui-review/references/ui-auditor-prompt.md and follow it.

<objective>
Conduct a 6-pillar visual audit of Phase {N}: {phase name}.
{If UI-SPEC exists: "Audit against the UI-SPEC.md design contract."}
{If not: "Audit against abstract 6-pillar standards."}
</objective>

<files_to_read>
- {each {NN}-*-SUMMARY.md path}       (what was built)
- {each {NN}-*-PLAN.md path}          (what was intended)
- {NN}-UI-SPEC.md path, if it exists  (design contract — audit baseline)
- {NN}-CONTEXT.md path, if it exists  (locked user decisions)
</files_to_read>

<config>
phase_dir: {phase_dir}
padded_phase: {PADDED}
output: {phase_dir}/{NN}-UI-REVIEW.md
</config>
```

Omit lines for files that don't exist. The subagent writes `{NN}-UI-REVIEW.md`
itself and returns a short confirmation with its pillar scores. Wait for it to
finish; verify the file exists on disk before continuing. If the subagent failed,
report it and stop — do not fabricate an audit.

## Step 3 — Cross-AI panel

Select and availability-check reviewers per the registry's Invocation contract
(defaults; `keep_host_model`; `min_independent`; skip missing CLIs with a note).
If no independent reviewer is available, skip to Step 5 — the primary audit is
still valuable on its own; note that the cross-AI stage was skipped.

Gather context:

1. `.planning/PROJECT.md` — first 80 lines
2. The phase section from `.planning/ROADMAP.md`
3. Requirements this phase addresses, from `.planning/REQUIREMENTS.md`
4. `{NN}-UI-SPEC.md` if present (design contract)
5. `{NN}-CONTEXT.md` if present
6. All `{NN}-*-PLAN.md` and `{NN}-*-SUMMARY.md` files
7. The changed frontend source files: take key-files created/modified from the
   SUMMARY frontmatters; if none listed, fall back to
   `git log --name-only --pretty=format: --grep="({NN}-"` filtered to
   `*.tsx *.jsx *.vue *.svelte *.css *.scss *.html`, deduped, capped at 50 files.
   Include the CURRENT contents of those files.
8. The `{NN}-UI-REVIEW.md` the primary auditor just wrote.

Write `/tmp/gsd-ui-review-prompt-{N}.md`:

```markdown
# Cross-AI UI Code Review

You are reviewing frontend code for a software project phase. Another AI has already
conducted a 6-pillar audit — you will see their review below. Your job is to provide
an independent perspective: agree, disagree, or surface things they missed entirely.

Do not be deferential to the primary review. If you think a score is wrong, say so.
If you think a critical issue was missed, flag it. Different eyes catch different things.

## Project Context
{first 80 lines of PROJECT.md}

## Phase {N}: {phase name}
### Roadmap Section
{roadmap phase section}
### Requirements Addressed
{requirements}
### UI Spec (design contract)
{UI-SPEC.md contents, if it exists}
### User Decisions (CONTEXT.md)
{context if present}
### Plans (what was intended)
{all PLAN.md contents}
### Execution Summary (what was built)
{SUMMARY.md contents}
### Frontend Source Code
{contents of the changed frontend files — the actual code being audited}
### Primary Audit
{UI-REVIEW.md contents}

## Your Review

Evaluate the frontend code across these 6 pillars. For each pillar:
- **Your Score**: {n}/4 — with one-line justification
- **Agree/Disagree** with the primary audit's score — and why
- **Missed Issues**: anything the primary auditor overlooked

### Pillars
1. **Copywriting** — Labels, microcopy, error messages, placeholder text. Clear, consistent, human?
2. **Visuals** — Layout, alignment, component hierarchy, visual weight. Does it scan well?
3. **Color** — Contrast, accessibility (WCAG), semantic use, dark/light consistency.
4. **Typography** — Font sizes, weights, line heights, hierarchy. Is the type system coherent?
5. **Spacing** — Padding, margins, gaps, rhythm. Is white space intentional or accidental?
6. **Experience Design** — Flow, affordance, feedback, loading/error/empty states. Does it feel right?

Then provide:
- **Top 3 Issues the Primary Audit Got Right** — validate the strongest findings
- **Top 3 Issues the Primary Audit Missed** — your unique contribution
- **Score Disagreements** — any pillar where your score differs by 2+ points, with evidence
- **Overall Verdict** — AGREE / PARTIALLY AGREE / DISAGREE with the primary audit

Output your review in markdown format.
```

Launch per the registry's Invocation contract with `{kind}` = `ui-review`
(`{out}` = `/tmp/gsd-ui-review-{slug}-{N}.md`): all reviewers in parallel in one
single message, each with the registry's `timeout_ms`; WAIT for completion
notifications, never poll; validate outputs per the contract; mark failures and
continue; never auto-retry. Report per-reviewer status using registry display names.

## Step 4 — Append cross-AI section

Append to `{phase_dir}/{NN}-UI-REVIEW.md` — all reviewer names and table columns
come from the registry `display` values of the reviewers that succeeded, built
dynamically, NEVER hardcoded:

```markdown
---

# Cross-AI UI Perspectives

> Independent assessments from {count} additional AI models, challenging and
> supplementing the primary 6-pillar audit above.

## {display}
{that reviewer's full output}
---
(…one section per successful reviewer…)

## Cross-AI Consensus

### Score Comparison
| Pillar | Primary | {display 1} | {display …} | Avg |
|--------|---------|------------|-------------|-----|
{one row per pillar: Copywriting, Visuals, Color, Typography, Spacing,
Experience Design — each cell {n}/4 — plus a final **Total** row of /24 sums}

### Issues Missed by Primary Audit
{issues raised by 2+ cross-AI reviewers that the primary did not mention — highest priority}

### Score Disagreements
{pillars where the cross-AI average differs from the primary by 1+ point}

### Validated Findings
{primary findings confirmed by 2+ cross-AI reviewers — high confidence}
```

Note failed/skipped reviewers. Delete all `/tmp/gsd-ui-review-*-{N}.md` temp files.

## Step 5 — Present results and route

Show the pillar score table (Primary + Cross-AI Avg), the top fixes, and any
issues the panel caught that the primary missed. Count total actionable issues
across the primary audit and the panel's missed-issue findings, then route:

**MANY issues — 5+ actionable fixes, OR any pillar ≤ 2/4, OR cross-AI avg < 16/24
→ Fix Issues First:**
- Simple fixes (copy, spacing, color values):
  `/gsd-fast fix the {n} issues from the phase {N} UI review`
- Structural fixes (layout, component hierarchy, experience flow):
  `/gsd-quick {N} — fix UI review issues`
- Then re-run `/gsd-ui-review {N}`.

**FEW issues — fewer than 5 actionable fixes AND all pillars ≥ 3/4 AND cross-AI
avg ≥ 18/24 → proceed:**
- Optional: `/gsd-fast fix the {n} minor issues from the phase {N} UI review`
- `/gsd-ship {N}` — open the PR (run `/gsd-verify-work {N}` first only if UAT
  hasn't been done yet), then on to the next phase.

## Step 6 — Commit

Commit per conventions: `docs({NN}): cross-AI UI review`, staging only
`{phase_dir}/{NN}-UI-REVIEW.md` (honor `planning.commit_docs`).

## Next up

- Many issues: fix via `/gsd-fast` or `/gsd-quick`, then `/gsd-ui-review {N}` again.
- Few/none: `/gsd-ship {N}` (run `/gsd-verify-work {N}` first only if UAT hasn't
  been done yet), then `/gsd-plan-phase {next}`.

Suggestions, not gates — the user decides.
