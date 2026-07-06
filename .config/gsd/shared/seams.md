# GSD Contract Seams

The mechanical map of which files must stay in agreement. When editing any file
below, check its seams and update the counterparts in the same change.
`/gsd-modify` uses this for impact analysis; `/gsd-doctor` audits each seam.
Every seam listed here had (or nearly had) a real bug at build time — this file
is the institutional memory of the 2026-07-06 adversarial verification.

Path shorthand: `skills/` = `~/.config/gsd/skills/`, `shared/` = `~/.config/gsd/shared/`.

## S1. Plan frontmatter schema

`skills/gsd-plan-phase/references/planner-prompt.md` (Step 6 schema — "field names
are the contract") ⇄ `shared/templates/plan.md` ⇄ `skills/gsd-execute-phase/SKILL.md`
(reads `wave`, `depends_on`, `files_modified`; filters `--gaps-only` on
`gap_closure: true`; greps plans for the string `security_sensitive` — the plans
use the XML-attribute form `security_sensitive="true"`, not YAML).
Also: `skills/gsd-plan-phase/references/plan-checker-prompt.md` validates the same
schema, and `skills/gsd-quick/SKILL.md` spawns the planner in quick mode.

## S2. SUMMARY contract

`skills/gsd-execute-phase/references/executor-prompt.md` (mandatory frontmatter:
`phase, plan, status, one_liner, completed, commits, key-files, decisions,
duration`) ⇄ `shared/templates/summary.md` ⇄ consumers:
- `skills/gsd-ship/SKILL.md` — PR body reads frontmatter `one_liner`
- `skills/gsd-verify-work/SKILL.md` — extracts user-observable tests + key-files
- `skills/gsd-code-review/SKILL.md` — tier-b diff fallback reads key-files
  created/modified + task-commit hashes
- `skills/gsd-progress/SKILL.md` — recent-work one-liners (has first-heading fallback)

## S3. Verification status routing

`skills/gsd-execute-phase/references/verifier-prompt.md` +
`shared/templates/verification.md` (vocabulary `passed | gaps_found | human_needed`;
`passed` requires empty human list) ⇄ consumers:
- `skills/gsd-execute-phase/SKILL.md` — routes on status; `human_needed` is
  non-blocking (invariant)
- `skills/gsd-verify-work/SKILL.md` — clean UAT sets `status: passed` +
  `human_verified` (closes the loop)
- `skills/gsd-ship/SKILL.md` — preflight requires `passed` (override allowed)
- `skills/gsd-progress/SKILL.md`, `skills/gsd-milestone/SKILL.md` — derive
  phase completeness

## S4. Reviewer registry contract

`shared/reviewers.md` (panel table + Settings + Invocation contract) ⇄
`skills/gsd-review/SKILL.md`, `skills/gsd-code-review/SKILL.md`,
`skills/gsd-ui-review/SKILL.md`. All three: derive panel/commands/timeout from the
registry (zero hardcoding — invariant); temp files
`/tmp/gsd-{kind}-prompt-{N}.md` / `/tmp/gsd-{kind}-{slug}-{N}.md` with `{kind}` =
`review` / `code-review` / `ui-review`; per-reviewer sections and score-table
columns built from the `display` column of rows actually invoked.
`bin/check` validates the table parses and CLIs exist.

## S5. Security chain

`planner-prompt.md` tags tasks `security_sensitive="true"` →
`gsd-execute-phase/SKILL.md` greps plans for `security_sensitive` → spawns
`references/security-auditor-prompt.md` → `{NN}-SECURITY.md` per
`shared/templates/security.md` with frontmatter `threats_open` (count of `open`
rows) → `skills/gsd-ship/SKILL.md` gate (`threats_open == 0`, fail-closed, no
override) → surfaced by `skills/gsd-verify-work/SKILL.md` §6 and
`skills/gsd-progress/SKILL.md` open items.

## S6. Commit-scope grep

`executor-prompt.md` commit format `{type}({NN}-{PP}): description` with
zero-padded NN ⇄ `skills/gsd-code-review/SKILL.md` tier-a diff collection
`git log --grep="({PADDED}-"`. Also relied on by conventions §5. Unscoped
quick/fast commits and `docs({NN}):` correctly do NOT match tier-a; `.planning/**`
is excluded from the reviewed diff.

## S7. Pipeline table ⇄ Next-up blocks

`shared/conventions.md` §10 ⇄ every skill's "Next up" section. Order:
discuss → [ui-phase] → plan → review → plan --reviews → execute →
code-review (optional) → verify → [ui-review] → ship. If a step is added,
removed, or reordered, update conventions §10 AND the adjacent skills' Next-up
blocks (both neighbors).

## S8. UAT gap schema

`skills/gsd-verify-work/SKILL.md` writes gaps with `root_cause` (informational) +
`artifacts` + `missing` (actionable; MUST be populated from the diagnose
subagent's FIX DIRECTION) ⇄ `shared/templates/uat.md` gap entry ⇄
`skills/gsd-verify-work/references/diagnose-prompt.md` (returns ROOT CAUSE /
EVIDENCE / FIX DIRECTION) ⇄ `planner-prompt.md` gap-closure mode (parses
`truth, reason, artifacts, missing`).
UAT status vocabulary: `in_progress | diagnosed | partial | complete` — the
skill's resume grep, creation, and completion states must match the template.

## S9. Worktree protocol

`skills/gsd-execute-phase/SKILL.md` §3 (worktree create/rescue/merge/cleanup
ordering: rescue to `.gsd-worktrees/rescue/` BEFORE merge; merge sequentially;
cleanup only after merge) ⇄ `executor-prompt.md` (worktree containment; SUMMARY
always committed in worktrees regardless of `commit_docs`).

## S10. Frontmatter → OpenCode wrappers

Every `skills/gsd-*/SKILL.md` frontmatter (`name`, `description`, `argument-hint`)
⇄ `bin/gen-opencode` output in `~/.config/opencode/command/gsd-*.md`.
Description's first sentence becomes the wrapper description. After any
frontmatter change, rerun `bin/gen-opencode`.
