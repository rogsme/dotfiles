# GSD Customizations

Local patches applied to GSD workflows. These files get wiped on `/gsd:update` —
the installer backs them up to `gsd-local-patches/` and they can be reapplied with
`/gsd:reapply-patches`. This file tracks what was changed and why so patches can be
recreated if needed.

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
  - `lazer/deepinfra/moonshotai/Kimi-K2.5` (flag: `--kimi`)
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

## Backups

Full copies of patched files are stored in `~/.claude/gsd-patch-backups/`. This directory
is outside `get-shit-done/` so it survives updates. After a `/gsd:update`, restore with:

```bash
cp ~/.claude/gsd-patch-backups/review.md ~/.claude/get-shit-done/workflows/review.md
cp ~/.claude/gsd-patch-backups/ui-review.md ~/.claude/get-shit-done/workflows/ui-review.md
cp ~/.claude/gsd-patch-backups/verify-work.md ~/.claude/get-shit-done/workflows/verify-work.md
cp ~/.claude/gsd-patch-backups/commands-gsd-review.md ~/.claude/commands/gsd/review.md
cp ~/.claude/gsd-patch-backups/commands-gsd-verify-work.md ~/.claude/commands/gsd/verify-work.md
```

**Current backups (2026-03-28, GSD 1.30.0):**
- `gsd-patch-backups/review.md` — workflow
- `gsd-patch-backups/ui-review.md` — workflow
- `gsd-patch-backups/verify-work.md` — workflow
- `gsd-patch-backups/commands-gsd-review.md` — command
- `gsd-patch-backups/commands-gsd-verify-work.md` — command

When making new patches, copy the updated file to `gsd-patch-backups/` and update this list.

## Notes

- All patches use `opencode run -m <model> "<prompt>"` syntax for OpenCode invocation
- The 5 OpenCode models can be updated by editing the model strings in review.md and ui-review.md
- playwright-cli install: `npm install -g @playwright/cli@latest && playwright-cli install --skills`
- After a `/gsd:update`, first try `/gsd:reapply-patches`. If that fails, restore from `~/.claude/gsd-patch-backups/` using the commands above
