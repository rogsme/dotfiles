# Roger's GSD

A radically simplified personal fork of [GSD](https://github.com/open-gsd/gsd-core),
rebuilt as 21 plain Claude Code Agent Skills (17 workflow + 4 maintenance). No JS
engine, no hooks, no installer, no capability system, no upstream to track. All state
operations are plain markdown reads/writes plus ordinary git, described in the skill
files themselves.

Keeps what matters:

- The **phase pipeline**: discuss → ui-phase → plan → review → execute → code-review →
  verify → ui-review → ship (see `shared/conventions.md` §10).
- **Fresh-context subagents** for heavy work (planner, executor, verifier, mappers,
  debugger) — prompts live in each skill's `references/` dir.
- The **`.planning/` layout**, byte-compatible with GSD so in-flight projects keep
  working (unknown files and config keys are ignored silently).
- The hard-won patches from the retired `gsd-patches`: 8-dimension adversarial
  multi-model review, `--auto` verification via playwright-cli/curl, cross-AI UI
  audit with severity routing, softened execute gates (non-blocking `human_needed`,
  no forced code review).
- Kept by explicit choice: git-worktree isolation for parallel plan execution, and
  the security ship gate (`threats_open == 0`, fail-closed).
- New in this fork: `/gsd-code-review` — the adversarial panel reviews the phase's
  actual git diff, not the plans.

## The pipeline

```
/gsd-new-project             (new project)  |  /gsd-map-codebase  (existing code)
        ↓
/gsd-discuss-phase N         capture decisions → CONTEXT.md
        ↓
/gsd-ui-phase N              UI design contract → UI-SPEC.md   (frontend phases)
        ↓
/gsd-plan-phase N --research plans + optional research → PLAN.md(s)
        ↓
/gsd-review N                multi-model adversarial plan review → REVIEWS.md
        ↓
/gsd-plan-phase N --reviews  incorporate findings  (repeat review until clean)
        ↓
/gsd-execute-phase N         executor subagents by wave (worktrees when parallel),
        ↓                    security audit, verifier → SUMMARYs, VERIFICATION
/gsd-code-review N           panel reviews the actual diff → CODE-REVIEW.md  (optional)
        ↓
/gsd-verify-work N --auto    UAT: playwright-cli/curl smoke + interactive → UAT.md
        ↓
/gsd-ui-review N             6-pillar audit + cross-AI panel → UI-REVIEW.md (frontend)
        ↓                    fix via /gsd-fast (simple) or /gsd-quick (structural)
/gsd-ship N                  preflight gates → PR
        ↓
next phase → … → /gsd-milestone complete → /gsd-milestone new
```

Anytime: `/gsd-progress` (where am I / what's next), `/gsd-phase` (roadmap CRUD),
`/gsd-fast` / `/gsd-quick` (out-of-band tasks), `/gsd-debug` (systematic debugging
with a persistent session file). Suggestions are never gates — the user decides.

## The 21 skills

**Project lifecycle:** `gsd-new-project`, `gsd-map-codebase`, `gsd-milestone`
(complete | new), `gsd-phase` (add | insert | remove | edit), `gsd-progress`.

**Phase pipeline:** `gsd-discuss-phase`, `gsd-ui-phase`, `gsd-plan-phase`
(`--research` / `--reviews` / `--gaps`), `gsd-review`, `gsd-execute-phase`
(`--gaps-only`), `gsd-code-review` (`--base` / `--only`), `gsd-verify-work`
(`--auto`), `gsd-ui-review`, `gsd-ship`.

**Out-of-band:** `gsd-fast` (trivial, inline), `gsd-quick` (small, plan+execute
subagents), `gsd-debug` (scientific-method debugging).

**Maintenance (manage the system itself):** `gsd-update-reviewers`, `gsd-modify`,
`gsd-doctor`, `gsd-new-skill` — see Maintenance below.

## The review panel

`shared/reviewers.md` is the single source for all three review skills
(`gsd-review`, `gsd-code-review`, `gsd-ui-review`): 8 models (6 via OpenCode's
`lazer/*` proxy + Codex CLI + Claude Opus), run in parallel with 10-minute
timeouts. Swapping a model = editing one table row (`/gsd-update-reviewers` does
it with a live probe). Consensus blocker = the same issue flagged BLOCK by 2+
reviewers. Claude stays on the panel even when Claude Code is the host, and is
always listed last.

## Layout

```
shared/conventions.md    # the contract every skill reads first (root discovery,
                         # .planning/ tree, commit format, config keys, pipeline)
shared/reviewers.md      # single-source reviewer registry (edit ONE row to swap a model)
shared/invariants.md     # the "must never regress" law — hard-won decisions;
                         # /gsd-modify guards it, /gsd-doctor audits it
shared/seams.md          # contract map S1–S10: which files must stay in agreement
shared/templates/        # artifact templates (.planning/ file formats)
skills/gsd-*/            # the 21 skills (SKILL.md + references/ subagent prompts)
bin/sync                 # symlink skills into ~/.claude/skills/
bin/check                # deployment + mechanical audits (drift, collisions, registry,
                         # frontmatter, dangling refs, hardcoded models, legacy refs)
bin/gen-opencode         # generate thin OpenCode command wrappers
CHANGELOG.md             # append-only decision history (newest on top, entries immutable)
.upstream-reference/     # gitignored copies of gsd-core + gsd-patches (read-only reference)
```

## Install

```bash
bin/sync          # symlinks skills → ~/.claude/skills/ (Claude Code picks them up)
bin/check         # should say "Status: clean"
bin/gen-opencode  # optional: /gsd-* slash commands in OpenCode
```

OpenCode also discovers the skills natively from `~/.claude/skills` (model-invoked);
the generated wrappers just add explicit slash invocation.

## Maintenance

Four skills manage the system itself (prefer them over hand-editing):

- `/gsd-update-reviewers` — add/update/remove/list/test panel models. Edits one row
  in `shared/reviewers.md` and live-probes new or changed models before saving
  (this caught three silently-dead models on day one). `test all` probes the whole
  panel in parallel.
- `/gsd-modify` — guided safe changes to any GSD file. Reads `shared/invariants.md`
  (never silently reverses a recorded decision) and `shared/seams.md` (updates every
  file that must stay in agreement), then verifies and logs the change.
- `/gsd-doctor` — health check: mechanical audit (bin/check), reviewer readiness,
  seam and invariant audits, deployment sanity. `--probe` live-tests the panel.
  Read-only; repairs only on approval.
- `/gsd-new-skill` — scaffold a new gsd-* skill following house conventions and wire
  it into the pipeline.

Hand-editing still works: canonical files here, symlinks make changes live
immediately. Log meaningful changes in `CHANGELOG.md` (append to the top, never edit
old entries), then run `bin/check`. Changing an invariant additionally requires
updating `shared/invariants.md` — that rule is the whole point.

## History

Built 2026-07-06, replacing stock gsd-core (uninstalled) and the patch overlay at
`~/.config/gsd-patches/` (retired — kept for history; **never run its `bin/sync`**,
it clobbers this fork's files). The old patch changelog's invariants and rationale
carried over into `shared/invariants.md` and `CHANGELOG.md`.
