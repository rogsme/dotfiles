# GSD Invariants

The current law: behaviors that must never regress. Each was a deliberate decision
with a recorded rationale (see CHANGELOG.md and, historically, the retired
`~/.config/gsd-patches/gsd-customizations.md`). `/gsd-modify` refuses to silently
violate this file; `/gsd-doctor` audits against it.

**Changing an invariant requires all three:** an explicit user decision, a CHANGELOG
entry explaining what changed and why, and an edit to this file. Never silently
re-introduce a behavior this file prohibits — that exact failure caused the
2026-04-26 UAT regression in the old patch system.

## Execute-phase

- NO mandatory code-review gate. `/gsd-code-review` and `/gsd-verify-work` are
  suggested next actions only — never automatic, never blocking.
- Verifier `human_needed` is NON-BLOCKING: display the items, proceed to completion.
  It must NOT create or commit any UAT artifact — UAT belongs to `/gsd-verify-work`.
- Parallel plans within a wave run in git worktrees (`workflow.use_worktrees`,
  default true). SUMMARY rescue goes to `.gsd-worktrees/rescue/` BEFORE merging —
  copying a SUMMARY into the phase dir pre-merge aborts the merge ("untracked
  working tree files would be overwritten", even for identical copies).
- Worktree SUMMARYs are always committed regardless of `planning.commit_docs`
  (non-force `git worktree remove` fails on uncommitted files).
- Never `git clean`, `git reset --hard`, `git worktree remove --force` on a
  worktree with uncommitted work, or force-push — anywhere in GSD.

## Reviews (gsd-review, gsd-code-review, gsd-ui-review)

- The panel, commands, timeouts, and output sections derive from
  `shared/reviewers.md` at runtime. Zero hardcoded model names, commands, or
  timeouts in any skill.
- 8-dimension adversarial framework with PASS/FLAG/BLOCK per dimension (not a
  shallow checklist).
- Reviewers run IN PARALLEL (all launched in one message; wait, never poll) with
  600000ms (10-minute) timeouts — shorter timeouts killed slow models mid-response
  and produced empty output falsely marked "failed".
- Claude stays on the panel even when the host runtime is Claude Code, and is
  always last in every list/table.
- `--variant high` on all OpenCode-hosted reviewer models.
- NEVER pass `--no-input` to `claude -p` (unsupported; fails silently).
- Consensus blocker = the same issue receives BLOCK from 2+ reviewers (matched by
  file + substance, not wording).
- Failed reviewers are skipped with a note — never auto-retried, never fatal to
  the review.

## Verify-work

- `--auto` uses playwright-cli + curl. NEVER Playwright MCP (no `mcp__playwright__*`).
- Confidence-based classification: high-confidence failures (wrong status, missing
  element, 500) → `result: issue`; low-confidence (timeout, flaky selector) → stays
  `[pending]` for the interactive loop.
- Severity is inferred, never asked.
- Clean UAT closes the `human_needed` loop: update `{NN}-VERIFICATION.md` to
  `status: passed` + `human_verified: {date}` so ship/progress/milestone see the
  phase as verified.

## Ship

- Security gate: if `{NN}-SECURITY.md` exists, `threats_open` MUST be 0.
  Fail-closed (missing/non-numeric refuses too). No override.
- Verification gate (`status: passed`) allows an explicit, confirmed user override;
  the security gate does not.

## System

- `.planning/` layout stays compatible with stock GSD projects: unknown files are
  ignored silently, unknown config.json keys are ignored silently. Never delete or
  require legacy artifacts.
- Canonical files live in `~/.config/gsd/` only. `~/.claude/skills/gsd-*` are
  symlinks (`bin/sync`); runtime paths are never edited directly.
- CHANGELOG.md entries are appended at the TOP and are immutable — never edit or
  reword an existing entry.
- Existing roadmap phases are never renumbered; urgent insertions use decimal
  phases marked `(INSERTED)`.
- Subagents write artifacts to disk and return short confirmations — never the
  artifact body.
- Do not run the retired `~/.config/gsd-patches/bin/sync` — it clobbers the fork's
  generated OpenCode wrappers.
