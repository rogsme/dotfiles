# GSD Patch Workflow (Canonical)

This file is the canonical instruction set for local GSD customizations.

## Scope

These instructions apply only to patching GSD assets managed by `~/.config/gsd-patches/`:

- `claude/workflows/*`
- `claude/skills/gsd-*/SKILL.md`
- `opencode/workflows/*`
- `opencode/command/*`
- `gsd-customizations.md`

Runtime install paths (`~/.claude/get-shit-done`, `~/.config/opencode/get-shit-done`) are deployment targets, not source of truth.

## Edit Rules

1. Edit canonical files in `~/.config/gsd-patches/` only.
2. Do not edit runtime files directly except emergency recovery.
3. Log patch changes in `~/.config/gsd-patches/gsd-customizations.md`.
4. Re-sync both runtimes after edits:

```bash
~/.config/gsd-patches/bin/sync all
```

5. Validate drift/status:

```bash
~/.config/gsd-patches/bin/check all
```

## After `/gsd:update`

1. If needed, run runtime-native patch recovery first (`/gsd:reapply-patches` or `/gsd-reapply-patches`).
2. Re-apply canonical overlays:

```bash
~/.config/gsd-patches/bin/sync all
```

3. Verify clean state:

```bash
~/.config/gsd-patches/bin/check all
```

## Version Tracking

- Claude GSD version file: `~/.claude/get-shit-done/VERSION`
- OpenCode GSD version file: `~/.config/opencode/get-shit-done/VERSION`

When upstream versions diverge or major files change, update canonical patch files and document the migration in `gsd-customizations.md`.
