# GSD Customizations

Local patches applied to GSD workflows. These files get wiped on `/gsd:update` —
the installer backs them up to `gsd-local-patches/` and they can be reapplied with
`/gsd:reapply-patches`. This file tracks what was changed and why so patches can be
recreated if needed.

---

## 2026-07-06 — Retired: superseded by Roger's GSD fork

**GSD version:** n/a (stock GSD uninstalled from both runtimes)
**Files modified:** none (closing entry)

### What changed

This patch set is retired. All customizations now live as first-class behavior in
**Roger's GSD** — a simplified personal fork rebuilt as plain Claude Code skills at
`~/.config/gsd/` (deployed via `~/.config/gsd/bin/sync`, verified with `bin/check`).
Every invariant recorded in this changelog was carried over: the 8-dimension parallel
adversarial review (10-min timeouts, `--variant high`, no `--no-input`, Claude kept on
the panel), `--auto` verify via playwright-cli + curl with confidence classification,
cross-AI UI review with severity routing, and the softened execute-phase gates
(non-blocking `human_needed`, no UAT artifact, no mandatory code-review gate).
The reviewer panel is now a single registry file (`~/.config/gsd/shared/reviewers.md`)
instead of the 14 touch-points documented in gsd-update-reviewers.

Do NOT run `bin/sync` from this directory anymore — its targets no longer exist and it
would clobber the fork's generated OpenCode wrappers (`gsd-review.md`,
`gsd-verify-work.md` in `~/.config/opencode/command/`). Kept for history only.

---

## 2026-06-17 — Rebase all patches onto GSD Core v1.4.5

**GSD version:** 1.4.5
**Files modified:** claude/workflows/{execute-phase,review,ui-review,verify-work}.md, opencode/workflows/{execute-phase,review,ui-review,verify-work}.md, claude/skills/gsd-review/SKILL.md, claude/skills/gsd-verify-work/SKILL.md, opencode/command/gsd-review.md, opencode/command/gsd-verify-work.md, bin/sync, bin/check, .claude/skills/gsd-patch-upgrade/references/patch-update-workflow.md

### What changed

Re-ported all customizations onto fresh v1.4.5 upstream (the v1.38.3 base was gone — reconstructed each customization from our prior canonical files + the gsd-local-patches backup, then re-applied onto v1.4.5).

- **execute-phase.md** — re-applied gate-softening onto v1.4.5: `code_review_gate` made non-mandatory (suggested next action only); `human_needed` now non-blocking and does NOT create a UAT artifact; `/gsd-code-review` + `/gsd-verify-work` offered as optional next actions. Diff vs v1.4.5 is localized to those gates (+16/-91); all v1.4.5 scaffolding (gsd-tools shim, wave/checkpoint logic) preserved.
- **review.md** — re-applied 8-dimension adversarial framework, parallel reviewer execution (Claude: `run_in_background`; OpenCode: `multi_tool_use.parallel`), self-CLI independence logic, and the current reviewer set with verified model IDs: `lazer/gemini-3.1-pro`, `lazer/minimax-m2.7`, `lazer/kimi-2.6`, `lazer/glm-5.1`, `lazer/qwen-3.6-plus`, `lazer/deepseek-v4-pro`, plus Codex CLI and Claude Opus (8 total). v1.4.5's gsd-tools shim/scaffolding kept.
- **ui-review.md** — re-grafted cross-AI UI perspectives (CLI availability, independent-perspective prompt, score comparison + score-disagreement routing) additively onto v1.4.5; all original sections preserved.
- **verify-work.md** — replaced v1.4.5's Playwright-MCP verification (0 MCP refs remain) with our `--auto` CLI auto-verify (playwright-cli + curl), kept the security enforcement gate and text-mode support; runtime variants correctly diverge (Claude AskUserQuestion vs OpenCode `question`).
- **skills/commands** — rebased gsd-review + gsd-verify-work onto v1.4.5 conventions: adopted `requires:` frontmatter, `Task`→`Agent` tool (claude) / `task:`→`agent:` (opencode), `--ws` flag, and gsd-core execution_context paths. Brought the Claude gsd-review skill up to the current reviewer set (added `--qwen`/`--deepseek`, updated M2.7/Kimi 2.6/Qwen 3.6 Plus/DeepSeek V4 Pro labels — it had lagged the OpenCode command since April 11). Kept `--auto` on gsd-verify-work.
- **patch-update-workflow.md** — confirmed the upstream repo layout assumption (source is `gsd-core/workflows/*` + `commands/gsd/*`); updated the migration note.
- `bin/sync` + `bin/check`: no path changes here (done in the prior entry); update.md/quick.md entries already removed.

### Why

GSD Core v1.4.5 rebranded with a renamed runtime dir and reset versioning, and substantially rewrote the patched files (execute-phase ~doubled, review ~tripled), so the prior v1.38.3 patches could not be synced as-is without reverting upstream improvements. Each customization was re-applied onto the v1.4.5 base. Verified per file by diffing the rebased output against pristine v1.4.5 (isolating exactly the re-applied customization) and against the April-24 gsd-local-patches backup (confirming no customization was lost). `bin/sync all` + `bin/check all` → clean. Patch base is now v1.4.5; future upgrades follow the normal version-progression path.

---

## 2026-06-17 — Migrate runtime paths to gsd-core (GSD Core v1.4.5 rebrand)

**GSD version:** 1.38.3 (patch content base — workflow patches NOT yet rebased onto v1.4.5)
**Files modified:** bin/sync, bin/check, CLAUDE.md, .claude/skills/gsd-update-reviewers/SKILL.md, .claude/skills/gsd-patch-upgrade/references/patch-update-workflow.md

### What changed

- GSD Core v1.4.5 renamed the runtime install directory `get-shit-done/` → `gsd-core/` (upstream #604) for both runtimes. Repointed all deploy targets accordingly:
  - `bin/sync` + `bin/check`: 12 workflow targets and the 2 VERSION-file paths now point at `~/.claude/gsd-core/...` and `~/.config/opencode/gsd-core/...`.
  - `CLAUDE.md`: runtime install paths and Version Tracking paths updated to `gsd-core`.
  - `gsd-update-reviewers/SKILL.md`: VERSION cat path updated to `gsd-core`.
  - `patch-upgrade/references/patch-update-workflow.md`: runtime-target paths updated (verified on disk); upstream-source paths repointed `get-shit-done/…` → `gsd-core/…` on assumption (flagged for verification); added a migration callout. The `/tmp/get-shit-done` clone-dir name left as-is (arbitrary temp path).
- Removed the stale, empty `~/.config/opencode/get-shit-done/` directory tree the installer left behind (Claude's old dir was already fully removed; 0 files in either).
- Skills/command deploy targets (`~/.claude/skills/gsd-*`, `~/.config/opencode/command/gsd-*`) were unchanged by the rebrand and need no path edits.

### Why

The installer (`npx @opengsd/gsd-core@latest`, v1.4.5) renamed the runtime dir and deleted the old `get-shit-done/` tree. Our sync/check targeted the old paths, so a sync would have recreated a ghost `get-shit-done/` dir the runtime no longer reads. Paths now point at the live `gsd-core/` tree.

**NOT done — workflow patch content rebase is still pending.** GSD Core v1.4.5 is a rebrand with reset versioning (old line ended v1.38.3; new line restarts v1.4.5) and the 6 patched workflow files diverge from our v1.38.3 canonical versions by 297–1059 lines each. Running `bin/sync` now would overwrite v1.4.5 upstream content with stale v1.38.3 content. The patches must be re-ported onto v1.4.5 via the gsd-patch-upgrade flow (which itself needs updating — see the migration callout in patch-update-workflow.md) before any sync. The `**GSD version:**` field above is intentionally kept at 1.38.3 so the patch-upgrade base detection still triggers a rebase.

---

## 2026-06-17 — Repoint GSD upstream repo to open-gsd/gsd-core

**GSD version:** 1.38.3
**Files modified:** .claude/skills/gsd-patch-upgrade/references/patch-update-workflow.md, claude/workflows/update.md (new patch), opencode/workflows/update.md (new patch), claude/workflows/quick.md (new patch), opencode/workflows/quick.md (new patch), bin/sync, bin/check

### What changed

- Updated the upstream clone URL in the gsd-patch-upgrade reference from `git@github.com:gsd-build/get-shit-done.git` to `git@github.com:open-gsd/gsd-core.git`.
- Added `workflows/update.md` to the canonical patch set for both runtimes (separate Claude/OpenCode variants, snapshotted from current runtime), with the "View full changelog" link repointed to `https://github.com/open-gsd/gsd-core/blob/main/CHANGELOG.md`.
- Added `workflows/quick.md` to the canonical patch set for both runtimes, replacing the old SDK install command `npm install -g @gsd-build/sdk` with `npx @opengsd/gsd-core@latest` (note: npm scope is `@opengsd`, distinct from the `open-gsd` GitHub org).
- Registered the four new overlays (`update.md` + `quick.md`, both runtimes) in `bin/sync` and `bin/check`.

### Why

GSD's upstream moved from `gsd-build/get-shit-done` to `open-gsd/gsd-core` (the previous maintainer abandoned the project). The clone URL in the patch-upgrade tooling is functional and would otherwise fail; the changelog link in update.md is now patched so it survives future updates rather than pointing users at the dead repo.

Note: `references/thinking-models-*.md` still cite `github.com/mattnowdev/thinking-partner` — intentionally left unchanged, as that is a third-party model catalog attribution, not GSD's repository.

---

## 2026-04-27 — Enforce immutable changelog entries, append-only

**GSD version:** 1.38.3
**Files modified:** CLAUDE.md

### What changed

- Added explicit rule to Edit Rules section: new changelog entries must always be appended at the top; existing entries are immutable history and must never be edited or altered.
- Added format guidance referencing the existing entry convention (date heading, GSD version, files modified, What changed, Why).

### Why

A past edit mistakenly changed an old changelog entry's text instead of adding a new one, corrupting the historical record. The instruction was implied but not stated, so models without explicit guidance defaulted to modifying rather than appending.

---

## 2026-04-27 — Upgrade DeepSeek reviewer model to V4 Pro

**GSD version:** 1.38.3
**Files modified:** claude/workflows/review.md, claude/workflows/ui-review.md, opencode/workflows/review.md, opencode/workflows/ui-review.md, opencode/command/gsd-review.md

### What changed

- Upgraded DeepSeek from `lazer/deepseek-v3.2` to `lazer/deepseek-v4-pro`
- Updated model ID and display name across review and ui-review workflows for both runtimes
- Updated command help text in opencode/command/gsd-review.md

### Why

DeepSeek V4 Pro offers improved reasoning and code review capabilities over V3.2.

---

## 2026-04-26 — Add decision-awareness guard to patch upgrade workflow

**GSD version:** 1.38.3
**Files modified:** .claude/skills/gsd-patch-upgrade/references/patch-update-workflow.md, README.md, references/file-map.md

### What changed

- Added Phase 1.5 (mandatory) to patch-update-workflow: read `gsd-customizations.md` end-to-end before analyzing upstream changes, extract active local decisions, summarize them for context
- Added "Decision-awareness rule": any upstream change that reverses an active local decision must be classified as CONFLICT (not ADOPT) and presented to the user
- Added `execute-phase.md` to "What we patch" section, upstream diff checklist, and mapping table
- Added execute-phase active invariants: no mandatory `code_review_gate`, `human_needed` must not block or create UAT artifacts, UAT belongs to `/gsd-verify-work`
- Added review/ui-review/verify-work active invariants for completeness
- Added execute-phase to README.md managed files and file-map.md canonical/runtime targets

### Why

The 2026-04-26 UAT regression happened because the patch upgrade process had no step to read
local decisions before applying upstream changes. The agent adopted upstream's `human_needed`
UAT-creation behavior without checking that we had explicitly removed it. Making decision-loading
mandatory before diff analysis prevents this class of regression.

---

## 2026-04-24 — Update adversarial reviewer models + add Qwen, DeepSeek

**GSD version:** 1.38.2
**Files modified:** claude/workflows/review.md, claude/workflows/ui-review.md, opencode/workflows/review.md, opencode/workflows/ui-review.md, opencode/command/gsd-review.md

### What changed

- Upgraded MiniMax from `lazer/minimax-m2.5` to `lazer/minimax-m2.7`
- Upgraded Kimi from `lazer/kimi-2.5` to `lazer/kimi-2.6`
- Added new reviewer: Qwen 3.6 Plus (`lazer/qwen-3.6-plus`, flag: `--qwen`)
- Added new reviewer: DeepSeek V3.2 (`lazer/deepseek-v3.2`, flag: `--deepseek`)
- Now 8 total reviewers (6 OpenCode + Codex CLI + Claude Opus)
- Updated all invocation blocks, status displays, output templates, reviewer lists, and score comparison tables across both runtimes

### Why

Model upgrades for MiniMax and Kimi. Qwen 3.6 Plus and DeepSeek V3.2 add independent perspectives to the adversarial review set.

---

## 2026-04-24 — Adopt upstream v1.38.2 infrastructure changes

**GSD version:** 1.38.2
**Files modified:** claude/workflows/review.md, claude/workflows/ui-review.md, claude/workflows/verify-work.md, opencode/workflows/review.md, opencode/workflows/ui-review.md, opencode/workflows/verify-work.md

### What changed

- Migrated all `node "$HOME/...gsd-tools.cjs"` calls to `gsd-sdk query` across all 6 workflow files
  - `init phase-op` → `init.phase-op`, `init verify-work` → `init.verify-work`
  - `agent-skills`, `resolve-model`, `config-get`, `uat render-checkpoint` → `gsd-sdk query` equivalents
  - `commit "msg" --files path` → `commit "msg" path` (positional file args)
- Removed `| head -5` truncation from UAT file listing in verify-work (bug fix #2172)
- Added `scan_phase_artifacts` step to verify-work (both runtimes) — runs `audit-open` to surface open UAT/verification/context items before marking phase verified
- Updated Next Up block in verify-work to include project identity: `[${PROJECT_CODE}] ${PROJECT_TITLE}`
- Skipped: Cursor CLI self-detection ($CURSOR_SESSION_ID) — we don't use SELF_CLI
- Skipped: Qwen/Cursor reviewer sections in REVIEWS.md template — we have our own reviewer set

### Why

GSD v1.36.0–v1.38.2 migrated all plumbing calls from raw `gsd-tools.cjs` to the typed `gsd-sdk query` CLI. Our patches needed to follow to stay compatible. The `audit-open` artifact scan and project identity in Next Up blocks are useful safety/UX improvements that don't conflict with our customizations.

---

## 2026-04-11 — Rebase patches on GSD v1.35.0 + migrate to skills

**GSD version:** 1.35.0
**Files modified:** All patch files, bin/sync, bin/check

### What changed

- Migrated Claude commands from `commands/gsd/*.md` to `skills/gsd-*/SKILL.md` format
  - `gsd:review` → `gsd-review`, `gsd:verify-work` → `gsd-verify-work`
  - Sync targets: `~/.claude/skills/gsd-*/SKILL.md` instead of `~/.claude/commands/gsd/`
- Removed create-cli workflow and command (deleted from project)
- Added security enforcement gate (SECURITY.md + auto-transition) to verify-work complete_session
- Added text mode support (plain-text AskUserQuestion fallback) to all workflows for both runtimes
- Preserved: 8-dim adversarial review, parallel execution, cross-AI UI perspectives,
  CLI-based auto-verify, custom reviewer set, minimum-reviewer guard
- Intentionally kept Claude as reviewer when running inside Claude Code (no SELF_CLI skip)

### Why

GSD v1.35.0 moved Claude commands to the skills system (skills/gsd-*/SKILL.md). Our patches
must follow to avoid conflicts with the upstream installer. Also adopted security gates and
text mode support. Skipped Playwright-MCP (our playwright-cli is better), SELF_CLI skip
(we want Claude's external perspective), and new CLI flags (not needed for our reviewer set).

---

## 2026-04-11 — Remap OpenCode reviewer models to new lazer IDs

**GSD version:** 1.30.0
**Files modified:** `claude/workflows/review.md`, `claude/workflows/ui-review.md`, `claude/commands/review.md`, `opencode/workflows/review.md`, `opencode/workflows/ui-review.md`, `opencode/command/gsd-review.md`, `gsd-customizations.md`

### What changed

- Updated the OpenCode reviewer model IDs from DeepInfra-prefixed IDs to the newer direct lazer IDs:
  - `minimax` → `lazer/minimax-m2.5`
  - `kimi` → `lazer/kimi-2.5`
  - `glm-5` → `lazer/glm-5.1`
- Refreshed review and UI-review labels to mention `Kimi 2.5` and `GLM-5.1`
- Kept reviewer flags stable (`--minimax`, `--kimi`, `--glm-5`) so existing commands do not change

### Why

OpenCode now exposes these reviewer slots under the newer lazer model IDs. Updating the canonical
patches keeps both runtimes aligned with the current model naming while preserving the existing
workflow interface.

---

## 2026-04-08 — Make reviewer waiting strategy runtime-specific

**GSD version:** 1.30.0
**Files modified:** `claude/workflows/review.md`, `claude/workflows/ui-review.md`, `opencode/workflows/review.md`, `opencode/workflows/ui-review.md`

### What changed

- Added explicit waiting instructions after reviewer CLI launch examples in both review workflows
- Documented Claude-specific waiting: background Bash calls with `run_in_background: true`, then wait for completion notifications before reading outputs
- Documented OpenCode-specific waiting: launch reviewer Bash calls in one `multi_tool_use.parallel` batch, then read each output file once after the batch returns
- Replaced the old `> 0 lines` success check with guidance to validate meaningful output and treat line count as a secondary signal

### Why

Claude Code and OpenCode expose different shell execution models.

- Claude Code guidance can rely on background Bash jobs and completion notifications
- OpenCode guidance should rely on `multi_tool_use.parallel`, which already waits for all Bash calls to finish

The workflows should describe the correct non-polling waiting pattern for each runtime so agents
do not waste tool calls polling partial files or using runtime-specific features in the wrong
environment.

---

## 2026-04-08 — Re-enable quiet reviewer commands after CLI regression testing

**GSD version:** 1.30.0
**Files modified:** `claude/workflows/review.md`, `claude/workflows/ui-review.md`, `opencode/workflows/review.md`, `opencode/workflows/ui-review.md`

### What changed

- Replaced the stale "do not use `2>/dev/null`" warning in review and UI-review workflows
- Restored `2>/dev/null` on `gemini`, `codex`, and `opencode` reviewer commands so reviewer output files stay clean
- Left the `claude -p` reviewer command unchanged pending separate validation

### Why

Current local CLI versions no longer reproduce the old stderr-suppression hang:

- `gemini 0.36.0`
- `codex-cli 0.118.0`
- `opencode 1.4.0`

Both smoke tests and realistic review-prompt runs completed successfully with `2>/dev/null` and
with `2>file`. Stdout stayed clean markdown while stderr contained only startup/progress noise.

This supersedes the older 2026-03-30 guidance for these reviewer CLIs.

---

## 2026-04-07 — Roll back GLM reviewer from 5.1 to 5 (Claude + OpenCode)

**GSD version:** 1.30.0
**Files modified:** `claude/workflows/review.md`, `claude/workflows/ui-review.md`, `claude/commands/review.md`, `opencode/workflows/review.md`, `opencode/workflows/ui-review.md`, `opencode/command/gsd-review.md`

### What changed

- Reverted GLM model ID from `lazer/deepinfra/zai-org/GLM-5.1` to `lazer/deepinfra/zai-org/GLM-5`
- Reverted reviewer labels in workflow docs and output templates from `GLM-5.1` to `GLM-5`
- Reverted reviewer flag from `--glm-5.1` back to `--glm-5`

### Why

OpenCode currently has a bug with GLM-5.1 in this workflow path. Rolling back to GLM-5 restores
stable reviewer execution while keeping the same reviewer slot and output structure.

---

## 2026-04-07 — Upgrade GLM reviewer from 5 to 5.1 (Claude + OpenCode)

**GSD version:** 1.30.0
**Files modified:** `claude/workflows/review.md`, `claude/workflows/ui-review.md`, `claude/commands/review.md`, `opencode/workflows/review.md`, `opencode/workflows/ui-review.md`, `opencode/command/gsd-review.md`

### What changed

- Updated GLM model ID from `lazer/deepinfra/zai-org/GLM-5` to `lazer/deepinfra/zai-org/GLM-5.1`
- Updated reviewer labels in workflow docs and output templates from `GLM-5` to `GLM-5.1`
- Renamed reviewer flag from `--glm-5` to `--glm-5.1`

### Why

GLM-5.1 supersedes GLM-5. This keeps both Claude and OpenCode adversarial-review flows aligned
to the new model and updates reviewer flag naming for clarity.

---

## 2026-04-07 — Mirror reviewer set changes to Claude canonical files

**GSD version:** 1.30.0
**Files modified:** `claude/workflows/review.md`, `claude/workflows/ui-review.md`, `claude/commands/review.md`

### What changed

- Removed GPT-5.4 reviewer references from Claude-side `/gsd:review` and `/gsd:ui-review`
- Replaced OpenCode Gemini reviewer slot with standalone `gemini` CLI invocations
- Added standalone `codex` CLI reviewer invocations and output sections
- Updated Claude command flag docs to `--gemini` and `--codex`
- Kept OpenCode model reviewers on Claude side: `minimax`, `kimi`, `glm-5`

### Why

Claude and OpenCode canonical workflows should stay aligned for reviewer composition. This
keeps reviewer provenance consistent and avoids duplicate OpenAI coverage now that Codex
is the dedicated OpenAI reviewer.

---

## 2026-04-07 — Remove GPT-5.4 reviewer from OpenCode workflows

**GSD version:** 1.30.0
**Files modified:** `get-shit-done/workflows/review.md`, `get-shit-done/workflows/ui-review.md`, `commands/gsd/review.md`

### What changed

- Removed GPT-5.4 as an OpenCode reviewer in `/gsd-review`
- Removed `--gpt-5.4` flag from OpenCode `gsd-review` command docs
- Updated review output templates and UI score comparison tables to drop GPT-5.4 columns/sections
- Kept separate `gemini` and `codex` CLI reviewers and the OpenCode model reviewers (`minimax`, `kimi`, `glm-5`)

### Why

Codex already covers the OpenAI review role. Removing the separate GPT-5.4 reviewer reduces
duplication while keeping broad adversarial coverage across independent CLIs and non-OpenAI
OpenCode models.

---

## 2026-04-07 — Add Gemini CLI and Codex CLI alongside OpenCode adversarial reviewers

**GSD version:** 1.30.0
**Files modified:** `get-shit-done/workflows/review.md`, `get-shit-done/workflows/ui-review.md`, `commands/gsd/review.md`

### What changed

- Kept the added OpenCode reviewers: `gpt-5.4`, `minimax`, `kimi`, and `glm-5`
- Added `gemini` as a separate Gemini CLI reviewer instead of routing Gemini through `opencode run`
- Added `codex` as a separate Codex CLI reviewer instead of treating OpenCode-hosted models as the Codex slot
- Updated `review.md` CLI detection, flags, invocation examples, progress output, and `REVIEWS.md` template
- Updated `ui-review.md` cross-AI reviewer detection, invocation examples, progress output, appended sections, and score comparison table
- Updated `commands/gsd/review.md` flags and objective text to match the new reviewer set

### Why

Upstream GSD uses dedicated Gemini and Codex CLIs for those reviewer roles. Keeping the extra
OpenCode reviewers provides broader adversarial coverage, but restoring Gemini and Codex as their
own CLIs aligns the workflow with the original tool boundaries and makes reviewer provenance
clearer in the output.

---

## 2026-03-30 — Fix opencode hangs (remove 2>/dev/null), run reviewers in parallel

**GSD version:** 1.30.0
**Files modified:** `get-shit-done/workflows/review.md`, `get-shit-done/workflows/ui-review.md`

### What changed

- **Both `review.md` and `ui-review.md`:**
  - Removed `2>/dev/null` from all `opencode run` and `claude -p` invocation commands
  - Removed `--no-input` flag from `claude -p` (not a valid flag)
  - Changed reviewer invocation from **sequential** to **parallel** (all 6 reviewers run
    simultaneously via separate Bash tool calls in a single message)
  - Updated progress display to show line counts per reviewer
  - Added IMPORTANT comments warning against `2>/dev/null` and `--no-input`

### Why

Suppressing stderr with `2>/dev/null` caused `opencode run` to hang indefinitely — opencode
needs stderr for progress output and/or terminal detection. Removing the redirect fixed the
hangs immediately. With the reliability fix in place, reviewers can now safely run in parallel,
reducing total review time from ~6 minutes (sequential) to ~1-2 minutes (parallel).

The `--no-input` flag was also invalid for `claude -p` and caused the Claude reviewer to fail
silently (exit code 1, empty output).

Note: The `2>/dev/null` on non-opencode commands (e.g., `ls ... 2>/dev/null`, `node ... 2>/dev/null`,
`git log ... 2>/dev/null`) is fine and was left unchanged — only the `opencode run` and `claude -p`
redirects cause hangs.

---

## 2026-03-28 — Replace GPT-5.3 Codex with GPT-5.4, add GLM-5 reviewer, sync command files

**GSD version:** 1.30.0
**Files modified:** `get-shit-done/workflows/review.md`, `get-shit-done/workflows/ui-review.md`, `commands/gsd/review.md`, `commands/gsd/verify-work.md`

### What changed

- Replaced `lazer/openai/gpt-5.3-codex` with `lazer/openai/gpt-5.4` (flag: `--gpt-5.4`)
- Added new reviewer: `lazer/deepinfra/zai-org/GLM-5` (flag: `--glm-5`)
- Now 6 total reviewers (5 OpenCode + Claude Opus)
- **`review.md`**: Updated model list, flags, invocation blocks, progress display, REVIEWS.md template
- **`ui-review.md`**: Same model changes — updated invocation block, progress display, section headers,
  and score comparison table (added GLM-5 column, renamed GPT Codex → GPT-5.4)
- **`commands/gsd/review.md`**: Updated argument-hint, objective, and flags to match current 6-reviewer setup
  (was still showing old `--gemini`/`--codex` flags from the stock GSD install)
- **`commands/gsd/verify-work.md`**: Added `[--auto]` to argument-hint to reflect the `--auto` flag
  added in the 2026-03-27 verify-work patch

### Why

Model upgrade (5.3 Codex → 5.4) and expanding reviewer coverage with GLM-5 for additional
adversarial perspective. Command files were out of sync with their workflow counterparts —
`commands/gsd/` gets wiped on `/gsd:update` just like `get-shit-done/`, so these also need
backup and restore.

### Note

The 2026-03-27 patches missed updating `commands/gsd/` files. Going forward, always check
both `get-shit-done/workflows/` and `commands/gsd/` when patching.

---

## 2026-03-27 — Multi-model review via OpenCode + Claude

**GSD version:** 1.30.0
**Files modified:** `get-shit-done/workflows/review.md`

### What changed

- Replaced `gemini` and `codex` CLI detection/invocation with `opencode` CLI using 4 models:
  - `lazer/openai/gpt-5.3-codex` (flag: `--gpt-codex`)
  - `lazer/gemini/gemini-3.1-pro-preview` (flag: `--gemini-pro`)
  - `lazer/deepinfra/MiniMaxAI/MiniMax-M2.5` (flag: `--minimax`)
  - `lazer/deepinfra/moonshotai/Kimi-K2.5-Turbo` (flag: `--kimi`)
- Kept Claude Opus as 5th reviewer via `claude -p ... --no-input` (flag: `--claude`)
- Replaced the shallow 5-point review checklist with an 8-dimension adversarial review framework:
  1. Goal Alignment
  2. Architecture & Design Coherence
  3. Failure Mode Analysis
  4. Dependency & Ordering Risks
  5. Security & Data Integrity
  6. Testing & Verification Strategy
  7. Operational Readiness
  8. Missing Pieces
- Each dimension requires a PASS/FLAG/BLOCK verdict with evidence and actionable recommendation
- Overall verdict is APPROVE/REVISE/REJECT
- Consensus summary now includes: Blockers (2+ reviewers), Unique Insights (single reviewer blind spots)

### Why

The original review used gemini and codex CLIs which aren't installed. OpenCode provides
access to multiple models through a single CLI. The review prompt was too shallow — a
5-point checklist doesn't catch architectural or failure-mode issues. The deeper 8-dimension
framework forces reviewers to think adversarially about what will break.

---

## 2026-03-27 — Cross-AI UI perspectives in ui-review

**GSD version:** 1.30.0
**Files modified:** `get-shit-done/workflows/ui-review.md`

### What changed

- Added new step 4 (Cross-AI UI Perspectives) between the primary gsd-ui-auditor and results display
- Step 4 substeps:
  - 4a: Check `opencode` and `claude` CLI availability (graceful skip if missing)
  - 4b: Gather full context — PROJECT.md, ROADMAP.md phase section, REQUIREMENTS.md, all PLAN.md
    and SUMMARY.md files, UI-SPEC.md, CONTEXT.md, actual frontend source files from git, and the
    primary UI-REVIEW.md
  - 4c: Build cross-AI prompt asking each model to independently score all 6 pillars, agree/disagree
    with the primary auditor, and surface missed issues
  - 4d: Invoke same 5 models as review.md (4 opencode + Claude Opus)
  - 4e: Append "Cross-AI UI Perspectives" section to UI-REVIEW.md with score comparison table,
    issues missed by primary, score disagreements, validated findings
- Updated results display (step 5) to show Primary score alongside Cross-AI average
- Added issue-severity-based routing in "Next" section:
  - Many issues (5+ fixes, any pillar <= 2/4, cross-AI avg < 16/24): routes to "Fix Issues First"
    with `/gsd:fast` for simple fixes or `/gsd:quick` for structural ones, then re-run ui-review
  - Few issues (< 5 fixes, all pillars >= 3/4, cross-AI avg >= 18/24): routes to "Next" with
    optional `/gsd:fast` for minor fixes

### Why

UI evaluation is inherently subjective — different models have different aesthetic sensibilities.
A single auditor misses things. The score comparison table makes disagreements visible, and the
"missed by primary" section catches the blind spots that multi-model review is designed to find.
The severity-based routing prevents moving forward with a broken UI — previously it always
suggested "next phase" regardless of how many issues were found.

---

## 2026-03-27 — Auto-verify in verify-work (--auto flag)

**GSD version:** 1.30.0
**Files modified:** `get-shit-done/workflows/verify-work.md`

### What changed

- Added `--auto` flag and new `auto_verify` step between `create_uat_file` and `present_test`
- Without `--auto`, workflow is 100% identical to original
- auto_verify substeps:
  1. Check playwright-cli availability — warns with install instructions if missing, asks user
     to continue or cancel
  2. Ask for base URL — auto-detects from .env/PROJECT.md, presents options
  3. Ping the URL — retry/skip/change URL if unreachable
  4. Auth check — looks for tokens/credentials in .env/fixtures, asks user if not found.
     For API: bearer token or API key. For UI: login credentials. Playwright pauses mid-flow
     if it hits an unexpected auth wall and asks for form values
  5. Classify tests — routes each test to playwright, curl, or interactive based on what it
     references (UI elements vs API endpoints vs subjective feel)
  6. Run playwright smoke checks — page loads, key elements visible, no console errors, basic
     navigation. Uses `playwright-cli` skill. Runs `playwright-cli show` for user to watch
  7. Run curl checks — endpoint reachability, response shape, CRUD with cleanup, error handling
  8. Report summary — shows auto-verified count, then falls through to interactive `present_test`
     loop for remaining `[pending]` tests only
- Confidence-based failure handling:
  - High confidence failures (wrong status, missing element, 500) -> result: issue (gaps_found)
  - Low confidence failures (timeout, flaky selector) -> stays pending (interactive)
- Results written directly to UAT.md using existing format (`result: pass`, `result: issue`)
  with added `verified_by: playwright` or `verified_by: curl` annotation

### Why

verify-work was fully manual — the user had to test every single item by hand. Most tests
(page loads, API returns correct data, form submits) can be verified automatically with
playwright and curl. The `--auto` flag automates the mechanical checks so the user only
needs to manually verify subjective items (performance feel, UX quality) and anything that
failed automation. This dramatically reduces the time spent in UAT while keeping the human
in the loop for things that need human judgment.

---

## Canonical storage

All patch source files now live under `~/.config/gsd-patches/` and are synchronized to runtime installs.

After a `/gsd:update`, re-apply canonical patches with:

```bash
~/.config/gsd-patches/bin/sync all
~/.config/gsd-patches/bin/check all
```

Legacy `~/.claude/gsd-patch-backups/` files were retired in favor of the canonical directory.

---

## 2026-04-26 — Remove UAT creation from execute-phase human_needed

**GSD version:** 1.35.0+
**Files modified:** claude/workflows/execute-phase.md, opencode/workflows/execute-phase.md

### What changed

- Removed `*-HUMAN-UAT.md` file creation and commit from the `human_needed` branch in execute-phase
- `human_needed` now simply notes the items (they remain in VERIFICATION.md) and proceeds to `update_roadmap`
- UAT creation is `/gsd-verify-work`'s sole responsibility — execute-phase no longer creates UAT artifacts
- Updated status table: `human_needed` action column changed from "Present items for human testing, get approval or feedback" to "Note items, proceed to completion (UAT is `/gsd-verify-work`'s job)"

### Why

The previous 2026-04-13 patch made `human_needed` non-blocking but still created a `*-HUMAN-UAT.md`
file during execute-phase. This duplicated the UAT creation that `/gsd-verify-work` already performs,
and the two UAT sources caused confusion in `/gsd-progress` and `/gsd-audit-uat`. Execute-phase
should only verify the goal — it should not create testing artifacts. VERIFICATION.md already
lists the human-needed items; the user runs `/gsd-verify-work` to create the UAT and do manual
testing on their own schedule.

---

## 2026-04-13 — Remove intrusive execute-phase gates

**GSD version:** 1.35.0 (runtime: 1.34.2)
**Files modified:** claude/workflows/execute-phase.md, opencode/workflows/execute-phase.md

### What changed

- Removed `code_review_gate` as a mandatory inline step in execute-phase workflow
- Changed `human_needed` verification from blocking (waits for user approval) to non-blocking (proceeds to completion)
- Added `/gsd-code-review` (recommended) and `/gsd-verify-work` as suggested next actions in `offer_next`

### Why

The auto-invoked code review is intrusive — spawns a full review subagent on every phase execution
regardless of need. The human_needed block stops the entire workflow waiting for manual approval
when `/gsd-verify-work` already handles this purpose. Both are better as explicit user choices
after seeing execution results. The stricter v1.35.0 verifier triggers `human_needed` far more
often than v1.30.0, making the blocking behavior especially painful.

---

## 2026-04-13 — Replace Gemini CLI with OpenCode, add model variants, bump timeout

**GSD version:** 1.35.0 (runtime: 1.34.2)
**Files modified:** claude/workflows/review.md, claude/workflows/ui-review.md, opencode/workflows/review.md, opencode/workflows/ui-review.md

### What changed

- Replaced Gemini CLI (`gemini -p`) with OpenCode (`opencode run -m lazer/gemini-3.1-pro --variant high`)
- Added `--variant high` to all OpenCode reviewer models (minimax, kimi, glm-5)
- Bumped reviewer timeout from 5 minutes (300000ms) to 10 minutes (600000ms)
- Removed `command -v gemini` availability check (gemini now goes through opencode)

### Why

Gemini CLI only offers the Flash model which is too weak for meaningful code review. Gemini Pro
via OpenCode is significantly better. Model variants (`--variant high`) increase reasoning effort
for all reviewers. The 5-minute timeout was killing slower models mid-response, especially with
high variants, producing empty output that got falsely marked as "failed."

## Notes

- All patches use `opencode run -m <model> --variant <level> "<prompt>"` syntax for OpenCode invocation
- The 6 OpenCode reviewer models (gemini, minimax, kimi, glm-5, qwen, deepseek) can be updated by editing the model strings in review.md and ui-review.md
- playwright-cli install: `npm install -g @playwright/cli@latest && playwright-cli install --skills`
- After a `/gsd-update`, runtime-native reapply commands are optional fallback (`/gsd-reapply-patches`), then run canonical sync/check commands above
- Claude commands use skills format (`skills/gsd-*/SKILL.md`), OpenCode uses flat commands (`command/gsd-*.md`)
