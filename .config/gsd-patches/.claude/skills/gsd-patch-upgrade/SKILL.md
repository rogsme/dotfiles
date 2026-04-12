---
name: gsd-patch-upgrade
description: "Use this skill when the user wants to check for new GSD upstream versions, diff upstream changes against local patches, rebase patches on a new GSD release, or says 'upgrade patches', 'check upstream', 'new GSD version', 'rebase patches', 'diff upstream'. Not for day-to-day sync/check/recover — use /gsd-patches for that."
allowed-tools: Read Write Edit Bash Glob Grep Agent AskUserQuestion
---

Analyze upstream GSD changes between versions and update local patches in `~/.config/gsd-patches/`.

Read `~/.config/gsd-patches/.claude/skills/gsd-patch-upgrade/references/patch-update-workflow.md` for the full procedure.
