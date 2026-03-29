# ~/.claude CLAUDE.md

## GSD Customizations

GSD (Get Shit Done) is installed at `~/.claude/get-shit-done/`. The `get-shit-done/` directory
gets wiped on every `/gsd:update`, so **never treat files inside it as permanent**.

### Patching GSD workflows

1. Edit the file directly in `~/.claude/get-shit-done/workflows/` (or `commands/`, `agents/`, etc.) and the corresponding `~/.claude/commands/gsd/` file if it exposes flags or model names
2. Back up the patched file to `~/.claude/gsd-patch-backups/`
3. Log the change in `~/.claude/gsd-customizations.md` — include: date, GSD version, files modified, what changed, why
4. Update the backups list in the Notes section of `gsd-customizations.md`

### After a `/gsd:update`

1. Try `/gsd:reapply-patches` first — the installer may have backed up modified files to `gsd-local-patches/`
2. If that fails, restore from `~/.claude/gsd-patch-backups/` — see `gsd-customizations.md` for the exact `cp` commands
3. If the new GSD version changed the structure of a patched file, use `gsd-customizations.md` to understand what was changed and why, then re-apply the patch manually to the new file

### Key files

- `~/.claude/gsd-customizations.md` — Changelog of all patches with rationale
- `~/.claude/gsd-patch-backups/` — Full copies of patched files (survives updates)
- `~/.claude/get-shit-done/VERSION` — Current GSD version

### Current patches

Patches use OpenCode (`opencode run -m <model> "<prompt>"`) for multi-model AI review
and `playwright-cli` for automated UI/API verification. See `gsd-customizations.md` for
full details. Summary:

- **review.md** — 6-model adversarial review (5 OpenCode models + Claude Opus) with 8-dimension deep prompt
- **ui-review.md** — Cross-AI UI perspectives after primary audit, score comparison table, severity-based fix routing
- **verify-work.md** — `--auto` flag for playwright/curl automated testing before interactive UAT
- **commands/gsd/review.md** — Flags and description synced with workflow (also wiped on update)
- **commands/gsd/verify-work.md** — Added `--auto` to argument-hint (also wiped on update)

When adding or removing reviewer models, update both `review.md` and `ui-review.md` —
they share the same model list but have independent invocation blocks and output templates.
