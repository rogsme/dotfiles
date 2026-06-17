---
name: gsd-update-reviewers
description: >
  Use this skill when the user wants to add, update, remove, or list adversarial reviewer
  models used by /gsd-review and /gsd-ui-review. Triggers on: "add reviewer", "update model",
  "remove reviewer", "change model", "swap model", "new reviewer", "drop reviewer",
  "reviewer models", "adversarial models", or mentions a lazer/ model ID in the context
  of reviews. Handles consistent edits across all 5 canonical workflow files, changelog
  update, and sync+check.
---

Manage the adversarial reviewer model set used by GSD cross-AI review and UI review workflows.

## Canonical Files

All source files live under `~/.config/gsd-patches/`. Never edit runtime files directly.

| File | Contains |
|------|----------|
| `claude/workflows/review.md` | Claude review workflow |
| `claude/workflows/ui-review.md` | Claude UI review workflow |
| `opencode/workflows/review.md` | OpenCode review workflow |
| `opencode/workflows/ui-review.md` | OpenCode UI review workflow |
| `opencode/command/gsd-review.md` | OpenCode review command metadata |
| `gsd-customizations.md` | Patch changelog |

## Operations

### Parse Intent

Extract from `$ARGUMENTS` or conversation:

- **Operation**: `add` | `update` | `remove` | `list`
- **Slug**: short lowercase identifier for flags/filenames (e.g., `qwen`, `deepseek`)
- **Model ID**: full lazer/ model path (e.g., `lazer/qwen-3.6-plus`)
- **Display Name**: human-readable name for headers/status (e.g., `Qwen 3.6 Plus`)

If any required field is ambiguous, ask before proceeding.

For `update`: also need the old slug/model ID to find-and-replace.

### List

Read `claude/workflows/review.md` lines 23-28 (model list section). Display the current
reviewer set as a table with slug, model ID, and provider.

### Add

Read `references/touchpoints.md` for exact insertion patterns (T1-T14).

For each of the 5 workflow files, apply all relevant touchpoints:

**review.md (claude + opencode) — 6 touchpoints each:**
1. T1: Add to model list
2. T2: Add flag
3. T3: Add command block
4. T4: Add status line
5. T5: Add to reviewers array
6. T6: Add review output section

**ui-review.md (claude + opencode) — 4 touchpoints each:**
1. T7: Add command block
2. T8: Add status line (2-space indent)
3. T9: Add review output section (no "Review" suffix)
4. T10: Add score table column (header + separator + 6 data rows + total row)

**gsd-review.md (opencode command) — 3 touchpoints:**
1. T11: Add to argument-hint
2. T12: Add to objective text
3. T13: Add flag

**Insertion rule**: new OpenCode models go before `claude` (which is always last). Place
after the last existing OpenCode model in each list.

**Command template** (review.md):
```bash
# {Display Name}
opencode run -m {model_id} --variant high "$(cat /tmp/gsd-review-prompt-{phase}.md)" 2>/dev/null > /tmp/gsd-review-{slug}-{phase}.md
```

**Command template** (ui-review.md):
```bash
# {Display Name}
opencode run -m {model_id} --variant high "$(cat /tmp/gsd-ui-review-prompt-{phase}.md)" 2>/dev/null > /tmp/gsd-ui-review-{slug}-{phase}.md
```

### Update

For model ID changes (e.g., `lazer/kimi-2.5` → `lazer/kimi-2.6`):
- Use replace_all on the old model ID string in each file.

For display name changes (e.g., `Kimi 2.5` → `Kimi 2.6`):
- Use replace_all on the old display name in each file.

For slug changes (rare — affects flags, filenames, arrays):
- Treat as remove old + add new.

### Remove

Reverse of add. For each touchpoint, remove the corresponding line(s) or section.

For score table (T10): remove the column from header, separator, all data rows, and total row.

## After All Edits

### 1. Update Changelog

Read current GSD version:
```bash
cat ~/.claude/gsd-core/VERSION
```

Add entry to top of `gsd-customizations.md` (after the header, before first existing entry).
Count total reviewers (OpenCode models + Codex CLI + Claude Opus).

### 2. Sync and Verify

```bash
~/.config/gsd-patches/bin/sync all
~/.config/gsd-patches/bin/check all
```

Both must complete clean. If check reports drift, investigate before reporting success.

### 3. Report

Display the updated reviewer table showing all current models with slug, model ID, and provider.
