---
description: Creates executable plan files ({NN}-{PP}-PLAN.md) for a roadmap phase by orchestrating planner and plan-checker subagents, with optional research.
argument-hint: "<phase-number> [--research] [--reviews] [--gaps]"
tools: { read: true, bash: true, glob: true, grep: true, edit: true, write: true, agent: true }
---
Read $HOME/.claude/skills/gsd-plan-phase/SKILL.md and execute it end-to-end with arguments: $ARGUMENTS
