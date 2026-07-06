---
name: gsd-map-codebase
description: Maps an existing codebase into seven structured reference docs under .planning/codebase/ (STACK, INTEGRATIONS, ARCHITECTURE, STRUCTURE, CONVENTIONS, TESTING, CONCERNS) using four parallel mapper subagents with fresh context. Triggers on "/gsd-map-codebase", "map the codebase", "analyze this codebase for GSD", "refresh the codebase map", or "remap src/ and packages/". Accepts --paths dir1,dir2 for an incremental remap scoped to those directories. Run before /gsd-new-project on brownfield code; re-run whenever the map drifts from reality.
argument-hint: "[--paths dir1,dir2]"
---

Read $HOME/.config/gsd/shared/conventions.md before doing anything — it defines project-root discovery, the .planning/ tree, commit conventions, config keys, and status vocabularies.

## Purpose

Produce the 7-doc codebase map that planners and executors navigate by. Each
mapper subagent explores one focus area with fresh context and writes its docs
directly to disk — the orchestrator only ever sees line counts, never document
bodies.

## Arguments

- `--paths dir1,dir2` (optional) — incremental remap: mappers scope exploration to
  these repo-relative prefixes instead of scanning the whole repo. Reject any path
  containing `..`, starting with `/`, or containing shell metacharacters
  (`;`, `` ` ``, `$`, `&`, `|`, `<`, `>`). If every provided path is invalid, say
  so and fall back to a full-repo run.

## Step 1 — Locate root and check existing maps

1. Resolve the project root: `git rev-parse --show-toplevel`, else the current
   directory. `.planning/` may not exist yet — this skill runs before
   `/gsd-new-project` on brownfield code. Create `.planning/codebase/` if missing.
   If the root has no recognizable source code at all, stop: nothing to map.
2. If `.planning/codebase/` already contains map docs, list them with line counts
   and ask (3 options):
   - **Re-map everything** — full fresh scan, docs overwritten.
   - **Re-map specific paths** — ask which directories, then treat as `--paths`.
   - **Keep as-is** — exit; the existing map stands.
3. Record `SCOPE` = the validated `--paths` list, or "full repo". Record the
   current commit: `git rev-parse HEAD` (this becomes `last_mapped_commit` in
   every doc's frontmatter; use `unknown` if there are no commits yet).

## Step 2 — Spawn 4 parallel mappers

Spawn four subagents IN ONE SINGLE MESSAGE — all four launches together, then stop
and wait for their completion notifications. Never poll, never read partial output.

Every prompt starts with:

> Read $HOME/.claude/skills/gsd-map-codebase/references/mapper-prompt.md and
> follow it.

then adds focus, scope, and outputs:

| Agent | Focus line | Writes to `.planning/codebase/` |
|-------|-----------|----------------------------------|
| 1 | `Focus: tech` | `STACK.md`, `INTEGRATIONS.md` |
| 2 | `Focus: arch` | `ARCHITECTURE.md`, `STRUCTURE.md` |
| 3 | `Focus: quality` | `CONVENTIONS.md`, `TESTING.md` |
| 4 | `Focus: concerns` | `CONCERNS.md` |

Each prompt must also carry, as plain lines:

- `Project root: {absolute path}`
- `Scope: {SCOPE}` — when scoped, exploration is restricted to those prefixes only
- `last_mapped_commit: {sha}` — stamp this into each doc's frontmatter
- `Today's date: {YYYY-MM-DD}` — never let the mapper guess the date
- `Output files: {the files from the table above, as absolute paths}`

Mappers write their documents directly to disk and return ONLY file paths with
line counts. If any mapper fails or returns nothing, re-spawn that one focus once;
if it fails again, note the gap and continue with what exists.

## Step 3 — Verify output

```bash
wc -l .planning/codebase/*.md
```

All 7 docs must exist (on a `--paths` run, docs not owned by the remap keep their
previous content — verify the refreshed ones changed) and be non-trivial: more
than 20 lines each and not just template placeholders. Spot-check one heading per
doc with grep rather than reading bodies. Missing or hollow doc → report which
focus failed and offer to re-run just that mapper.

## Step 4 — Secret scan (before any commit)

Grep the generated docs for obvious credential patterns:

```bash
grep -inE '(sk-[a-zA-Z0-9]{20,}|sk_(live|test)_[a-zA-Z0-9]+|ghp_[a-zA-Z0-9]{36}|glpat-[a-zA-Z0-9_-]+|AKIA[A-Z0-9]{16}|xox[baprs]-[a-zA-Z0-9-]+|-----BEGIN[A-Z ]*PRIVATE KEY|eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.|(api[_-]?key|token|password|secret)[[:space:]]*[:=][[:space:]]*[^[:space:]]{8,})' \
  .planning/codebase/*.md
```

Any hit: show the flagged lines, DO NOT commit, and ask the user to either edit
the docs or confirm the matches are not real secrets. Only proceed after
confirmation or cleanup.

## Step 5 — Commit

Honor `planning.commit_docs` if `.planning/config.json` exists (no config yet =
default true). Stage explicitly:

```bash
git add .planning/codebase/*.md
git commit -m "docs: map codebase"
```

Report the 7 docs with line counts and a one-line description each.

## Next up

- If `.planning/PROJECT.md` does not exist: `/gsd-new-project` — initialize the
  project using this map as brownfield context.
- Otherwise: `/gsd-discuss-phase {current}` — continue the pipeline; read
  `.planning/STATE.md` for the current phase number.

Suggestions, not gates — the user decides.
