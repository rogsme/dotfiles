# GSD Patch Update Workflow

Update local GSD patches to align with a new upstream version while preserving custom features.

## Architecture

Canonical patch files live in `~/.config/gsd-patches/`. They are the single source of truth.
Runtime install paths (`~/.claude/...`, `~/.config/opencode/...`) are deployment targets synced via `bin/sync`.

### What we patch (and why we keep our versions)

- **review.md** (workflow) — 8-dimension adversarial review framework (upstream has simpler 5-point), parallel reviewer execution (upstream is sequential), custom reviewer set (Gemini CLI, Codex CLI, MiniMax M2.5, Kimi 2.5, GLM-5.1, Claude Opus via OpenCode), runtime-specific waiting strategies
- **ui-review.md** (workflow) — Cross-AI UI perspectives with score comparison tables and severity-based routing (upstream has none of this)
- **verify-work.md** (workflow) — CLI-based auto-verify with `--auto` flag using playwright-cli + curl (upstream uses Playwright-MCP which is inferior), security enforcement gate, text mode support
- **gsd-review** (skill/command) — Custom flags for our reviewer set
- **gsd-verify-work** (skill/command) — `--auto` flag support

### Directory layout

```
~/.config/gsd-patches/
├── claude/workflows/          # Claude workflow patches
├── claude/skills/gsd-*/       # Claude skill patches (SKILL.md format)
├── opencode/workflows/        # OpenCode workflow patches
├── opencode/command/          # OpenCode command patches (flat gsd-*.md)
├── bin/sync                   # Deploys patches to runtimes
├── bin/check                  # Validates no drift
├── CLAUDE.md                  # Canonical instructions
├── gsd-customizations.md      # Changelog
└── README.md
```

### Mapping: patch file → upstream source → deploy target

| Patch file | Upstream source | Claude target | OpenCode target |
|---|---|---|---|
| `claude/workflows/review.md` | `get-shit-done/workflows/review.md` | `~/.claude/get-shit-done/workflows/review.md` | — |
| `claude/workflows/ui-review.md` | `get-shit-done/workflows/ui-review.md` | `~/.claude/get-shit-done/workflows/ui-review.md` | — |
| `claude/workflows/verify-work.md` | `get-shit-done/workflows/verify-work.md` | `~/.claude/get-shit-done/workflows/verify-work.md` | — |
| `claude/skills/gsd-review/SKILL.md` | `commands/gsd/review.md` (converted at install) | `~/.claude/skills/gsd-review/SKILL.md` | — |
| `claude/skills/gsd-verify-work/SKILL.md` | `commands/gsd/verify-work.md` (converted at install) | `~/.claude/skills/gsd-verify-work/SKILL.md` | — |
| `opencode/workflows/review.md` | `get-shit-done/workflows/review.md` (path-adapted) | — | `~/.config/opencode/get-shit-done/workflows/review.md` |
| `opencode/workflows/ui-review.md` | `get-shit-done/workflows/ui-review.md` (path-adapted) | — | `~/.config/opencode/get-shit-done/workflows/ui-review.md` |
| `opencode/workflows/verify-work.md` | `get-shit-done/workflows/verify-work.md` (path-adapted) | — | `~/.config/opencode/get-shit-done/workflows/verify-work.md` |
| `opencode/command/gsd-review.md` | `commands/gsd/review.md` (frontmatter-converted) | — | `~/.config/opencode/command/gsd-review.md` |
| `opencode/command/gsd-verify-work.md` | `commands/gsd/verify-work.md` (frontmatter-converted) | — | `~/.config/opencode/command/gsd-verify-work.md` |

Note: Upstream has a single source file per workflow/command. The install.js script converts paths and frontmatter at install time for different runtimes. Our patches maintain separate Claude and OpenCode variants for full control.

## Procedure

### Phase 1: Setup

1. Remove `/tmp/get-shit-done` if it exists.
2. Clone the upstream repo:
   ```bash
   git clone --quiet git@github.com:gsd-build/get-shit-done.git /tmp/get-shit-done
   ```
3. Detect the current patch base version from the first `**GSD version:**` line in `~/.config/gsd-patches/gsd-customizations.md`.
4. Detect the latest upstream version from `/tmp/get-shit-done/package.json` (field: `version`) or the latest git tag (`git describe --tags --abbrev=0`).
5. If they match, report "Patches are up to date with upstream vX.Y.Z" and exit.

### Phase 2: Analyze upstream changes

1. Run `git log --oneline v{current}...v{latest}` in `/tmp/get-shit-done` to get commit summary.
2. Run `git diff --stat v{current}...v{latest}` for overall change scope.
3. For each upstream file we patch, run `git diff v{current}...v{latest} -- {path}` to get the actual diff. The upstream files to check:
   - `get-shit-done/workflows/review.md`
   - `get-shit-done/workflows/ui-review.md`
   - `get-shit-done/workflows/verify-work.md`
   - `commands/gsd/review.md`
   - `commands/gsd/verify-work.md`
   - `commands/gsd/ui-review.md`
4. Also check `CHANGELOG.md` for release notes between the two versions.

### Phase 3: Compare and classify changes

For each upstream file that changed, read both the upstream v{latest} version and our current patch. Classify every upstream change into one of:

- **ADOPT** — Useful improvement that doesn't conflict with our customizations (new gsd-tools.cjs calls, security features, error handling, new config keys, text mode support)
- **SKIP** — Conflicts with our approach or we already have something better (Playwright-MCP, SELF_CLI skip, sequential execution, different reviewer set)
- **CONFLICT** — Same section changed differently; needs manual decision

**Rules for classification:**
- Our 8-dimension adversarial review framework always wins over upstream's simpler review format.
- Our parallel reviewer execution always wins over upstream's sequential approach.
- Our cross-AI UI perspectives are always kept (upstream has nothing equivalent).
- Our playwright-cli + curl auto-verify always wins over Playwright-MCP.
- Our custom reviewer set (MiniMax, Kimi, GLM-5 via OpenCode) is kept unless the user wants changes.
- Claude is always kept as a reviewer even when running inside Claude Code (no SELF_CLI skip).
- New upstream infrastructure (security gates, config keys, text mode, error handling) is generally adopted.
- New upstream CLIs/reviewers are presented as options but not adopted by default.

### Phase 4: Present findings

If no upstream files we patch have changed, report "No changes to patched files between v{current} and v{latest}" and exit.

Otherwise, present a structured summary:

```
## Upstream Changes: v{current} → v{latest}

### {N} commits, {M} files changed overall

### Changes to patched files:

**review.md** — {summary}
- ADOPT: {list}
- SKIP: {list}
- CONFLICT: {list}

**ui-review.md** — {summary}
...

**verify-work.md** — {summary}
...

**commands** — {summary}
...
```

Use AskUserQuestion for any CONFLICT items or ADOPT items that have trade-offs. Keep questions focused and specific — one question per decision, with clear options and recommendations.

If all changes are SKIP with no ADOPT or CONFLICT items, report "No actionable changes for our patches" and exit.

### Phase 5: Plan

Present a concrete plan listing every file to modify and the exact changes. Format:

```
## Update Plan: v{current} → v{latest}

### File: claude/workflows/review.md
- Change 1: {description}
- Change 2: {description}

### File: opencode/workflows/review.md
- Mirror claude changes with OpenCode paths

...

### Files unchanged:
- {list}
```

Wait for user approval. Go back and forth if the user has questions, concerns, or changes. Do not proceed until the user confirms.

### Phase 6: Apply changes

1. Edit each patch file as planned.
2. For OpenCode variants: mirror Claude changes but use `$HOME/.config/opencode/...` paths, `multi_tool_use.parallel` waiting strategy (instead of `run_in_background`), and OpenCode frontmatter format for commands.
3. Update `gsd-customizations.md` with a new entry at the top:
   ```markdown
   ## {date} — {short description}

   **GSD version:** {latest}
   **Files modified:** {list}

   ### What changed
   {bullet list of changes}

   ### Why
   {rationale}
   ```
4. Run `~/.config/gsd-patches/bin/sync all`.
5. Run `~/.config/gsd-patches/bin/check all`.
6. Report results. Both must show clean status.

## Key differences between Claude and OpenCode patches

| Aspect | Claude | OpenCode |
|--------|--------|----------|
| Skill/command format | `skills/gsd-*/SKILL.md` with `name: gsd-xxx` | `command/gsd-*.md` with flat frontmatter |
| Paths | `$HOME/.claude/get-shit-done/...` | `$HOME/.config/opencode/get-shit-done/...` |
| Agent paths | `$HOME/.claude/agents/...` | `$HOME/.config/opencode/agents/...` |
| Parallel execution | `run_in_background: true` on Bash calls | `multi_tool_use.parallel` batch |
| AskUserQuestion | Native tool | `question` tool (or text mode fallback) |
| Tool names in frontmatter | YAML list: `allowed-tools:` | Boolean map: `tools: { read: true }` |
