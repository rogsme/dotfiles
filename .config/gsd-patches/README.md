# GSD Patches (Canonical Source)

This directory is the single source of truth for local GSD customizations across runtimes.

## Layout

- `claude/` contains canonical files for `~/.claude/...`
- `opencode/` contains canonical files for `~/.config/opencode/...`
- `CLAUDE.md` contains canonical GSD patching instructions
- `bin/check` verifies drift and missing files
- `bin/sync` copies canonical files into live runtime locations
- `gsd-customizations.md` is the canonical changelog

## Canonical Rule

Edit files in this directory only. Do not directly edit runtime files unless recovering from an emergency.

`~/.claude/CLAUDE.md` is a small shim that points here.

## Usage

```bash
# Show versions and drift
~/.config/gsd-patches/bin/check all

# Sync both runtimes
~/.config/gsd-patches/bin/sync all

# Sync one runtime
~/.config/gsd-patches/bin/sync claude
~/.config/gsd-patches/bin/sync opencode
```

## Managed Files

Claude targets:

- `~/.claude/get-shit-done/workflows/review.md`
- `~/.claude/get-shit-done/workflows/ui-review.md`
- `~/.claude/get-shit-done/workflows/verify-work.md`
- `~/.claude/skills/gsd-review/SKILL.md`
- `~/.claude/skills/gsd-verify-work/SKILL.md`

OpenCode targets:

- `~/.config/opencode/get-shit-done/workflows/review.md`
- `~/.config/opencode/get-shit-done/workflows/ui-review.md`
- `~/.config/opencode/get-shit-done/workflows/verify-work.md`
- `~/.config/opencode/command/gsd-review.md`
- `~/.config/opencode/command/gsd-verify-work.md`

Instruction shim:

- `~/.claude/CLAUDE.md` -> `~/.config/gsd-patches/CLAUDE.md`
