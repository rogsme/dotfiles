---
name: gsd-review
description: Request cross-AI peer review of phase plans from external AI CLIs
argument-hint: "--phase N [--gemini] [--codex] [--minimax] [--kimi] [--glm-5] [--qwen] [--deepseek] [--claude] [--all]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
requires: [config, phase, plan-phase]
---

<objective>
Invoke external AI CLIs (Gemini, Codex, MiniMax M2.7, Kimi 2.6, GLM-5.1, Qwen 3.6 Plus, DeepSeek V4 Pro, Claude Opus) to independently review phase plans.
Produces a structured REVIEWS.md with per-reviewer feedback that can be fed back into
planning via /gsd-plan-phase --reviews.

**Flow:** Detect CLIs → Build review prompt → Invoke each CLI → Collect responses → Write REVIEWS.md
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/review.md
</execution_context>

<context>
Phase number: extracted from $ARGUMENTS (required)

**Flags:**
- `--gemini` — Include Gemini via Gemini CLI
- `--codex` — Include Codex via Codex CLI
- `--minimax` — Include MiniMax M2.7 via OpenCode
- `--kimi` — Include Kimi 2.6 via OpenCode
- `--glm-5` — Include GLM-5.1 via OpenCode
- `--qwen` — Include Qwen 3.6 Plus via OpenCode
- `--deepseek` — Include DeepSeek V4 Pro via OpenCode
- `--claude` — Include Claude Opus (separate session)
- `--all` — Include all available reviewers
</context>

<process>
Execute the review workflow from @$HOME/.claude/gsd-core/workflows/review.md end-to-end.
</process>
