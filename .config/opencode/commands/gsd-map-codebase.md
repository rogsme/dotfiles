---
description: Maps an existing codebase into seven structured reference docs under .planning/codebase/ (STACK, INTEGRATIONS, ARCHITECTURE, STRUCTURE, CONVENTIONS, TESTING, CONCERNS) using four parallel mapper subagents with fresh context.
argument-hint: "[--paths dir1,dir2]"
tools: { read: true, bash: true, glob: true, grep: true, edit: true, write: true, agent: true }
---
Read $HOME/.claude/skills/gsd-map-codebase/SKILL.md and execute it end-to-end with arguments: $ARGUMENTS
