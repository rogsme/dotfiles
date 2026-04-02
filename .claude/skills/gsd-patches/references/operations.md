# Operations

Use these runbooks for common patch maintenance tasks.

## 1) Sync Canonical Patches

```bash
~/.config/gsd-patches/bin/sync all
~/.config/gsd-patches/bin/check all
```

If `check` reports drift, inspect target files and update canonical source files first.

## 2) Add or Update a Patch

1. Edit relevant canonical file(s) under `~/.config/gsd-patches/`.
2. Update `~/.config/gsd-patches/gsd-customizations.md` with what changed and why.
3. Run sync/check commands.
4. Confirm both Claude and OpenCode targets are `OK`.

## 3) Port a Change Between Runtimes

1. Use `references/file-map.md` to find source and destination canonical files.
2. Apply behavior changes with runtime-specific path/command differences preserved.
3. Run sync/check commands.

## 4) Recover After GSD Update

1. Optional fallback: run runtime-native reapply command (`/gsd:reapply-patches` or `/gsd-reapply-patches`).
2. Re-apply canonical patches:

```bash
~/.config/gsd-patches/bin/sync all
~/.config/gsd-patches/bin/check all
```

3. If `check` fails, reconcile differences in canonical files, then re-run sync/check.

## 5) Drift Investigation

1. Run `~/.config/gsd-patches/bin/check all`.
2. For each `DIFF` or `MISSING`, compare the affected canonical and runtime file.
3. Decide whether runtime drift is intentional:
   - If intentional: move the change into canonical files.
   - If not intentional: run `sync` to restore canonical behavior.

## 6) Retire Obsolete Behavior

1. Remove or update canonical patch content.
2. Add a note to `gsd-customizations.md` indicating the retirement.
3. Sync and check both runtimes.
