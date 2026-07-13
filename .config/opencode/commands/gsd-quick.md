---
description: Runs a small out-of-band task through a lightweight plan-then-execute loop with fresh-context subagents.
argument-hint: "<task description>"
tools: { read: true, bash: true, glob: true, grep: true, edit: true, write: true, agent: true }
---
Read $HOME/.claude/skills/gsd-quick/SKILL.md and execute it end-to-end with arguments: $ARGUMENTS
