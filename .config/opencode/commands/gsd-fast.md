---
description: Executes a trivial task inline — no subagents, no planning docs, just understand, do, commit, log.
argument-hint: "<task description>"
tools: { read: true, bash: true, glob: true, grep: true, edit: true, write: true, agent: true }
---
Read $HOME/.claude/skills/gsd-fast/SKILL.md and execute it end-to-end with arguments: $ARGUMENTS
