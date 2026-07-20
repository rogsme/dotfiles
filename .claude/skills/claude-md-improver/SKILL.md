---
name: claude-md-improver
description: Audit and improve effective CLAUDE.md instructions. Use when asked to check, update, fix, or optimize repository CLAUDE.md files, scoped rules, imports, or project memory.
compatibility: Runs in Claude Code or OpenCode; audits Claude Code instruction semantics and notes OpenCode compatibility when relevant.
---

# CLAUDE.md Improver

Audit first. Do not modify instruction files until the user approves proposed diffs.

## 1. Establish Scope

- Identify the repository root and the directory from which the agent is expected to run.
- Inspect exact user and managed instruction locations only when they can affect that repository. Do not scan unrelated home directories.
- Exclude dependency, vendor, cache, generated, build, coverage, VCS, and tool-output directories unless the repository explicitly treats one as source.

## 2. Resolve Effective Instructions

Build the instruction set Claude Code would receive, including:

- managed policy `CLAUDE.md` for the current platform, when accessible
- `~/.claude/CLAUDE.md` and `~/.claude/rules/**/*.md`
- ancestor `CLAUDE.md` and `CLAUDE.local.md` files from the working directory upward
- repository `CLAUDE.md`, `.claude/CLAUDE.md`, and root `CLAUDE.local.md`
- nested `CLAUDE.md` and `CLAUDE.local.md` files, mapped to the subtrees where they load
- `.claude/rules/**/*.md`, including each rule's `paths` scope
- active `@path` imports, resolved relative to the importing file and followed recursively within Claude Code's supported depth
- configured exclusions or alternate setting sources that change what loads

Record load order, effective scope, lazy-loading behavior, and conflicts. Imports reorganize content but do not reduce startup context.

If OpenCode is also used, check whether `AGENTS.md`, OpenCode instruction configuration, or disabled Claude compatibility changes which instructions OpenCode sees. Do not expand a CLAUDE.md audit into an unrelated configuration audit.

## 3. Gather Repository Evidence

Read relevant manifests, scripts, CI files, tool configs, source layout, and maintained docs before judging instructions. Prefer static evidence and read-only inspection.

- Verify paths and command names against repository files.
- Run only safe, read-only or non-destructive validation when it materially resolves uncertainty.
- Never run deploy, publish, destructive, infrastructure-apply, production, or migration commands merely to validate documentation.
- Label claims as verified, contradicted, or unverified; do not infer that a command works from its name alone.

Use [quality-criteria.md](references/quality-criteria.md) to classify findings.

## 4. Report Before Editing

Return an evidence-based report with no score or grade:

```markdown
## Instruction Audit

### Effective Hierarchy
| Source | Effective scope/load point | Evidence |
|---|---|---|

### Findings
#### [Stale | Conflicting | Missing | Over-broad | Derivable | Unclear]
- **Location:** `path:line`
- **Evidence:** repository fact or instruction interaction
- **Impact:** concrete agent behavior or context cost
- **Recommendation:** keep, remove, move, scope, or rewrite

### Proposed Diffs
#### `path`
**Why:** concise evidence-based reason
```diff
 exact proposed change
```

### Unverified
- Claim and what would verify it safely
```

Show every proposed diff, including deletions and moves, then stop for approval. A general request to audit is not approval to edit.

## 5. Apply Approved Changes

After explicit approval:

- Re-read each target file so concurrent changes are preserved.
- Apply only the approved hunks; ask again before materially altering them.
- Keep instructions concise, imperative, repository-specific, and correctly scoped.
- Preserve useful existing structure and local instructions.
- Re-resolve imports, paths, scopes, and contradictions after editing.
- Report changed files and any validation not performed.

Use [templates.md](references/templates.md) only for minimal syntax examples and [update-guidelines.md](references/update-guidelines.md) when drafting changes.
