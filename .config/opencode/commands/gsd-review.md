---
description: Runs a multi-model adversarial review of a phase's implementation plans before execution.
argument-hint: "<phase> [--only slug1,slug2]"
tools: { read: true, bash: true, glob: true, grep: true, edit: true, write: true, agent: true }
---
Read $HOME/.claude/skills/gsd-review/SKILL.md and execute it end-to-end with arguments: $ARGUMENTS
