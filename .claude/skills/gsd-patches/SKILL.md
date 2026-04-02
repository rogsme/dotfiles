---
name: gsd-patches
description: >-
  Use this skill when the user wants to update, sync, port, audit, or recover
  custom GSD patches across Claude and OpenCode, mentions
  ~/.config/gsd-patches, gsd-customizations.md, patch drift, or asks for help
  after /gsd:update or /gsd-update.
argument-hint: "[sync|check|recover|port|add|update]"
---

# GSD Patches

Maintain GSD patches through the canonical directory at `~/.config/gsd-patches/`.

## Load Context First

Read these files before making changes:

1. `~/.config/gsd-patches/CLAUDE.md`
2. `~/.config/gsd-patches/README.md`
3. `~/.config/gsd-patches/gsd-customizations.md` (when rationale/history matters)

Read references as needed:

- `references/file-map.md` for canonical-to-runtime mapping
- `references/operations.md` for step-by-step runbooks

## Rules

1. Edit canonical files in `~/.config/gsd-patches/` only.
2. Treat runtime files in `~/.claude/` and `~/.config/opencode/` as deployment targets.
3. Never use legacy `~/.claude/gsd-patch-backups/` workflow.
4. Keep Claude and OpenCode canonical patch variants aligned when behavior should match.
5. After any change, run:

```bash
~/.config/gsd-patches/bin/sync all
~/.config/gsd-patches/bin/check all
```

## Default Workflow

1. Identify which patch files are affected.
2. Update canonical files under `~/.config/gsd-patches/`.
3. Update `~/.config/gsd-patches/gsd-customizations.md` if behavior changed.
4. Sync and verify with `bin/sync` and `bin/check`.
5. Report changed files and verification result.

## Recovery After GSD Update

1. Optionally run runtime-native reapply command first (`/gsd:reapply-patches` or `/gsd-reapply-patches`).
2. Re-apply canonical overlays:

```bash
~/.config/gsd-patches/bin/sync all
~/.config/gsd-patches/bin/check all
```

3. If check reports drift, resolve in canonical files and re-run sync/check.
