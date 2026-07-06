# Changelog

Append new entries to the top. Never edit or alter existing entries — they are
immutable history. Format: date heading, files modified, What changed, Why.

## 2026-07-06 — Swap codex row from Codex CLI to GPT-5.5 via OpenCode

**Files modified:** shared/reviewers.md

### What changed
Updated the `codex` reviewer row: `codex exec --skip-git-repo-check …` (Codex CLI) →
`opencode run -m lazer/gpt-5.5 --variant high …` (standard OpenCode template);
display name Codex → GPT-5.5. Live probe passed (replied "OK"; first attempt failed
server-side, succeeded on retry once lazer exposed the model).
Still 8 total reviewers (7 via OpenCode + Claude Opus).

### Why
Codex is no longer used via `codex exec`; the lazer provider now hosts GPT-5.5,
so this reviewer runs through OpenCode like the rest of the panel.

## 2026-07-06 — Maintenance skills + refresh stale reviewer models

**Files modified:** skills/gsd-update-reviewers/, skills/gsd-modify/, skills/gsd-doctor/,
skills/gsd-new-skill/, shared/invariants.md (new), shared/seams.md (new),
shared/reviewers.md, shared/conventions.md, bin/check, README.md

### What changed

- Added four maintenance skills: `/gsd-update-reviewers` (registry ops with live
  model probing), `/gsd-modify` (decision-aware guided edits), `/gsd-doctor`
  (health audit), `/gsd-new-skill` (scaffolder).
- Promoted the "must never regress" list to `shared/invariants.md` and the
  contract map to `shared/seams.md` — first-class law + seam registry that
  gsd-modify guards and gsd-doctor audits.
- Extended `bin/check` with mechanical audits: frontmatter validity, referenced
  prompts/templates exist, no hardcoded models in review skills, no legacy engine
  refs, shared docs present.
- Refreshed three stale reviewer model IDs caught by the new live probe
  (the lazer proxy retired them since the June rebase): minimax
  `lazer/minimax-m2.7` → `lazer/minimax-m3`, kimi `lazer/kimi-2.6` →
  `lazer/kimi-2.7-code`, glm-5 `lazer/glm-5.1` → `lazer/glm-5.2`. All three
  successors probed OK (variant high, <90s). Still 8 total reviewers
  (6 via OpenCode + Codex CLI + Claude Opus).

### Why

The fork needs safe ways to evolve without the old 14-touch-point pain or the
silent-decision-reversal failure mode (2026-04-26 UAT regression). The probe
requirement proved itself immediately: three panel models had been silently dead —
reviews would have run with a 5-model panel while reporting 8.

## 2026-07-06 — Initial build

**Files:** everything.

**What changed:** Built Roger's GSD from scratch: 17 skills, shared conventions,
reviewer registry, templates, bin/sync + bin/check + bin/gen-opencode.

**Why:** GSD-core became too heavy (74 commands, 149KB JS engine, capability system,
constant upstream churn requiring painful patch rebases). This fork keeps only the
pipeline actually used, ports the four hard-won patches from `~/.config/gsd-patches`
(multi-model adversarial review, --auto verify via playwright-cli/curl, cross-AI UI
audit, softened execute gates) as first-class behavior, and adds `/gsd-code-review`
(adversarial panel on the phase's actual diff). Reviewer panel is now a single
registry file (`shared/reviewers.md`) instead of 14 touch-points across 5 files.
Decisions carried over from the gsd-patches changelog: parallel reviewers with 10-min
timeouts and `--variant high`; keep Claude on the panel even when hosted in Claude
Code; never `--no-input` on `claude -p`; playwright-cli over Playwright MCP;
non-blocking `human_needed` with no UAT artifact; no mandatory code-review gate.
Kept per explicit decision: git-worktree isolation for parallel plan execution;
the security ship gate (SECURITY.md `threats_open == 0`).
