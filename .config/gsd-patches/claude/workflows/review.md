<purpose>
Cross-AI peer review — invoke external AI CLIs to independently review phase plans.
Each CLI gets the same prompt (PROJECT.md context, phase plans, requirements) and
produces structured feedback. Results are combined into REVIEWS.md for the planner
to incorporate via --reviews flag.

This implements adversarial review: different AI models catch different blind spots.
A plan that survives review from 3-6 independent AI systems is more robust.
</purpose>

<process>

<step name="detect_clis">
Check which AI CLIs are available on the system:

```bash
# Check each CLI
command -v gemini >/dev/null 2>&1 && echo "gemini:available" || echo "gemini:missing"
command -v codex >/dev/null 2>&1 && echo "codex:available" || echo "codex:missing"
command -v opencode >/dev/null 2>&1 && echo "opencode:available" || echo "opencode:missing"
command -v claude >/dev/null 2>&1 && echo "claude:available" || echo "claude:missing"
```

Available OpenCode reviewer models:
- `minimax` → `lazer/deepinfra/MiniMaxAI/MiniMax-M2.5`
- `kimi` → `lazer/deepinfra/moonshotai/Kimi-K2.5-Turbo`
- `glm-5` → `lazer/deepinfra/zai-org/GLM-5`

Parse flags from `$ARGUMENTS`:
- `--gemini` → include Gemini via Gemini CLI
- `--codex` → include Codex via Codex CLI
- `--minimax` → include MiniMax M2.5 via OpenCode
- `--kimi` → include Kimi K2.5 via OpenCode
- `--glm-5` → include GLM-5 via OpenCode
- `--claude` → include Claude Opus (separate session)
- `--all` → include all available reviewers
- No flags → include all available reviewers

If no CLIs are available:
```
No external AI CLIs found. Install at least one:
- gemini: https://github.com/google-gemini/gemini-cli
- codex: https://github.com/openai/codex
- opencode: https://github.com/sst/opencode
- claude: https://github.com/anthropics/claude-code

Then run /gsd:review again.
```
Exit.

If only `claude` is available and we are already running inside Claude, at least one
non-claude reviewer CLI (`gemini`, `codex`, or `opencode`) must also be available to
ensure independence.
</step>

<step name="gather_context">
Collect phase artifacts for the review prompt:

```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init phase-op "${PHASE_ARG}")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

Read from init: `phase_dir`, `phase_number`, `padded_phase`.

Then read:
1. `.planning/PROJECT.md` (first 80 lines — project context)
2. Phase section from `.planning/ROADMAP.md`
3. All `*-PLAN.md` files in the phase directory
4. `*-CONTEXT.md` if present (user decisions)
5. `*-RESEARCH.md` if present (domain research)
6. `.planning/REQUIREMENTS.md` (requirements this phase addresses)
</step>

<step name="build_prompt">
Build a structured review prompt:

```markdown
# Cross-AI Plan Review Request

You are reviewing implementation plans for a software project phase.
Provide structured feedback on plan quality, completeness, and risks.

## Project Context
{first 80 lines of PROJECT.md}

## Phase {N}: {phase name}
### Roadmap Section
{roadmap phase section}

### Requirements Addressed
{requirements for this phase}

### User Decisions (CONTEXT.md)
{context if present}

### Research Findings
{research if present}

### Plans to Review
{all PLAN.md contents}

## Review Instructions

You are a senior staff engineer conducting a deep adversarial review. Do not be polite —
be precise. Your job is to find what will break, what was forgotten, and what will cause
regret in 6 months. Assume the plan authors are competent but blind-spotted.

Analyze each plan across these dimensions:

### 1. Goal Alignment (Does it actually solve the problem?)
- Do the planned tasks demonstrably achieve the phase goals, or do they drift?
- Are there requirements listed in the roadmap that no task addresses?
- Is there work planned that serves no stated requirement (scope creep)?

### 2. Architecture & Design Coherence
- Does the plan fit the existing system architecture, or does it fight it?
- Are there hidden coupling points between tasks that the plan treats as independent?
- Will this design paint the codebase into a corner for future phases?
- Are data models and schemas forward-compatible?

### 3. Failure Mode Analysis
- What happens when each external dependency is unavailable?
- Where are the single points of failure?
- What are the partial-failure states (half-migrated data, partially applied changes)?
- Are rollback paths defined for each destructive operation?

### 4. Dependency & Ordering Risks
- Are task dependencies correctly identified, or are there hidden sequencing constraints?
- Are there circular dependencies between tasks?
- What is the critical path, and is it realistic?
- Are third-party library/API version constraints accounted for?

### 5. Security & Data Integrity
- Are there new attack surfaces introduced (injection, auth bypass, data exposure)?
- Is PII/PHI handled correctly at every boundary?
- Are there race conditions in concurrent operations?
- Is input validation present at every system boundary?

### 6. Testing & Verification Strategy
- Is the testing approach sufficient to catch regressions?
- Are there untestable components due to tight coupling?
- Are edge cases explicitly called out in the plan or silently assumed?
- Would the proposed tests actually catch the failure modes from dimension 3?

### 7. Operational Readiness
- What monitoring/alerting is needed that isn't mentioned?
- How will you know if this feature is broken in production?
- What is the migration strategy for existing data?
- Are there performance implications at realistic scale (not just happy path)?

### 8. Missing Pieces
- What questions should have been asked during planning but weren't?
- What implicit assumptions is the plan making that should be explicit?
- Are there cross-cutting concerns (logging, caching, rate limiting) that got ignored?

For each dimension, provide:
- **Verdict**: PASS / FLAG (minor concern) / BLOCK (must fix before execution)
- **Evidence**: Specific references to plan sections or missing sections
- **Recommendation**: Concrete, actionable fix (not vague advice)

End with:
1. **Overall Verdict** — APPROVE / REVISE / REJECT with one-paragraph justification
2. **Top 3 Blockers** — The most critical issues that must be addressed (if any)
3. **Top 3 Improvements** — High-value suggestions that would meaningfully improve the plan

Output your review in markdown format.
```

Write to a temp file: `/tmp/gsd-review-prompt-{phase}.md`
</step>

<step name="invoke_reviewers">
Invoke all selected reviewers in parallel using separate Bash tool calls in a single message.

IMPORTANT: `gemini`, `codex`, and `opencode` reviewer commands may use `2>/dev/null` to keep
stdout clean. Local regression tests with `gemini 0.36.0`, `codex-cli 0.118.0`, and
`opencode 1.4.0` completed successfully with stderr suppressed on both smoke-test and realistic
review prompts.

IMPORTANT: `claude -p` does NOT support `--no-input`. Use `claude -p "..." > file` only.

**All reviewers run in parallel** — use one Bash tool call per reviewer, all in the same message:

```bash
# Gemini CLI
gemini -p "$(cat /tmp/gsd-review-prompt-{phase}.md)" 2>/dev/null > /tmp/gsd-review-gemini-{phase}.md

# Codex CLI
codex exec --skip-git-repo-check "$(cat /tmp/gsd-review-prompt-{phase}.md)" 2>/dev/null > /tmp/gsd-review-codex-{phase}.md

# MiniMax M2.5
opencode run -m lazer/deepinfra/MiniMaxAI/MiniMax-M2.5 "$(cat /tmp/gsd-review-prompt-{phase}.md)" 2>/dev/null > /tmp/gsd-review-minimax-{phase}.md

# Kimi K2.5
opencode run -m lazer/deepinfra/moonshotai/Kimi-K2.5-Turbo "$(cat /tmp/gsd-review-prompt-{phase}.md)" 2>/dev/null > /tmp/gsd-review-kimi-{phase}.md

# GLM-5
opencode run -m lazer/deepinfra/zai-org/GLM-5 "$(cat /tmp/gsd-review-prompt-{phase}.md)" 2>/dev/null > /tmp/gsd-review-glm-5-{phase}.md

# Claude Opus
claude -p --model opus "$(cat /tmp/gsd-review-prompt-{phase}.md)" > /tmp/gsd-review-claude-{phase}.md
```

If a reviewer fails, log the error and continue with remaining reviewers.

Waiting strategy (Claude Code):

Launch all reviewer commands as separate Bash tool calls in a single message, each with
`run_in_background: true` and `timeout: 300000` (5 minutes).

Then stop. Do not poll. Do not check file sizes in a loop. Do not call `wc -l` repeatedly.
Wait for the background command notifications to arrive, then read each output file once.

Validate meaningful content against the prompt's requested output format. Use line count only as
a secondary signal. If a reviewer produced no output, fewer than 3 lines, or obviously incomplete
content, log it as failed and continue with the reviewers that succeeded. Do not retry
automatically.

After validation, report status:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► CROSS-AI REVIEW — Phase {N}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Gemini CLI...         done ✓ (N lines)
◆ Codex CLI...          done ✓ (N lines)
◆ MiniMax M2.5...       done ✓ (N lines)
◆ Kimi K2.5...          done ✓ (N lines)
◆ GLM-5...              done ✓ (N lines)
◆ Claude Opus...        done ✓ (N lines)
```
</step>

<step name="write_reviews">
Combine all review responses into `{phase_dir}/{padded_phase}-REVIEWS.md`:

```markdown
---
phase: {N}
reviewers: [gemini, codex, minimax, kimi, glm-5, claude]
reviewed_at: {ISO timestamp}
plans_reviewed: [{list of PLAN.md files}]
---

# Cross-AI Plan Review — Phase {N}

## Gemini Review

{gemini review content}

---

## Codex Review

{codex review content}

---

## MiniMax M2.5 Review

{minimax review content}

---

## Kimi K2.5 Review

{kimi review content}

---

## GLM-5 Review

{glm-5 review content}

---

## Claude Opus Review

{claude review content}

---

## Consensus Summary

{synthesize common concerns across all reviewers — weight issues by how many reviewers flagged them}

### Blockers (raised by 2+ reviewers)
{BLOCK-level issues that multiple reviewers independently identified — these are almost certainly real}

### Agreed Strengths
{strengths mentioned by 2+ reviewers}

### Agreed Concerns
{FLAG-level concerns raised by 2+ reviewers}

### Divergent Views
{where reviewers disagreed — worth investigating, may reveal genuine ambiguity in the plan}

### Unique Insights
{valuable points raised by only one reviewer that others missed — these are the blind spots the multi-model approach is designed to catch}
```

Commit:
```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs: cross-AI review for phase {N}" --files {phase_dir}/{padded_phase}-REVIEWS.md
```
</step>

<step name="present_results">
Display summary:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► REVIEW COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase {N} reviewed by {count} AI systems.

Consensus concerns:
{top 3 shared concerns}

Full review: {padded_phase}-REVIEWS.md

To incorporate feedback into planning:
  /gsd:plan-phase {N} --reviews
```

Clean up temp files.
</step>

</process>

<success_criteria>
- [ ] At least one external reviewer invoked successfully
- [ ] REVIEWS.md written with structured, dimension-based feedback
- [ ] Consensus summary synthesized with blocker/concern/insight categorization
- [ ] Temp files cleaned up
- [ ] User knows how to use feedback (/gsd:plan-phase --reviews)
</success_criteria>
