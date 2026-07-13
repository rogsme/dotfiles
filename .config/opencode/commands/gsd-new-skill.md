---
description: Scaffolds a new gsd-* skill into the GSD system — gathers the design, writes the SKILL.md and any subagent prompts in the house pattern, wires the contract seams, deploys, and records the change.
argument-hint: "<skill-name or purpose>"
tools: { read: true, bash: true, glob: true, grep: true, edit: true, write: true, agent: true }
---
Read $HOME/.claude/skills/gsd-new-skill/SKILL.md and execute it end-to-end with arguments: $ARGUMENTS
