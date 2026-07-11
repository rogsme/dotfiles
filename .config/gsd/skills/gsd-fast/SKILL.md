---
name: gsd-fast
description: "Executes a trivial task inline — no subagents, no planning docs, just understand, do, commit, log. Use when the user says \"gsd fast\", \"quick fix\", \"just fix this typo\", or asks for a tiny out-of-band change like updating a config value, adding a missing import, renaming a variable, adding a .gitignore entry, or bumping a version number. Hard triviality gate: at most 3 file edits, about a minute of work, no research — anything bigger gets redirected to /gsd-quick. Commits with a conventional message and appends to STATE.md's Quick Tasks table if one exists."
argument-hint: <task description>
---

Read $HOME/.config/gsd/shared/conventions.md before doing anything — it defines project-root discovery, the .planning/ tree, commit conventions, config keys, and status vocabularies.

# GSD Fast

Execute a trivial task inline without subagent overhead. No PLAN.md, no subagent
spawning, no research, no plan checking. Just: understand → do → commit → log.

For tasks like: fix a typo, update a config value, add a missing import, rename a
variable, commit uncommitted work, add a .gitignore entry, bump a version number.

This is an interrupt, not a pipeline step — it works even outside a GSD project
(only the STATE.md logging step needs `.planning/`).

## 1. Parse the task

The arguments are the task description. If empty, ask:

> What's the quick fix? (one sentence)

## 2. Triviality check — the gate

**Before doing anything, verify this is actually trivial.** A task qualifies only
if ALL of these hold:

- ≤ 3 file edits
- ≤ about a minute of work
- No new dependencies or architecture changes
- No research needed

If it fails any of these (multi-file refactor, new feature, needs investigation),
do NOT proceed. Redirect and stop:

```
This looks like it needs planning. Use /gsd-quick instead:
  /gsd-quick "{task description}"
```

If mid-execution you discover it's bigger than it looked, or you're unsure how to
implement it — stop and redirect the same way rather than pushing through.

## 3. Execute inline

Do the work directly in the current context:

1. Read the relevant file(s)
2. Make the change(s)
3. Verify the change works — run existing tests if applicable, or a quick sanity
   check (build, typecheck, or eyeball the output)

**No subagents. No planning docs.** Just do it.

## 4. Commit

Commit atomically with a conventional message — no phase scope (conventions §5):

```bash
git add <the specific files you changed>
git commit -m "{type}: {concise description}"
```

Types: feat, fix, test, refactor, perf, docs, style, chore. Stage explicit paths;
never `git add -A`.

## 5. Log to STATE.md

If `.planning/STATE.md` exists and has a "Quick Tasks Completed" table, append a
row matching its schema (conventions §6: `# | Description | Date | Commit |
Directory`):

```
| {next #} | {task} | {YYYY-MM-DD} | {short hash} | — |
```

Directory is `—` (fast tasks create no directory). If STATE.md exists but the
table doesn't, add the table with this row. If there's no `.planning/`, skip
silently. If `planning.commit_docs` is true in config.json, amend or follow-up
commit the STATE.md change (`docs: log quick task`); if false, leave it unstaged.

## 6. Report

```
Done: {what was changed}
  Commit: {short hash}
  Files: {list of changed files}
```

No "Next up" routing — this is an interrupt, not a pipeline step. Just done.

## Guardrails

- NEVER spawn a subagent — this runs inline
- NEVER create PLAN.md or SUMMARY.md files
- More than 3 file edits, or any uncertainty → STOP, redirect to `/gsd-quick`
