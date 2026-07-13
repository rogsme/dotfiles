---
description: Runs an adversarial multi-model review of the actual git diff a phase produced — the code, not the plans and not the SUMMARY claims.
argument-hint: "<phase> [--base <sha>] [--only slug1,slug2]"
tools: { read: true, bash: true, glob: true, grep: true, edit: true, write: true, agent: true }
---
Read $HOME/.claude/skills/gsd-code-review/SKILL.md and execute it end-to-end with arguments: $ARGUMENTS
