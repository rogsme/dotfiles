<purpose>
Retroactive 6-pillar visual audit of implemented frontend code with cross-AI perspective review. Standalone command that works on any project — GSD-managed or not. Produces scored UI-REVIEW.md with actionable findings, enriched by independent assessments from multiple AI models.
</purpose>

<required_reading>
@$HOME/.claude/get-shit-done/references/ui-brand.md
</required_reading>

<available_agent_types>
Valid GSD subagent types (use exact names — do not fall back to 'general-purpose'):
- gsd-ui-auditor — Audits UI against design requirements
</available_agent_types>

<process>

## 0. Initialize

```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init phase-op "${PHASE_ARG}")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
AGENT_SKILLS_UI_REVIEWER=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" agent-skills gsd-ui-reviewer 2>/dev/null)
```

Parse: `phase_dir`, `phase_number`, `phase_name`, `phase_slug`, `padded_phase`, `commit_docs`.

```bash
UI_AUDITOR_MODEL=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" resolve-model gsd-ui-auditor --raw)
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

**If `SUMMARY_FILES` empty:** Exit — "Phase {N} not executed. Run /gsd:execute-phase {N} first."

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
◆ Spawning UI auditor...
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
Task(
  prompt=ui_audit_prompt,
  subagent_type="gsd-ui-auditor",
  model="{UI_AUDITOR_MODEL}",
  description="UI Audit Phase {N}"
)
```

## 4. Cross-AI UI Perspectives

After the gsd-ui-auditor writes UI-REVIEW.md, invoke external models for independent UI assessments.

### 4a. Check CLI availability

```bash
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

For each selected reviewer, invoke in sequence:

**GPT-5.4 (via OpenCode):**
```bash
opencode run -m lazer/openai/gpt-5.4 "$(cat /tmp/gsd-ui-review-prompt-{phase}.md)" 2>/dev/null > /tmp/gsd-ui-review-gpt-5.4-{phase}.md
```

**Gemini 3.1 Pro (via OpenCode):**
```bash
opencode run -m lazer/gemini/gemini-3.1-pro-preview "$(cat /tmp/gsd-ui-review-prompt-{phase}.md)" 2>/dev/null > /tmp/gsd-ui-review-gemini-pro-{phase}.md
```

**MiniMax M2.5 (via OpenCode):**
```bash
opencode run -m lazer/deepinfra/MiniMaxAI/MiniMax-M2.5 "$(cat /tmp/gsd-ui-review-prompt-{phase}.md)" 2>/dev/null > /tmp/gsd-ui-review-minimax-{phase}.md
```

**Kimi K2.5 (via OpenCode):**
```bash
opencode run -m lazer/deepinfra/moonshotai/Kimi-K2.5 "$(cat /tmp/gsd-ui-review-prompt-{phase}.md)" 2>/dev/null > /tmp/gsd-ui-review-kimi-{phase}.md
```

**GLM-5 (via OpenCode):**
```bash
opencode run -m lazer/deepinfra/zai-org/GLM-5 "$(cat /tmp/gsd-ui-review-prompt-{phase}.md)" 2>/dev/null > /tmp/gsd-ui-review-glm-5-{phase}.md
```

**Claude Opus (separate session):**
```bash
claude -p "$(cat /tmp/gsd-ui-review-prompt-{phase}.md)" --no-input 2>/dev/null > /tmp/gsd-ui-review-claude-{phase}.md
```

If a reviewer fails, log the error and continue with remaining reviewers.

Display progress:
```
◆ Cross-AI UI perspectives...
  ◆ GPT-5.4...                    done ✓
  ◆ Gemini 3.1 Pro...             done ✓
  ◆ MiniMax M2.5...               done ✓
  ◆ Kimi K2.5...                  done ✓
  ◆ GLM-5...                      done ✓
  ◆ Claude Opus...                done ✓
```

### 4e. Append cross-AI section to UI-REVIEW.md

Read all successful review responses and append to the existing UI-REVIEW.md:

```markdown

---

# Cross-AI UI Perspectives

> Independent assessments from {count} additional AI models.
> These reviews challenge and supplement the primary 6-pillar audit above.

## GPT-5.4

{gpt-5.4 review content}

---

## Gemini 3.1 Pro

{gemini-pro review content}

---

## MiniMax M2.5

{minimax review content}

---

## Kimi K2.5

{kimi review content}

---

## GLM-5

{glm-5 review content}

---

## Claude Opus

{claude review content}

---

## Cross-AI Consensus

### Score Comparison

| Pillar | Primary | GPT-5.4 | Gemini Pro | MiniMax | Kimi | GLM-5 | Claude | Avg |
|--------|---------|---------|------------|---------|------|-------|--------|-----|
| Copywriting | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {avg} |
| Visuals | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {avg} |
| Color | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {avg} |
| Typography | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {avg} |
| Spacing | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {avg} |
| Experience | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {N}/4 | {avg} |
| **Total** | **/24** | **/24** | **/24** | **/24** | **/24** | **/24** | **/24** | **avg** |

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
  /gsd:fast fix the {N} issues from the phase {phase_number} UI review

For structural fixes (layout, component hierarchy, experience flow):
  /gsd:quick {phase_number} — fix UI review issues

Then re-run:
  /gsd:ui-review {phase_number}

<sub>/clear first → fresh context window</sub>

───────────────────────────────────────────────────────────────
```

**If few issues (< 5 actionable fixes, all pillars ≥ 3/4, cross-AI avg ≥ 18/24):**

```
───────────────────────────────────────────────────────────────

## ▶ Next

{If 1-4 minor issues exist:}
Optional: `/gsd:fast fix the {N} minor issues from the phase {phase_number} UI review`

- `/gsd:verify-work {N}` — UAT testing
- `/gsd:plan-phase {N+1}` — plan next phase

<sub>/clear first → fresh context window</sub>

───────────────────────────────────────────────────────────────
```

## 6. Commit (if configured)

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs(${padded_phase}): UI audit review" --files "${PHASE_DIR}/${PADDED_PHASE}-UI-REVIEW.md"
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
