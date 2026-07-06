---
name: gsd-execute-phase
description: Executes a phase's plans by spawning executor subagents wave by wave — in parallel git worktrees when plans are disjoint — then runs an optional security audit and a verifier, and marks the phase complete. Use when the user says "execute phase 2", "/gsd-execute-phase 3", "run the phase 4 plans", "build phase 5", or "--gaps-only" to execute only gap-closure plans. Produces {NN}-{PP}-SUMMARY.md per plan, {NN}-VERIFICATION.md, and {NN}-SECURITY.md when security-sensitive tasks exist. Verifier human_needed is non-blocking; code review and UAT are suggested next steps, never gates.
argument-hint: <phase-number> [--gaps-only]
---

Read $HOME/.config/gsd/shared/conventions.md before doing anything — it defines project-root discovery, the .planning/ tree, commit conventions, config keys, and status vocabularies.

# Execute Phase

The orchestrator coordinates, never implements. Discover plans → group into
waves → spawn executor subagents → rescue summaries → audit → verify → complete.
All code is written by executor subagents with fresh context; all state is plain
files plus ordinary git.

**Invariants (local policy — do not "improve" these back toward gates):**

- There is NO mandatory code-review gate anywhere in this workflow.
  `/gsd-code-review` is a suggested next action only.
- Verifier `human_needed` is NON-BLOCKING and creates NO UAT artifact —
  `/gsd-verify-work` owns UAT.
- Completion suggestions are exactly those in "Next up" below.

**Arguments:** phase number (required), plus `--gaps-only` — execute only plans
with `gap_closure: true` frontmatter that lack a SUMMARY.

## 1. Locate and configure

1. Discover the project root per conventions.md. No `.planning/` → stop with the
   standard suggestion.
2. Read `.planning/config.json`: `mode`, `parallelization.enabled`,
   `workflow.use_worktrees` (default `true`), `branching`, `planning.commit_docs`.
3. Read `.planning/STATE.md` and this phase's ROADMAP.md section (goal, success
   criteria). Phase not found → error, list available phases.
4. If `branching` is `phase`: ensure branch `phase-{NN}-{slug}` exists and is
   checked out (create from the current HEAD if missing). If `none`, stay put.

## 2. Discover plans

List `{phase_dir}/{NN}-*-PLAN.md` and keep those without a matching
`{NN}-{PP}-SUMMARY.md`. With `--gaps-only`, further filter to plans whose
frontmatter has `gap_closure: true`.

- **No incomplete plans:** report the phase status (all N plans have summaries /
  no plans exist yet — run `/gsd-plan-phase {N}`), point at `/gsd-progress`, and
  stop.
- Otherwise read each remaining plan's frontmatter: `wave`, `files_modified`,
  `autonomous`. Group by `wave` (missing wave = wave 1), order waves ascending;
  within a wave, order by plan number. Show the user the execution picture:
  waves, plans per wave, objectives.

Plans that already have a SUMMARY are simply skipped — re-running this skill
resumes from the first incomplete plan.

## 3. Per-wave execution strategy

For each wave in order:

- **One plan, or `parallelization.enabled` false:** run sequentially in the main
  tree (step 4, no worktree).
- **2+ plans and parallelization enabled:** compare `files_modified` pairwise.
  - Plans whose file lists **overlap** must not run concurrently — run them
    sequentially (tell the user why).
  - Plans with **disjoint** files run in parallel. If `workflow.use_worktrees`
    is true (the default), isolate each parallel plan in a git worktree per the
    protocol below. If false, parallel-safe plans still run one at a time in the
    main tree (no isolation → no true parallelism).
  - Treat a plan with missing/empty `files_modified` as overlapping everything
    (sequential, main tree) — safety fallback.

### Worktree protocol (parallel plans only)

**Setup (once per wave, before creating any worktree):**

- Require a clean tree: dirty **tracked** files → stop and ask the user
  (commit/stash first, or run this wave sequentially). Untracked files are OK.
- Ensure `.gsd-worktrees/` is listed in `.git/info/exclude` (append if absent).
- Record the current HEAD SHA — every worktree in the wave forks from it.

**Per parallel plan:**

```bash
git worktree add .gsd-worktrees/{NN}-{PP} -b gsd/{NN}-{PP} HEAD
```

Pass the **absolute** worktree path to that plan's executor; it must do all its
work inside that path and nowhere else.

**After each executor finishes (before ANY worktree removal):**

1. Verify `{NN}-{PP}-SUMMARY.md` exists **inside the worktree's**
   `.planning/phases/{NN}-{slug}/`. Missing → treat the plan as failed (step 4's
   failure handling); do not merge.
2. Copy/rescue the SUMMARY to `.gsd-worktrees/rescue/{NN}-{PP}-SUMMARY.md` in
   the main tree (create the dir if needed) — worktrees must never be removed
   while they hold the only copy of a SUMMARY (upstream lost summaries by
   removing first). Do NOT copy it into the main tree's phase dir yet: an
   untracked copy there makes git abort the merge with "untracked working tree
   files would be overwritten by merge", even when the copies are identical.

**Merge (after all executors in the wave return), sequentially in plan order,
from the main tree:**

```bash
git merge gsd/{NN}-{PP}
```

These are disjoint-file plans, so a conflict means `files_modified` was wrong —
**stop and ask the user** rather than resolving silently (options: inspect the
worktree, merge manually, skip this plan).

**Cleanup, only after that plan's merge succeeded:**

```bash
git worktree remove .gsd-worktrees/{NN}-{PP}
git branch -d gsd/{NN}-{PP}
```

- NEVER `git worktree remove --force` a worktree that still has uncommitted
  work — inspect or rescue it first, or leave it in place and tell the user.
- NEVER `git clean`, `git reset --hard`, or force-push (conventions.md §5).
- A failed/unmerged plan's worktree stays on disk for inspection; report its
  path.

**After ALL merges for the wave succeed:** the merges themselves bring each
SUMMARY into the phase dir. For any plan whose SUMMARY is still missing there
(a failed or aborted worktree/merge), copy the rescued copy from
`.gsd-worktrees/rescue/` into the phase dir — the rescue is the fallback, never
the primary path.

Sequential plans (and everything when `use_worktrees` is false) run in the main
tree directly — no worktree, no merge step.

## 4. Spawn executors

One executor subagent per plan:

> Read $HOME/.claude/skills/gsd-execute-phase/references/executor-prompt.md and
> follow it.
>
> Plan: {absolute path to {NN}-{PP}-PLAN.md}.
> Project context: {absolute paths to .planning/PROJECT.md and .planning/STATE.md}.
> Summary template: $HOME/.config/gsd/shared/templates/summary.md
> commit_docs: {value of planning.commit_docs from config}
> {If worktree:} Worktree: {absolute worktree path} — work ONLY inside this
> directory; commit everything, including your SUMMARY.md, before returning.
> ALWAYS commit your SUMMARY.md even if commit_docs is false — a non-force
> `git worktree remove` fails on uncommitted files, and the rescue+merge
> handles the file. Do not touch STATE.md or ROADMAP.md — the orchestrator
> owns those.

(Keep it simple: worktree SUMMARYs are always committed — do not try to strip
the SUMMARY docs-commit from the merged history when `commit_docs` is false;
main-tree executors honor `commit_docs` as usual.)

- **Parallel plans:** launch all executor spawns for the wave in a single
  message, then wait for their completion notifications — never poll.
- **Sequential plans:** spawn one, wait, then the next.

**Handle executor returns:**

- **Done** — confirm the SUMMARY exists (rescue from worktree per step 3), move on.
- **`checkpoint:human-verify`** (plan paused at a human checkpoint) — relay the
  executor's checkpoint details to the user verbatim, collect their response,
  then respawn the executor with the same inputs plus the checkpoint state and
  user response so it resumes where it stopped. Other parallel executors may
  finish meanwhile; handle the checkpoint, then wait for the full wave.
- **Failed** (error, or no SUMMARY produced) — report what happened and ask the
  user: **retry** the plan / **skip** it (phase continues, plan stays
  incomplete) / **abort** phase execution (record partial progress).

## 5. After each wave

Confirm on disk that every executed plan's `{NN}-{PP}-SUMMARY.md` exists in the
main tree's phase dir — the wave's merges normally bring them in; fall back to
the `.gsd-worktrees/rescue/` copies per step 3 if any are missing — before
starting the next wave. Then repeat step 3 for the next wave.

## 6. Security audit (conditional)

Grep the executed plan files for the string `security_sensitive` — either
notation counts (the XML attribute `security_sensitive="true"` on `<task>`
elements, or the YAML form `security_sensitive: true`).

- **None:** skip silently.
- **Any:** spawn a security-auditor subagent:

  > Read $HOME/.claude/skills/gsd-execute-phase/references/security-auditor-prompt.md
  > and follow it.
  >
  > Phase: {N} — {name}. Audit the work of these plans: {plan + summary paths for
  > the security-sensitive plans}.
  > Output: write `{phase_dir}/{NN}-SECURITY.md` with a `threats_open`
  > frontmatter count that accurately reflects the open threats listed inside.

  Report the result. Open threats are surfaced to the user (and to
  `/gsd-plan-phase {N} --gaps` if they warrant fixes) — they inform, they don't
  gate.

## 7. Verify

Spawn a verifier subagent:

> Read $HOME/.claude/skills/gsd-execute-phase/references/verifier-prompt.md and
> follow it.
>
> Phase: {N} — {name}. Phase goal: {from ROADMAP.md}.
> Roadmap: {absolute path to .planning/ROADMAP.md} — this phase's success
> criteria live there.
> Inputs: all `{NN}-*-PLAN.md` (must_haves) and `{NN}-*-SUMMARY.md` in
> {phase_dir}.
> Verification template: $HOME/.config/gsd/shared/templates/verification.md
> Output: write `{phase_dir}/{NN}-VERIFICATION.md` with frontmatter `status:`
> one of passed | gaps_found | human_needed.

Route on the resulting `status`:

- **`passed`** → proceed to step 8.
- **`human_needed`** → NON-BLOCKING. Display the human-verification items, note
  that they are recorded in VERIFICATION.md and that `/gsd-verify-work {N}`
  handles human verification when the user is ready, then PROCEED to step 8.
  Do NOT create any UAT artifact. Do NOT wait for approval.
- **`gaps_found`** → the phase stays incomplete. Present the gaps and the
  verified/total must-have score, point at the full report, and suggest
  `/gsd-plan-phase {N} --gaps` (then `/gsd-execute-phase {N} --gaps-only`).
  Skip step 8; still commit VERIFICATION.md (honoring `planning.commit_docs`)
  as `docs({NN}): phase verification found gaps`.

## 8. Completion (status passed or human_needed)

1. In `.planning/ROADMAP.md`: tick this phase's checkbox and its plan
   checkboxes.
2. Update `.planning/STATE.md`: current position (next phase), progress
   counters, and fold notable decisions/deviations from the SUMMARYs into
   Accumulated Context. Keep it under the 100-line cap; disk artifacts are
   truth.
3. Update the current-state line in `.planning/PROJECT.md`.
4. Honoring `planning.commit_docs`, stage ROADMAP.md, STATE.md, PROJECT.md, and
   the phase's VERIFICATION.md (plus SECURITY.md if written) explicitly and
   commit:

```
docs({NN}): complete phase execution
```

Then report: plans executed, waves run, verifier status, any human-verify items
or open security threats, and the artifact paths.

## Next up

- `/gsd-code-review {N}` — adversarial multi-model review of the phase diff
  (suggested, optional).
- `/gsd-verify-work {N} [--auto]` — UAT / manual testing (suggested, optional).
- `/gsd-discuss-phase {next}` — start the next phase (recommended), or
  `/gsd-plan-phase {next}` if the next phase already has CONTEXT.md.
- `/gsd-progress` anytime — where am I, what's next.

Suggestions, not gates — the user decides.
