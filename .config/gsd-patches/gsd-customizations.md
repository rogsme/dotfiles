# GSD Customizations

Local patches applied to GSD workflows. These files get wiped on `/gsd:update` —
the installer backs them up to `gsd-local-patches/` and they can be reapplied with
`/gsd:reapply-patches`. This file tracks what was changed and why so patches can be
recreated if needed.

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

## Notes

- All patches use `opencode run -m <model> "<prompt>"` syntax for OpenCode invocation
- The 5 OpenCode models can be updated by editing the model strings in review.md and ui-review.md
- playwright-cli install: `npm install -g @playwright/cli@latest && playwright-cli install --skills`
- After a `/gsd:update`, runtime-native reapply commands are optional fallback (`/gsd:reapply-patches`, `/gsd-reapply-patches`), then run canonical sync/check commands above
