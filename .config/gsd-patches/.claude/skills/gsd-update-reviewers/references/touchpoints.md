# Reviewer Touchpoints Reference

Every OpenCode reviewer model appears in these exact locations across 5 canonical files.
All paths are relative to `~/.config/gsd-patches/`.

## File 1 & 2: `claude/workflows/review.md` and `opencode/workflows/review.md`

These files are structurally identical except for the waiting strategy section (Claude Code vs OpenCode).

### T1. Model list (after CLI detection block)

```
Available OpenCode reviewer models:
- `gemini` → `lazer/gemini-3.1-pro` (variant: high)
- `{slug}` → `{model_id}` (variant: high)        ← INSERT/UPDATE HERE
```

Insert new entries before the blank line that follows the last model. Keep alphabetical-ish order
(current convention: gemini, minimax, kimi, glm-5, qwen, deepseek — roughly by addition date).

### T2. Flag list

```
Parse flags from `$ARGUMENTS`:
- `--gemini` → include Gemini Pro via OpenCode
- `--{slug}` → include {display_name} via OpenCode  ← INSERT/UPDATE HERE
- `--claude` → include Claude Opus (separate session)
```

Insert before `--claude`. Claude is always last.

### T3. Command block (inside ```bash fence)

```bash
# {Display Name}
opencode run -m {model_id} --variant high "$(cat /tmp/gsd-review-prompt-{phase}.md)" 2>/dev/null > /tmp/gsd-review-{slug}-{phase}.md
```

Insert before `# Claude Opus`. Each command block is: comment + command + blank line.

### T4. Status display

```
◆ {Display Name}...     done ✓ (N lines)
```

Insert before `◆ Claude Opus...`. Align with surrounding lines (padding varies).

### T5. Reviewers frontmatter array

```yaml
reviewers: [gemini, codex, minimax, kimi, glm-5, qwen, deepseek, claude]
```

Insert slug before `claude`. Single line, comma-separated.

### T6. Review output section

```markdown
## {Display Name} Review

{{slug} review content}

---
```

Insert before `## Claude Opus Review`.

## File 3 & 4: `claude/workflows/ui-review.md` and `opencode/workflows/ui-review.md`

These files are structurally identical except for the waiting strategy section.

### T7. Command block (inside ```bash fence, same pattern as T3)

```bash
# {Display Name}
opencode run -m {model_id} --variant high "$(cat /tmp/gsd-ui-review-prompt-{phase}.md)" 2>/dev/null > /tmp/gsd-ui-review-{slug}-{phase}.md
```

Insert before `# Claude Opus`. Note: temp file prefix is `gsd-ui-review-` (not `gsd-review-`).

### T8. Status display (indented, same pattern as T4 but indented 2 spaces)

```
  ◆ {Display Name}...             done ✓ (N lines)
```

Insert before `  ◆ Claude Opus...`. Note 2-space indent.

### T9. Review output section (shorter header than T6)

```markdown
## {Display Name}

{{slug} review content}

---
```

Insert before `## Claude Opus`. Note: no "Review" suffix in ui-review section headers.

### T10. Score comparison table

Header row — insert column before `Claude`:
```
| Pillar | Primary | Gemini | Codex | MiniMax | Kimi | GLM-5.1 | Qwen | DeepSeek | {New} | Claude | Avg |
```

Separator row — add matching `------|` segment.

Data rows — add `{N}/4 |` cell before Claude's cell:
```
| Copywriting | {N}/4 | {N}/4 | ... | {N}/4 | {N}/4 | {avg} |
```

Total row — add `**/24** |` cell before Claude's cell.

## File 5: `opencode/command/gsd-review.md`

### T11. argument-hint (frontmatter)

```yaml
argument-hint: "--phase N [--gemini] [--codex] ... [--{slug}] [--claude] [--all]"
```

Insert `[--{slug}]` before `[--claude]`.

### T12. Objective text

```
Invoke external AI CLIs (Gemini, Codex, ..., {Display Name}, Claude Opus) to independently review phase plans.
```

Insert display name before `Claude Opus`.

### T13. Flag list

```
- `--{slug}` - Include {Display Name} via OpenCode
```

Insert before `--claude` line.

## File 6: `gsd-customizations.md`

### T14. Changelog entry

Insert new entry after the `---` that follows the header, before the first existing entry.
Follow the established format:

```markdown
## {date} — {summary}

**GSD version:** {version from VERSION file}
**Files modified:** claude/workflows/review.md, claude/workflows/ui-review.md, opencode/workflows/review.md, opencode/workflows/ui-review.md, opencode/command/gsd-review.md

### What changed

- {description of change}
- Now {N} total reviewers ({M} OpenCode + Codex CLI + Claude Opus)

### Why

{rationale}
```

## Special Reviewers (not OpenCode)

- **codex**: Uses `codex exec --skip-git-repo-check` (Codex CLI). Only appears in command blocks and output sections, not in the OpenCode model list.
- **claude**: Uses `claude -p --model opus` (Claude CLI). Always last in every list. Only appears in command blocks and output sections, not in the OpenCode model list.
- **gemini**: Uses `opencode run -m lazer/gemini-3.1-pro` (routed through OpenCode, not Gemini CLI).

When adding/updating/removing, only touch OpenCode model entries. Do not modify codex or claude entries unless explicitly asked.
