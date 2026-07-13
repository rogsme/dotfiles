---
description: Maintains the shared reviewer registry that powers gsd-review, gsd-code-review, and gsd-ui-review.
argument-hint: "add|update|remove|list|test [slug] [model-id]"
tools: { read: true, bash: true, glob: true, grep: true, edit: true, write: true, agent: true }
---
Read $HOME/.claude/skills/gsd-update-reviewers/SKILL.md and execute it end-to-end with arguments: $ARGUMENTS
