# GSD Conventions

The contract shared by every gsd-* skill. Read this before doing anything else.
This file is the single source of truth for project layout, naming, commits, status
vocabularies, and the pipeline. Skills must not restate these rules — they reference them.

## 1. Project root discovery

1. `git rev-parse --show-toplevel` — if that directory contains `.planning/`, that is the project root.
2. Otherwise walk up from the current directory looking for `.planning/`.
3. If none found: stop and tell the user there is no GSD project here; suggest `/gsd-new-project`
   (or `/gsd-map-codebase` first if the directory already contains code).

## 2. The .planning/ tree

```
.planning/
├── PROJECT.md              # durable project context: what this is, core value, requirements
│                           # validated/active/out-of-scope, key decisions, current state
├── ROADMAP.md              # phase list: goal, requirements, success criteria, checkboxes
├── STATE.md                # living digest (see §6)
├── REQUIREMENTS.md         # scoped requirements with REQ-IDs
├── config.json             # workflow preferences (see §7)
├── MILESTONES.md           # one entry per completed milestone
├── codebase/               # 7 map docs: STACK, INTEGRATIONS, ARCHITECTURE, STRUCTURE,
│                           #             CONVENTIONS, TESTING, CONCERNS
├── milestones/             # archived roadmaps: v{X.Y}-ROADMAP.md
├── quick/                  # quick tasks: {seq}-{slug}/
├── debug/                  # debug sessions: {slug}.md
└── phases/{NN}-{slug}/     # per-phase artifacts:
    ├── {NN}-CONTEXT.md         # from gsd-discuss-phase
    ├── {NN}-UI-SPEC.md         # from gsd-ui-phase (frontend phases)
    ├── {NN}-RESEARCH.md        # from gsd-plan-phase --research
    ├── {NN}-{PP}-PLAN.md       # from gsd-plan-phase (one per plan)
    ├── {NN}-REVIEWS.md         # from gsd-review
    ├── {NN}-{PP}-SUMMARY.md    # from gsd-execute-phase (one per executed plan)
    ├── {NN}-SECURITY.md        # from gsd-execute-phase (security-sensitive phases only)
    ├── {NN}-VERIFICATION.md    # from gsd-execute-phase verifier
    ├── {NN}-CODE-REVIEW.md     # from gsd-code-review
    ├── {NN}-UAT.md             # from gsd-verify-work
    └── {NN}-UI-REVIEW.md       # from gsd-ui-review
```

Old GSD projects may contain extra files (VALIDATION.md, LEARNINGS.md, todos/, seeds/,
intel/, etc.). Ignore them silently — never delete, never require them.

## 3. Phase numbering

- Planned phases are integers: 1, 2, 3…
- Urgent insertions are decimals: 2.1, 2.2 — marked `(INSERTED)` in ROADMAP.md, sorted
  numerically between integers. Existing phases are NEVER renumbered.
- Padded form: zero-pad integers to 2 digits (`02`); decimals keep the dot (`02.1`).
- Phase directory: `phases/{NN}-{slug}/` where slug is kebab-case from the phase name.

## 4. Plan and summary naming

Plans within a phase are numbered `{NN}-{PP}-PLAN.md` (PP = 01, 02…). The matching
summary is `{NN}-{PP}-SUMMARY.md`. Plan ID `{NN}-{PP}` appears in commit scopes.

## 5. Commit conventions

- Code commits (executor, fast, quick): `{type}({NN}-{PP}): description`
  Types: feat, fix, test, refactor, perf, docs, style, chore.
  For quick/fast tasks without a phase: `{type}: description`.
- Planning-doc commits: `docs({NN}): description` for phase artifacts,
  `docs: description` for project-wide files.
- UAT commits: `test({NN}): complete UAT — {p} passed, {i} issues`.
- If `planning.commit_docs` is `false` in config.json: never stage anything under
  `.planning/` (code commits still happen normally).
- Stage explicitly (`git add <specific paths>`), never `git add -A` from a subagent.
- NEVER use `git clean`, `git reset --hard`, or force-push in any GSD workflow.

## 6. STATE.md

Trimmed digest, hard cap 100 lines. Frontmatter carries `status` and progress counters.
Sections: Project Reference (one-liner + PROJECT.md pointer), Current Position
(phase X of Y, status, last activity, progress bar), Accumulated Context (recent
decisions, active blockers), Quick Tasks Completed (table: # | Description | Date |
Commit | Directory), Session Continuity (what to do next).

**Disk artifacts are truth; STATE is a digest.** When STATE disagrees with what
SUMMARY/VERIFICATION files on disk say, disk wins — reconcile STATE, don't trust it.

## 7. config.json keys honored

All keys not listed here are silently ignored (this is what keeps old GSD projects
compatible — their configs carry many dead keys).

| key                       | values                | default       | meaning                                        |
|---------------------------|-----------------------|---------------|------------------------------------------------|
| `mode`                    | `interactive`, `yolo` | `interactive` | interactive = confirm before plan/execute transitions |
| `planning.commit_docs`    | bool                  | `true`        | commit .planning/ artifacts                    |
| `parallelization.enabled` | bool                  | `true`        | allow parallel plan execution within a wave    |
| `workflow.use_worktrees`  | bool                  | `true`        | isolate parallel plans in git worktrees        |
| `git.create_tag`          | bool                  | `false`       | tag on milestone completion                    |
| `branching`               | `none`, `phase`       | `none`        | `phase` = create `phase-{NN}-{slug}` branch per phase |

## 8. Status vocabularies

- VERIFICATION.md `status`: `passed` | `gaps_found` | `human_needed`.
  `passed` is only valid when the human-verification list is empty.
- UAT test results: `pass` | `issue` | `skipped` | `blocked` | `[pending]`.
  Issue severities: `blocker` | `major` | `minor` | `cosmetic` — always inferred,
  never asked.
- Review verdicts: `PASS` / `FLAG` / `BLOCK` per dimension;
  `APPROVE` / `REVISE` / `REJECT` overall.
  Consensus blocker = the same issue receives BLOCK from 2+ reviewers
  (match by file + substance, not wording).

## 9. Subagent conventions

- Spawn fresh-context subagents for heavy cognitive work (planning, executing,
  verifying, mapping, debugging). This is the core of GSD: clean context per task.
- Pass file *paths*, not file contents. Subagent prompts start with:
  "Read $HOME/.claude/skills/{skill}/references/{x}-prompt.md and follow it."
  then list the input paths and the required output path.
- Subagents write their artifacts to disk themselves (Write tool), then return a
  short confirmation — never return the artifact body in the response.
- Parallel work: launch all subagents/commands in a single message.
  In Claude Code use one background call per unit and wait for completion
  notifications — never poll. In OpenCode batch them in one parallel tool block.
- Asking the user: present 2–4 concrete options plus freeform. In Claude Code this
  maps to the question tool; anywhere else, a plain numbered list works.

## 10. Pipeline

```
/gsd-new-project            (new)  |  /gsd-map-codebase  (existing code)
        ↓
/gsd-discuss-phase N        → {NN}-CONTEXT.md
        ↓
/gsd-ui-phase N             → {NN}-UI-SPEC.md          (frontend phases only)
        ↓
/gsd-plan-phase N --research → {NN}-RESEARCH.md, {NN}-{PP}-PLAN.md
        ↓
/gsd-review N               → {NN}-REVIEWS.md          (multi-model adversarial)
        ↓
/gsd-plan-phase N --reviews  → revised plans            (repeat review until clean)
        ↓
/gsd-execute-phase N        → SUMMARYs, VERIFICATION, [SECURITY]
        ↓
/gsd-code-review N          → {NN}-CODE-REVIEW.md      (suggested, optional)
        ↓
/gsd-verify-work N --auto   → {NN}-UAT.md
        ↓
/gsd-ui-review N            → {NN}-UI-REVIEW.md        (frontend phases only)
        ↓                      fix via /gsd-fast (simple) or /gsd-quick (structural)
/gsd-ship N                 → PR
        ↓
next phase → … → /gsd-milestone complete → /gsd-milestone new
```

Anytime: `/gsd-progress` (where am I, what's next), `/gsd-phase` (roadmap CRUD),
`/gsd-fast` / `/gsd-quick` (out-of-band tasks), `/gsd-debug` (systematic debugging).

Every skill ends by suggesting the next step(s) from this table. Suggestions are
never gates — the user decides.

## 11. Shared asset paths

- This file: `$HOME/.config/gsd/shared/conventions.md`
- Reviewer registry: `$HOME/.config/gsd/shared/reviewers.md`
- Templates: `$HOME/.config/gsd/shared/templates/`
- Invariants (the "must never regress" law): `$HOME/.config/gsd/shared/invariants.md`
- Contract seams (which files must agree): `$HOME/.config/gsd/shared/seams.md`
