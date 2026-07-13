---
description: Executes a phase's plans by spawning executor subagents wave by wave — in parallel git worktrees when plans are disjoint — then runs an optional security audit and a verifier, and marks the phase complete.
argument-hint: "<phase-number> [--gaps-only]"
tools: { read: true, bash: true, glob: true, grep: true, edit: true, write: true, agent: true }
---
Read $HOME/.claude/skills/gsd-execute-phase/SKILL.md and execute it end-to-end with arguments: $ARGUMENTS
