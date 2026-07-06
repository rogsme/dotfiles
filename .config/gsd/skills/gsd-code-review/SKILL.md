---
name: gsd-code-review
description: Runs an adversarial multi-model review of the actual git diff a phase produced — the code, not the plans and not the SUMMARY claims. Triggers on "/gsd-code-review N", "code review phase N", "review the phase N diff", "cross-AI code review", or "check the code that was just executed". Collects the phase's commits into one diff, sends it with condensed plan context to the reviewer panel from the shared registry (launched in parallel), and writes {NN}-CODE-REVIEW.md with per-reviewer findings and a consensus verdict. Advisory only — it never blocks the pipeline. Accepts --base <sha> to override diff detection and --only slug1,slug2 to restrict the panel.
argument-hint: "<phase> [--base <sha>] [--only slug1,slug2]"
---

Read $HOME/.config/gsd/shared/conventions.md before doing anything — it defines project-root discovery, the .planning/ tree, commit conventions, config keys, and status vocabularies.
Read $HOME/.config/gsd/shared/reviewers.md — the reviewer panel, commands, timeouts, and invocation contract all come from it.

## Purpose

Plans get reviewed before execution; SUMMARYs describe what the executor *says* it
did. This skill reviews what actually changed: the phase's git diff. Multiple
independent models read the same patch and hunt for bugs, security holes, and
plan drift. The result is advisory — it informs the user and suggests fixes, but
never gates UAT or shipping.

## Arguments

- `<phase>` (required) — phase number.
- `--base <sha>` (optional) — explicit diff base; overrides commit detection.
- `--only slug1,slug2` (optional) — restrict the panel to these registry slugs.

Resolve the phase directory, `{N}`, and `{PADDED}` per conventions. Require at
least one `{NN}-*-SUMMARY.md` in the phase directory — if none, stop: "Phase {N}
has not been executed. Run /gsd-execute-phase {N} first." Select and
availability-check reviewers per the registry's Invocation contract (defaults
unless `--only`; `keep_host_model`; `min_independent`; skip missing CLIs with a note).

## Step 1 — Collect the diff

Three tiers, first match wins:

**Tier a — commit scopes (primary).** Executor commits embed the plan ID in the
scope (`feat(03-01): …`, `fix(03.1-02): …`), so match on the opening `({PADDED}-`:

```bash
git log --format="%H" --grep="({PADDED}-"
```

- `DIFF_BASE` = parent of the OLDEST matching commit (`{oldest}^`; if it has no
  parent, use the oldest commit itself).
- `DIFF_HEAD` = the NEWEST matching commit — NOT `HEAD`. Using HEAD would sweep in
  unrelated later commits (quick tasks, other phases, doc commits).

**Tier b — SUMMARY fallback.** If no commits match: read every
`{NN}-*-SUMMARY.md` frontmatter; take the union of `key-files` created/modified
plus the task-commit hashes recorded there. `DIFF_BASE` = parent of the oldest
recorded hash, `DIFF_HEAD` = newest recorded hash. If SUMMARYs record no hashes,
fall back to reviewing the current contents of the key-files (note this in the
prompt) — and if even that is empty, stop: "Cannot determine what phase {N}
changed. Re-run with --base <sha>."

**Tier c — `--base` override (wins over both).** `DIFF_BASE` = the given sha,
`DIFF_HEAD` = the newest phase commit from tier a, or `HEAD` if none matched.

Materialize the diff to `/tmp/gsd-code-review-diff-{N}.patch`:

```bash
git diff DIFF_BASE..DIFF_HEAD --stat -- . ':!.planning/**'
git diff DIFF_BASE..DIFF_HEAD -- . ':!.planning/**'
```

(stat block first, then the full patch, in the same file). If the patch exceeds
~150 KB, replace it with the CURRENT contents of the changed source files
(cap at 50 files, largest offenders truncated) and state in the prompt that
reviewers are seeing final file contents rather than a patch.

## Step 2 — Build the prompt

Write `/tmp/gsd-code-review-prompt-{N}.md`:

```markdown
# Cross-AI Code Review Request

You are reviewing the actual code changes produced for a project phase — judge the
diff, not the intentions.

## Project Context
{first 80 lines of PROJECT.md}

## Phase {N}: {phase name}
### Roadmap Section
{roadmap phase section, including its REQ-IDs}

### What Was Planned
{condensed per-plan objectives + must_haves from each {NN}-*-PLAN.md}

### What Execution Claims
{one line per {NN}-*-SUMMARY.md}

### Project Conventions
{if .planning/codebase/CONVENTIONS.md exists: note its path and key rules}

## The Diff ({DIFF_BASE}..{DIFF_HEAD}, {files} files)
{contents of /tmp/gsd-code-review-diff-{N}.patch — or the changed-file contents,
with a note explaining why}

## Review Instructions

You are a senior staff engineer conducting a deep adversarial review. Do not be polite —
be precise. Your job is to find what will break, what was forgotten, and what will cause
regret in 6 months. Assume the authors are competent but blind-spotted. Review the code
that is actually in the diff — not what the summaries claim.

Analyze the diff across these dimensions:

### 1. Correctness & Bugs
- Logic errors, off-by-ones, inverted conditions, broken edge cases in the new code.
- Does the code do what its own names and comments claim?

### 2. Security
- Injection (SQL/command/template), authn/authz on new routes or handlers,
  secrets in code or logs, unvalidated input at every boundary the diff touches.

### 3. Data Integrity & Migrations
- Are schema/data migrations safe, reversible, and idempotent?
- Can concurrent or partial execution corrupt state?

### 4. Error Handling & Failure Modes
- What happens when calls in the diff fail, time out, or return unexpected shapes?
- Swallowed exceptions, missing rollbacks, unhandled promise/async failures.

### 5. Performance & Resource Use
- N+1 queries, unbounded loops/allocations, missing pagination, leaked
  handles/connections introduced by the diff.

### 6. Test Adequacy
- Do the diff's tests exercise the NEW behavior and its failure modes?
- Are assertions meaningful, or do tests merely execute the code?

### 7. Code Quality & Consistency
- Does the new code follow the project's stated conventions and the patterns
  visible in surrounding code? Dead code, duplication, misleading names.

### 8. Plan Fidelity & Missing Pieces
- Diff vs the plans' must_haves: is anything promised but absent?
- Stubs, TODOs, or hardcoded values standing in for real behavior?
- Unplanned changes without rationale?

For each dimension, provide:
- **Verdict**: PASS / FLAG (minor concern) / BLOCK (must fix)
- **Evidence**: file:line references into the diff
- **Fix**: concrete, actionable change (not vague advice)

End with:
1. **Overall Verdict** — APPROVE / REVISE / REJECT with one-paragraph justification
2. **Top 3 Blockers** — the most critical issues (if any)
3. **Top 3 Improvements** — high-value suggestions

Output your review in markdown format.
```

## Step 3 — Launch the panel

Follow the registry's Invocation contract with `{kind}` = `code-review`:
substitute `{prompt}` = `/tmp/gsd-code-review-prompt-{N}.md` and `{out}` =
`/tmp/gsd-code-review-{slug}-{N}.md` into each command cell exactly as written.
Launch ALL selected reviewers in parallel in one single message, each with the
registry's `timeout_ms`, then WAIT for completion notifications — never poll.
Validate each output per the contract; mark failures, continue, never auto-retry.
Report per-reviewer status lines using registry display names.

## Step 4 — Write {NN}-CODE-REVIEW.md

Write `{phase_dir}/{NN}-CODE-REVIEW.md`, sections generated from the registry
`display` column of the reviewers actually invoked:

```markdown
---
phase: {N}
reviewers: [{successful slugs}]
failed: [{failed/skipped slugs, if any}]
reviewed_at: {ISO timestamp}
diff_base: {DIFF_BASE}
diff_head: {DIFF_HEAD}
files_reviewed: {count}
verdict: {approve | revise | reject}
blockers: {count of consensus blockers}
---

# Cross-AI Code Review — Phase {N}

## {display} Review
{that reviewer's full output}

---
(…one section per successful reviewer…)

## Consensus Summary

### Blockers
{the same issue BLOCKed by 2+ reviewers, matched by file + substance, not wording.
Each: file:line + the agreed fix}

### Agreed Concerns
{FLAG-level issues raised by 2+ reviewers}

### Divergent Views
{where reviewers disagreed}

### Unique Insights
{strong points raised by only one reviewer}
```

Consensus verdict rules: `reject` if any consensus blocker touches Security or
Data Integrity & Migrations; `revise` if consensus blockers exist otherwise;
`approve` if there are none.

Commit per conventions: `docs({NN}): cross-AI code review`, staging only the
CODE-REVIEW.md file (honor `planning.commit_docs`). Delete all
`/tmp/gsd-code-review-*-{N}.*` temp files.

## Step 5 — Present results and route

Show the consensus verdict, blocker count, and top findings. This review is
advisory — nothing is blocked — but route the suggestion by severity:

**Blockers > 0 — fix before UAT:**
- Localized fixes (single-file, clear change):
  `/gsd-fast fix the {n} blockers from the phase {N} code review`
- Structural fixes (cross-cutting, design-level):
  `/gsd-quick fix phase {N} code review blockers`
- Then re-run `/gsd-code-review {N}` to confirm clean.

**Flags only, no blockers:**
- Optional: `/gsd-fast` for the quick wins, then `/gsd-verify-work {N}`.

**Clean:**
- `/gsd-verify-work {N}` (or `--auto`) — proceed to UAT.

## Next up

- `/gsd-verify-work {N} [--auto]` — UAT, once blockers (if any) are addressed.
- `/gsd-ui-review {N}` — for frontend phases, after UAT.

Suggestions, not gates — the user decides.
