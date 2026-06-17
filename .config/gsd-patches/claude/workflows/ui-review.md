<purpose>
Retroactive 6-pillar visual audit of implemented frontend code with cross-AI perspective review. Standalone command that works on any project — GSD-managed or not. Produces scored UI-REVIEW.md with actionable findings, enriched by independent assessments from multiple AI models.
</purpose>

<required_reading>
@$HOME/.claude/gsd-core/references/ui-brand.md
</required_reading>

<available_agent_types>
Valid GSD subagent types (use exact names — do not fall back to 'general-purpose'):
- gsd-ui-auditor — Audits UI against design requirements
</available_agent_types>

<process>

## 0. Initialize

```bash
_GSD_SHIM_NAME="gsd-tools.cjs"; _GSD_RUNTIME_ROOT="${RUNTIME_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"; GSD_TOOLS="${_GSD_RUNTIME_ROOT}/gsd-core/bin/${_GSD_SHIM_NAME}"; if [ -f "$GSD_TOOLS" ]; then gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif command -v gsd-tools >/dev/null 2>&1; then GSD_TOOLS="$(command -v gsd-tools)"; gsd_run() { "$GSD_TOOLS" "$@"; }; elif [ -f "$HOME/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="$HOME/.claude/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${HERMES_HOME:-$HOME/.hermes}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${HERMES_HOME:-$HOME/.hermes}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${CURSOR_CONFIG_DIR:-$HOME/.cursor}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${CURSOR_CONFIG_DIR:-$HOME/.cursor}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${CODEX_HOME:-$HOME/.codex}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${CODEX_HOME:-$HOME/.codex}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${GEMINI_CONFIG_DIR:-$HOME/.gemini}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${GEMINI_CONFIG_DIR:-$HOME/.gemini}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${COPILOT_CONFIG_DIR:-$HOME/.copilot}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${COPILOT_CONFIG_DIR:-$HOME/.copilot}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${WINDSURF_CONFIG_DIR:-$HOME/.codeium/windsurf}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${WINDSURF_CONFIG_DIR:-$HOME/.codeium/windsurf}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${AUGMENT_CONFIG_DIR:-$HOME/.augment}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${AUGMENT_CONFIG_DIR:-$HOME/.augment}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${TRAE_CONFIG_DIR:-$HOME/.trae}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${TRAE_CONFIG_DIR:-$HOME/.trae}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${QWEN_CONFIG_DIR:-$HOME/.qwen}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${QWEN_CONFIG_DIR:-$HOME/.qwen}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${CODEBUDDY_CONFIG_DIR:-$HOME/.codebuddy}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${CODEBUDDY_CONFIG_DIR:-$HOME/.codebuddy}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${CLINE_CONFIG_DIR:-$HOME/.cline}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${CLINE_CONFIG_DIR:-$HOME/.cline}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${GROK_AGENTS_HOME:-$HOME/.agents}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${GROK_AGENTS_HOME:-$HOME/.agents}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${ANTIGRAVITY_CONFIG_DIR:-$HOME/.gemini/antigravity}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${ANTIGRAVITY_CONFIG_DIR:-$HOME/.gemini/antigravity}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${OPENCODE_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/opencode}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${OPENCODE_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/opencode}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${KILO_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/kilo}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${KILO_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/kilo}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; else echo "ERROR: gsd-tools.cjs not found at $GSD_TOOLS and gsd-tools is not on PATH. Run: npx -y @opengsd/gsd-core@latest --claude --local" >&2; exit 1; fi
INIT=$(gsd_run query init.phase-op "${PHASE_ARG}")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
AGENT_SKILLS_UI_REVIEWER=$(gsd_run query agent-skills gsd-ui-auditor)
```

Parse: `phase_dir`, `phase_number`, `phase_name`, `phase_slug`, `padded_phase`, `commit_docs`.

```bash
UI_AUDITOR_MODEL=$(gsd_run query resolve-model gsd-ui-auditor --raw)
```

Display banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► UI AUDIT — PHASE {N}: {name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 1. Detect Input State

```bash
SUMMARY_FILES=$(ls "${PHASE_DIR}"/*-SUMMARY.md 2>/dev/null)
UI_SPEC_FILE=$(ls "${PHASE_DIR}"/*-UI-SPEC.md 2>/dev/null | head -1)
UI_REVIEW_FILE=$(ls "${PHASE_DIR}"/*-UI-REVIEW.md 2>/dev/null | head -1)
```

**If `SUMMARY_FILES` empty:** Exit — "Phase {N} not executed. Run /gsd-execute-phase {N} first."


**Text mode (`workflow.text_mode: true` in config or `--text` flag):** Set `TEXT_MODE=true` if `--text` is present in `$ARGUMENTS` OR `text_mode` from init JSON is `true`. When TEXT_MODE is active, replace every `AskUserQuestion` call with a plain-text numbered list and ask the user to type their choice number. This is required for non-Claude runtimes (OpenAI Codex, Gemini CLI, etc.) where `AskUserQuestion` is not available.
**If `UI_REVIEW_FILE` non-empty:** Use AskUserQuestion:
- header: "Existing UI Review"
- question: "UI-REVIEW.md already exists for Phase {N}."
- options:
  - "Re-audit — run fresh audit"
  - "View — display current review and exit"

If "View": display file, exit.
If "Re-audit": continue.

## 2. Gather Context Paths

Build file list for auditor:
- All SUMMARY.md files in phase dir
- All PLAN.md files in phase dir
- UI-SPEC.md (if exists — audit baseline)
- CONTEXT.md (if exists — locked decisions)

## 3. Spawn gsd-ui-auditor

```
◆ Spawning UI auditor... (runs in a subagent — no output until it returns, ~1–5 min; expected, not a freeze)
```

Build prompt:

```markdown
Read $HOME/.claude/agents/gsd-ui-auditor.md for instructions.

<objective>
Conduct 6-pillar visual audit of Phase {phase_number}: {phase_name}
{If UI-SPEC exists: "Audit against UI-SPEC.md design contract."}
{If no UI-SPEC: "Audit against abstract 6-pillar standards."}
</objective>

<files_to_read>
- {summary_paths} (Execution summaries)
- {plan_paths} (Execution plans — what was intended)
- {ui_spec_path} (UI Design Contract — audit baseline, if exists)
- {context_path} (User decisions, if exists)
</files_to_read>

${AGENT_SKILLS_UI_REVIEWER}

<config>
phase_dir: {phase_dir}
padded_phase: {padded_phase}
</config>
```

Omit null file paths.

```
Agent(
  prompt=ui_audit_prompt,
  subagent_type="gsd-ui-auditor",
  model="{UI_AUDITOR_MODEL}",
  description="UI Audit Phase {N}"
)
```

> **ORCHESTRATOR RULE — CODEX RUNTIME**: After calling Agent() above, stop working on this task immediately. Do not read more files, edit code, or run tests related to this task while the subagent is active. Wait for the subagent to return its result. This prevents duplicate work, conflicting edits, and wasted context. Only resume when the subagent result is available.

## 4. Cross-AI UI Perspectives

After the gsd-ui-auditor writes UI-REVIEW.md, invoke external models for independent UI assessments.

### 4a. Check CLI availability

```bash
command -v codex >/dev/null 2>&1 && echo "codex:available" || echo "codex:missing"
command -v opencode >/dev/null 2>&1 && echo "opencode:available" || echo "opencode:missing"
command -v claude >/dev/null 2>&1 && echo "claude:available" || echo "claude:missing"
```

**If no CLIs available:** Skip to step 5 (primary audit is still valuable on its own).

### 4b. Gather context for cross-AI prompt

Collect all artifacts the external reviewers need to form an independent opinion:

1. `.planning/PROJECT.md` (first 80 lines — project context)
2. Phase section from `.planning/ROADMAP.md`
3. All `*-PLAN.md` files in the phase directory (what was intended)
4. All `*-SUMMARY.md` files in the phase directory (what was executed)
5. `*-UI-SPEC.md` if present (design contract — audit baseline)
6. `*-CONTEXT.md` if present (locked user decisions)
7. `.planning/REQUIREMENTS.md` (requirements this phase addresses)
8. The **actual frontend source files** changed in this phase — extract from SUMMARY.md or git:
   ```bash
   # Get files changed in this phase's commits
   PHASE_FILES=$(git log --name-only --pretty=format: --grep="phase-${PHASE_NUMBER}" -- '*.tsx' '*.jsx' '*.vue' '*.svelte' '*.css' '*.scss' '*.html' 2>/dev/null | sort -u | head -50)
   ```
   If no phase-tagged commits, fall back to files referenced in SUMMARY.md/PLAN.md.
9. The `UI-REVIEW.md` that the gsd-ui-auditor just created (primary audit)

### 4c. Build cross-AI UI review prompt

Build the prompt from the gathered context:

```markdown
# Cross-AI UI Code Review

You are reviewing frontend code for a software project phase. Another AI has already
conducted a 6-pillar audit — you will see their review below. Your job is to provide
an independent perspective: agree, disagree, or surface things they missed entirely.

Do not be deferential to the primary review. If you think a score is wrong, say so.
If you think a critical issue was missed, flag it. Different eyes catch different things.

## Project Context
{first 80 lines of PROJECT.md}

## Phase {N}: {phase name}

### Roadmap Section
{roadmap phase section}

### Requirements Addressed
{requirements for this phase}

### UI Spec (design contract)
{UI-SPEC.md contents, if exists}

### User Decisions (CONTEXT.md)
{context if present}

### Plans (what was intended)
{all PLAN.md contents}

### Execution Summary (what was built)
{SUMMARY.md contents}

### Frontend Source Code
{contents of changed frontend files — the actual code being audited}

### Primary Audit (gsd-ui-auditor)
{UI-REVIEW.md contents}

## Your Review

Evaluate the frontend code across these 6 pillars. For each pillar:
- **Your Score**: {N}/4 — with one-line justification
- **Agree/Disagree** with primary audit score — and why
- **Missed Issues**: anything the primary auditor overlooked

### Pillars
1. **Copywriting** — Labels, microcopy, error messages, placeholder text. Is it clear, consistent, human?
2. **Visuals** — Layout, alignment, component hierarchy, visual weight. Does it scan well?
3. **Color** — Contrast, accessibility (WCAG), semantic use, dark/light consistency.
4. **Typography** — Font sizes, weights, line heights, hierarchy. Is the type system coherent?
5. **Spacing** — Padding, margins, gaps, rhythm. Is white space intentional or accidental?
6. **Experience Design** — Flow, affordance, feedback, loading states, error states, empty states. Does it feel right?

Then provide:
- **Top 3 Issues the Primary Audit Got Right** — validate the strongest findings
- **Top 3 Issues the Primary Audit Missed** — your unique contribution
- **Score Disagreements** — any pillar where your score differs by 2+ points, with evidence
- **Overall Verdict** — AGREE / PARTIALLY AGREE / DISAGREE with the primary audit's overall assessment

Output your review in markdown format.
```

Write to temp file: `/tmp/gsd-ui-review-prompt-{phase}.md`

### 4d. Invoke reviewers

Invoke all selected reviewers in parallel using separate Bash tool calls in a single message.

IMPORTANT: `codex` and `opencode` reviewer commands may use `2>/dev/null` to keep
stdout clean. Local regression tests with `codex-cli 0.118.0` and
`opencode 1.4.0` completed successfully with stderr suppressed on both smoke-test and realistic
review prompts.

IMPORTANT: `claude -p` does NOT support `--no-input`. Use `claude -p "..." > file` only.

**All reviewers run in parallel** — use one Bash tool call per reviewer, all in the same message:

```bash
# Gemini Pro via OpenCode
opencode run -m lazer/gemini-3.1-pro --variant high "$(cat /tmp/gsd-ui-review-prompt-{phase}.md)" 2>/dev/null > /tmp/gsd-ui-review-gemini-{phase}.md

# Codex CLI
codex exec --skip-git-repo-check "$(cat /tmp/gsd-ui-review-prompt-{phase}.md)" 2>/dev/null > /tmp/gsd-ui-review-codex-{phase}.md

# MiniMax M2.7
opencode run -m lazer/minimax-m2.7 --variant high "$(cat /tmp/gsd-ui-review-prompt-{phase}.md)" 2>/dev/null > /tmp/gsd-ui-review-minimax-{phase}.md

# Kimi 2.6
opencode run -m lazer/kimi-2.6 --variant high "$(cat /tmp/gsd-ui-review-prompt-{phase}.md)" 2>/dev/null > /tmp/gsd-ui-review-kimi-{phase}.md

# GLM-5.1
opencode run -m lazer/glm-5.1 --variant high "$(cat /tmp/gsd-ui-review-prompt-{phase}.md)" 2>/dev/null > /tmp/gsd-ui-review-glm-5-{phase}.md

# Qwen 3.6 Plus
opencode run -m lazer/qwen-3.6-plus --variant high "$(cat /tmp/gsd-ui-review-prompt-{phase}.md)" 2>/dev/null > /tmp/gsd-ui-review-qwen-{phase}.md

# DeepSeek V3.2
opencode run -m lazer/deepseek-v4-pro --variant high "$(cat /tmp/gsd-ui-review-prompt-{phase}.md)" 2>/dev/null > /tmp/gsd-ui-review-deepseek-{phase}.md

# Claude Opus
claude -p --model opus "$(cat /tmp/gsd-ui-review-prompt-{phase}.md)" > /tmp/gsd-ui-review-claude-{phase}.md
```

If a reviewer fails, log the error and continue with remaining reviewers.

Waiting strategy (Claude Code):

Launch all reviewer commands as separate Bash tool calls in a single message, each with
`run_in_background: true` and `timeout: 600000` (10 minutes).

Then stop. Do not poll. Do not check file sizes in a loop. Do not call `wc -l` repeatedly.
Wait for the background command notifications to arrive, then read each output file once.

Validate meaningful content against the prompt's requested output format. Use line count only as
a secondary signal. If a reviewer produced no output, fewer than 3 lines, or obviously incomplete
content, log it as failed and continue with the reviewers that succeeded. Do not retry
automatically.

After validation, report status:

```
◆ Cross-AI UI perspectives...
  ◆ Gemini CLI...                 done ✓ (N lines)
  ◆ Codex CLI...                  done ✓ (N lines)
  ◆ MiniMax M2.7...               done ✓ (N lines)
  ◆ Kimi 2.6...                   done ✓ (N lines)
  ◆ GLM-5.1...                    done ✓ (N lines)
  ◆ Qwen 3.6 Plus...             done ✓ (N lines)
  ◆ DeepSeek V3.2...             done ✓ (N lines)
  ◆ Claude Opus...                done ✓ (N lines)
```

### 4e. Append cross-AI section to UI-REVIEW.md

Read all successful review responses and append to the existing UI-REVIEW.md:

```markdown

---

# Cross-AI UI Perspectives

> Independent assessments from {count} additional AI models.
> These reviews challenge and supplement the primary 6-pillar audit above.

## Gemini

{gemini review content}

---

## Codex

{codex review content}

---

## MiniMax M2.7

{minimax review content}

---

## Kimi 2.6

{kimi review content}

---

## GLM-5.1

{glm-5 review content}

---

## Qwen 3.6 Plus

{qwen review content}

---

## DeepSeek V3.2

{deepseek review content}

---

## Claude Opus

{claude review content}

---

## Cross-AI Consensus

### Score Comparison

| Pillar | Primary | Gemini | Codex | MiniMax | Kimi | GLM-5.1 | Qwen | DeepSeek | Claude | Avg |
|--------|---------|--------|-------|---------|------|---------|------|----------|--------|-----|
| Copywriting | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {avg} |
| Visuals | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {avg} |
| Color | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {avg} |
| Typography | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {avg} |
| Spacing | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {avg} |
| Experience | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {avg} |
| **Total** | **/24** | **/24** | **/24** | **/24** | **/24** | **/24** | **/24** | **/24** | **/24** | **avg** |

### Issues Missed by Primary Audit
{issues flagged by 2+ cross-AI reviewers that the primary audit did not mention — highest priority}

### Score Disagreements
{pillars where cross-AI average differs from primary score by 1+ point — investigate these}

### Validated Findings
{primary audit findings confirmed by 2+ cross-AI reviewers — high confidence}
```

Clean up temp files.

## 5. Handle Return

**If `## UI REVIEW COMPLETE`:**

Display score summary:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► UI AUDIT COMPLETE ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Phase {N}: {Name}** — Overall: {score}/24
{If cross-AI ran: "Cross-AI avg: {avg}/24 ({count} reviewers)"}

| Pillar | Primary | Cross-AI Avg |
|--------|---------|--------------|
| Copywriting | {N}/4 | {avg}/4 |
| Visuals | {N}/4 | {avg}/4 |
| Color | {N}/4 | {avg}/4 |
| Typography | {N}/4 | {avg}/4 |
| Spacing | {N}/4 | {avg}/4 |
| Experience Design | {N}/4 | {avg}/4 |

Top fixes:
1. {fix}
2. {fix}
3. {fix}

{If cross-AI ran and found missed issues:}
Cross-AI caught:
1. {missed issue}
2. {missed issue}

Full review: {path to UI-REVIEW.md}
```

Count the total number of actionable issues (from both primary audit and cross-AI missed issues).

**If many issues (5+ actionable fixes, or any pillar scores ≤ 2/4, or cross-AI avg < 16/24):**

```
───────────────────────────────────────────────────────────────

## ▶ Fix Issues First

{issue_count} issues found. Fix before moving on.

For simple fixes (copy, spacing, color values):
  /gsd-fast fix the {N} issues from the phase {phase_number} UI review

For structural fixes (layout, component hierarchy, experience flow):
  /gsd-quick {phase_number} — fix UI review issues

Then re-run:
  /gsd-ui-review {phase_number}

<sub>/clear first → fresh context window</sub>

───────────────────────────────────────────────────────────────
```

**If few issues (< 5 actionable fixes, all pillars ≥ 3/4, cross-AI avg ≥ 18/24):**

```
───────────────────────────────────────────────────────────────

## ▶ Next

{If 1-4 minor issues exist:}
Optional: `/gsd-fast fix the {N} minor issues from the phase {phase_number} UI review`

- `/gsd-verify-work {N}` — UAT testing
- `/gsd-plan-phase {N+1}` — plan next phase

<sub>/clear first → fresh context window</sub>

───────────────────────────────────────────────────────────────
```

## Automated UI Verification (when Playwright-MCP is available)

If `mcp__playwright__*` tools are accessible in this session:

1. Navigate to each UI component described in the phase's UI-SPEC.md using
   `mcp__playwright__navigate` (or equivalent Playwright-MCP tool).
2. Take a screenshot of each component using `mcp__playwright__screenshot`.
3. Compare against the spec's visual requirements — dimensions, color palette,
   layout, spacing scale, and typography.
4. Report any dimension, color, or layout discrepancies automatically as
   additional findings within the relevant pillar section of UI-REVIEW.md.
5. Flag items that require human judgment (brand feel, content tone) as
   `needs_human_review: true` in the findings — these are surfaced to the user
   separately after the automated pass completes.

If Playwright-MCP is not available in this session, this section is skipped
entirely. The audit falls back to the standard code-only review described above.
No configuration change is required — the availability of `mcp__playwright__*`
tools is detected at runtime.

## 6. Commit (if configured)

```bash
gsd_run query commit "docs(${padded_phase}): UI audit review" --files "${PHASE_DIR}/${PADDED_PHASE}-UI-REVIEW.md"
```

</process>

<success_criteria>
- [ ] Phase validated
- [ ] SUMMARY.md files found (execution completed)
- [ ] Existing review handled (re-audit/view)
- [ ] gsd-ui-auditor spawned with correct context
- [ ] UI-REVIEW.md created in phase directory
- [ ] Cross-AI reviewers invoked (if CLIs available)
- [ ] Cross-AI perspectives appended to UI-REVIEW.md with score comparison table
- [ ] Score summary displayed to user (with cross-AI averages if available)
- [ ] Next steps presented
</success_criteria>
</output>
