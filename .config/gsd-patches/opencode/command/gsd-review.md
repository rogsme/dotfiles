---
description: Request cross-AI peer review of phase plans from external AI CLIs
argument-hint: "--phase N [--gemini] [--codex] [--minimax] [--kimi] [--glm-5] [--claude] [--all]"
tools:
  read: true
  write: true
  bash: true
  glob: true
  grep: true
---

<objective>
Invoke external AI CLIs (Gemini, Codex, MiniMax M2.5, Kimi K2.5, GLM-5, Claude Opus) to independently review phase plans.
Produces a structured REVIEWS.md with per-reviewer feedback that can be fed back into
planning via /gsd-plan-phase --reviews.

**Flow:** Detect CLIs -> Build review prompt -> Invoke each CLI -> Collect responses -> Write REVIEWS.md
</objective>

<execution_context>
@$HOME/.config/opencode/get-shit-done/workflows/review.md
</execution_context>

<context>
Phase number: extracted from $ARGUMENTS (required)

**Flags:**
- `--gemini` - Include Gemini via Gemini CLI
- `--codex` - Include Codex via Codex CLI
- `--minimax` - Include MiniMax M2.5 via OpenCode
- `--kimi` - Include Kimi K2.5 via OpenCode
- `--glm-5` - Include GLM-5 via OpenCode
- `--claude` - Include Claude Opus (separate session)
- `--all` - Include all available reviewers
</context>

<process>
Execute the review workflow from @$HOME/.config/opencode/get-shit-done/workflows/review.md end-to-end.
</process>
