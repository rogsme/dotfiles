---
name: gsd-review
description: Runs a multi-model adversarial review of a phase's implementation plans before execution. Triggers on "/gsd-review N", "review phase N", "review the plans", "cross-AI plan review", or "get the phase N plans reviewed". Sends all PLAN files plus project context to a panel of external AI reviewers defined in the shared reviewer registry, launched in parallel, and writes {NN}-REVIEWS.md with per-reviewer feedback and a consensus summary (blockers, agreed strengths/concerns, divergent views, unique insights). Accepts --only slug1,slug2 to restrict the panel. Different models catch different blind spots — a plan that survives independent review from several AI systems is more robust.
argument-hint: "<phase> [--only slug1,slug2]"
---

Read $HOME/.config/gsd/shared/conventions.md before doing anything — it defines project-root discovery, the .planning/ tree, commit conventions, config keys, and status vocabularies.
Read $HOME/.config/gsd/shared/reviewers.md — the reviewer panel, commands, timeouts, and invocation contract all come from it.

## Purpose

Cross-AI peer review of a phase's PLANS (not code). Each reviewer gets the same
prompt — project context, requirements, and every plan in the phase — and returns
structured adversarial feedback. Results are combined into `{NN}-REVIEWS.md` for the
planner to incorporate via `/gsd-plan-phase N --reviews`.

## Arguments

- `<phase>` (required) — phase number (integer or decimal insertion like `2.1`).
- `--only slug1,slug2` (optional) — restrict the panel to these registry slugs.

## Step 1 — Locate the phase and select reviewers

1. Discover the project root and phase directory per conventions. Resolve
   `{N}` (as given), `{PADDED}` (zero-padded), and `{phase_dir}`. If the phase
   directory has no `{NN}-*-PLAN.md` files, stop: "No plans found for phase {N}.
   Run /gsd-plan-phase {N} first."
2. Select reviewers per the registry's Invocation contract: rows with
   `default: yes`, unless `--only` was passed (then exactly those slugs — unknown
   slugs are an error naming the valid slugs). Apply the registry Settings
   (`keep_host_model`); every reviewer row counts as independent. If no reviewer's
   CLI is available at all, tell the user which CLIs to install and stop.
3. Availability-check each selected reviewer (`command -v` on the first word of its
   command). Missing CLI → skip that reviewer with a note; never fail the whole review.

## Step 2 — Gather context

Read and assemble, in this order:

1. `.planning/PROJECT.md` — first 80 lines only
2. The phase's section from `.planning/ROADMAP.md`
3. The requirements this phase addresses, from `.planning/REQUIREMENTS.md`
4. `{phase_dir}/{NN}-CONTEXT.md` if present (locked user decisions)
5. `{phase_dir}/{NN}-RESEARCH.md` if present (domain research)
6. ALL `{phase_dir}/{NN}-*-PLAN.md` files, in plan order

## Step 3 — Build the review prompt

Write `/tmp/gsd-review-prompt-{N}.md` with exactly this structure (fill the
placeholders from Step 2; omit sections whose source file does not exist):

```markdown
# Cross-AI Plan Review Request

You are reviewing implementation plans for a software project phase.
Provide structured feedback on plan quality, completeness, and risks.

## Project Context
{first 80 lines of PROJECT.md}

## Phase {N}: {phase name}
### Roadmap Section
{roadmap phase section}

### Requirements Addressed
{requirements for this phase}

### User Decisions (CONTEXT.md)
{context if present}

### Research Findings
{research if present}

### Plans to Review
{all PLAN.md contents}

## Review Instructions

You are a senior staff engineer conducting a deep adversarial review. Do not be polite —
be precise. Your job is to find what will break, what was forgotten, and what will cause
regret in 6 months. Assume the plan authors are competent but blind-spotted.

Analyze each plan across these dimensions:

### 1. Goal Alignment (Does it actually solve the problem?)
- Do the planned tasks demonstrably achieve the phase goals, or do they drift?
- Are there requirements listed in the roadmap that no task addresses?
- Is there work planned that serves no stated requirement (scope creep)?

### 2. Architecture & Design Coherence
- Does the plan fit the existing system architecture, or does it fight it?
- Are there hidden coupling points between tasks that the plan treats as independent?
- Will this design paint the codebase into a corner for future phases?
- Are data models and schemas forward-compatible?

### 3. Failure Mode Analysis
- What happens when each external dependency is unavailable?
- Where are the single points of failure?
- What are the partial-failure states (half-migrated data, partially applied changes)?
- Are rollback paths defined for each destructive operation?

### 4. Dependency & Ordering Risks
- Are task dependencies correctly identified, or are there hidden sequencing constraints?
- Are there circular dependencies between tasks?
- What is the critical path, and is it realistic?
- Are third-party library/API version constraints accounted for?

### 5. Security & Data Integrity
- Are there new attack surfaces introduced (injection, auth bypass, data exposure)?
- Is PII/PHI handled correctly at every boundary?
- Are there race conditions in concurrent operations?
- Is input validation present at every system boundary?

### 6. Testing & Verification Strategy
- Is the testing approach sufficient to catch regressions?
- Are there untestable components due to tight coupling?
- Are edge cases explicitly called out in the plan or silently assumed?
- Would the proposed tests actually catch the failure modes from dimension 3?

### 7. Operational Readiness
- What monitoring/alerting is needed that isn't mentioned?
- How will you know if this feature is broken in production?
- What is the migration strategy for existing data?
- Are there performance implications at realistic scale (not just happy path)?

### 8. Missing Pieces
- What questions should have been asked during planning but weren't?
- What implicit assumptions is the plan making that should be explicit?
- Are there cross-cutting concerns (logging, caching, rate limiting) that got ignored?

For each dimension, provide:
- **Verdict**: PASS / FLAG (minor concern) / BLOCK (must fix before execution)
- **Evidence**: Specific references to plan sections or missing sections
- **Recommendation**: Concrete, actionable fix (not vague advice)

End with:
1. **Overall Verdict** — APPROVE / REVISE / REJECT with one-paragraph justification
2. **Top 3 Blockers** — The most critical issues that must be addressed (if any)
3. **Top 3 Improvements** — High-value suggestions that would meaningfully improve the plan
```

## Step 4 — Launch the panel

Follow the registry's Invocation contract with `{kind}` = `review`:

- Substitute `{prompt}` = `/tmp/gsd-review-prompt-{N}.md` and
  `{out}` = `/tmp/gsd-review-{slug}-{N}.md` into each reviewer's command cell,
  exactly as written (stderr handling included — never add or strip it per-row).
- Launch ALL selected reviewers in parallel: every launch in one single message,
  each with the registry's `timeout_ms`. Then stop and WAIT for completion
  notifications. Never poll, never loop on file sizes or `wc -l`.
- When all have finished, read each output file once and validate per the contract
  (≥3 lines of meaningful content matching the requested format). Invalid or empty
  output → mark that reviewer failed, note it, continue. Never auto-retry.

Report status with one line per reviewer, using registry display names:

```
◆ {display}...   done ({lines} lines)   — or: FAILED (empty/invalid output) / SKIPPED (CLI not installed)
```

## Step 5 — Write {NN}-REVIEWS.md

Combine the valid reviews into `{phase_dir}/{NN}-REVIEWS.md`. Per-reviewer sections
are generated dynamically from the registry `display` column of the reviewers
actually invoked — never a hardcoded list:

```markdown
---
phase: {N}
reviewers: [{slugs that produced valid output}]
failed: [{slugs that failed or were skipped, if any}]
reviewed_at: {ISO timestamp}
plans_reviewed: [{list of PLAN.md filenames}]
---

# Cross-AI Plan Review — Phase {N}

## {display} Review

{that reviewer's full output}

---

(…one section per successful reviewer…)

## Consensus Summary

{synthesize common concerns — weight issues by how many reviewers raised them}

### Blockers (BLOCK from 2+ reviewers)
{issues that received BLOCK from 2+ reviewers, matched by substance not wording —
these are almost certainly real}

### Agreed Strengths
{strengths mentioned by 2+ reviewers}

### Agreed Concerns
{FLAG-level concerns raised by 2+ reviewers}

### Divergent Views
{where reviewers disagreed — may reveal genuine ambiguity in the plan}

### Unique Insights
{valuable points raised by only one reviewer — the blind spots the
multi-model approach exists to catch}
```

Note any failed/skipped reviewers in the Consensus Summary so the reader knows the
panel size.

## Step 6 — Commit and clean up

- Commit per conventions: `docs({NN}): cross-AI plan review` staging only
  `{phase_dir}/{NN}-REVIEWS.md` (honor `planning.commit_docs`).
- Delete all `/tmp/gsd-review-*-{N}.md` temp files (prompt and outputs).
- Show the user: reviewer count, overall verdicts, and the top consensus concerns.

## Next up

- `/gsd-plan-phase {N} --reviews` — incorporate the findings into revised plans.
- If a `--reviews` pass already ran for this phase and blockers remain, that is
  normal: repeat review passes are expected until the panel comes back clean.
  Suggest another `/gsd-review {N}` after the next revision.

Suggestions, not gates — the user decides.
