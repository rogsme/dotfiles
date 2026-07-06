---
name: gsd-modify
description: Guided safe-change workflow for modifying the GSD system itself — skills, subagent prompts, templates, and shared docs under ~/.config/gsd/. Use when the user says "modify gsd", "change how gsd works", "edit the planner prompt", "tweak the execute workflow", "update a gsd skill/template/prompt", "make gsd do X differently", or "change the review dimensions". Checks the change against recorded invariants and decisions, maps the full seam impact surface before editing, updates all contract counterparts together, verifies with bin/check, and records a CHANGELOG entry.
argument-hint: "<what to change>"
---

Read $HOME/.config/gsd/shared/conventions.md before doing anything — it defines the
shared asset paths and house style this skill edits within.

# Modify GSD

Change the GSD system safely. The whole value of this skill is two guarantees:
a change never silently reverses a recorded decision (that exact failure caused
the 2026-04-26 UAT regression in the old patch system), and a change never breaks
a contract seam (adversarial verification at build time found 11 seam bugs — the
seams are where changes go wrong).

**Argument:** a description of what to change (required). If missing, ask.

## 1. Locate

Parse what behavior the user wants changed and map it to the owning canonical
file(s) under `$HOME/.config/gsd/`:

- `skills/gsd-*/SKILL.md` — a skill's workflow, triggers, or steps.
- `skills/gsd-*/references/*.md` — a subagent prompt (planner, executor,
  verifier, researcher, auditor, debugger, mappers…).
- `shared/templates/*.md` — a `.planning/` artifact format.
- `shared/conventions.md` — layout, naming, commits, statuses, the pipeline.
- `shared/reviewers.md` — the reviewer registry.

Typical mappings:

| Request sounds like | Owner |
|---|---|
| "plans should also capture X" | `gsd-plan-phase/references/planner-prompt.md` (+ seam S1) |
| "executors should commit differently" | `gsd-execute-phase/references/executor-prompt.md` (+ S6) |
| "change the review dimensions" | `gsd-review/SKILL.md` + siblings' shared framework (+ S4) |
| "SUMMARY files need a new field" | `shared/templates/summary.md` + executor-prompt (+ S2) |
| "commit messages should…" | `shared/conventions.md` §5 |
| "swap Gemini for another model" | redirect: `/gsd-update-reviewers` |

Rules and redirects:

- **NEVER edit runtime paths.** `~/.claude/skills/gsd-*` are symlinks to the
  canonical files — edits there would land anyway, but always name and open the
  canonical `$HOME/.config/gsd/...` path so it's unambiguous what was changed.
- Reviewer-panel change (swap a model, adjust a timeout, add a reviewer) →
  redirect to `/gsd-update-reviewers`.
- Brand-new skill → redirect to `/gsd-new-skill`.

If the request maps to nothing, say so and ask the user to point at the behavior
(which skill, which step) rather than guessing.

## 2. Decision awareness (MANDATORY — before any edit)

Read `$HOME/.config/gsd/shared/invariants.md` in full and skim the entries in
`$HOME/.config/gsd/CHANGELOG.md`. Then judge the requested change against both.

If the change would violate an invariant or reverse a decision recorded in the
changelog: **STOP.** Show the user the exact invariant or entry, quoted, with its
recorded rationale, and ask explicitly (2–4 options):

- **Proceed anyway** — this becomes a deliberate invariant change: the edit to
  `invariants.md` is now part of this change, and the CHANGELOG entry in step 6
  must state the invariant change and its new rationale.
- **Adjust the request** — reshape the change so it stays inside the law.
- **Abort** — no edits.

Never silently re-adopt behavior the invariants prohibit. "The user asked for it"
is not silence-proof — the user may not know the decision exists; showing them
the rationale IS the job.

## 3. Impact analysis

Consult `$HOME/.config/gsd/shared/seams.md`. For each target file, list every
seam (S1–S10) it participates in and name the counterpart files that must stay
in agreement. Common cases:

- A planner-prompt schema change touches S1 (plan template, execute-phase reads,
  plan-checker, quick) and possibly S5 (security chain).
- An executor-prompt change touches S2 (SUMMARY consumers), S6 (commit-scope
  grep), S9 (worktree protocol).
- A pipeline-order change touches S7 (conventions §10 plus both neighbor skills'
  Next-up blocks).
- Any SKILL.md frontmatter change touches S10 (OpenCode wrappers).

Present the full change surface before editing:

| Surface | Files |
|---|---|
| Targets | {files the change lands in} |
| Seam counterparts | {per seam: counterpart files to update} |
| Invariants touched | {none, or the invariant lines from step 2} |

In `interactive` spirit: when the surface is more than one file, confirm with the
user before editing. A single-file change with no seam counterparts and no
invariant contact may proceed directly.

## 4. Apply

Make the edits, matching each file's surrounding style and structure (voice,
heading depth, table shapes, blockquote prompt format). Because
`~/.claude/skills/gsd-*` are symlinks, edits to canonical files are live
immediately — no sync step, no deploy.

- **Update ALL seam counterparts in the same change.** Example: a new PLAN
  frontmatter field goes into the planner-prompt schema AND
  `shared/templates/plan.md` AND the execute-phase reads AND the plan-checker —
  in one pass, not "later".
- If the change creates a new seam or changes the shape of an existing one,
  update `shared/seams.md` too — it must describe reality after the change.
- If the change alters an invariant (user chose "proceed anyway" in step 2),
  edit `shared/invariants.md` now: reword or remove the old line, add the new
  law if one replaces it.
- Skills reference conventions.md rather than restating it — if the change is a
  rule every skill must follow, it belongs in conventions.md, not copied into
  each SKILL.md.

## 5. Verify

1. Run `$HOME/.config/gsd/bin/check` — it must end `Status: clean`. Anything
   else: fix before continuing.
2. If any SKILL.md frontmatter changed (`name`, `description`, `argument-hint`):
   run `$HOME/.config/gsd/bin/gen-opencode` to regenerate the wrappers (seam S10).
3. Re-read each seam counterpart edited in step 4 and confirm both sides now
   agree — quote the agreeing lines briefly (one line per side is enough). This
   is the step that catches the half-updated seam.
4. For behavior changes to a workflow skill, offer a quick end-to-end sanity
   read of the modified SKILL.md: read it top to bottom checking internal
   consistency — every step references files, sections, and subagent prompts
   that exist; the Next-up block matches conventions §10.

## 6. Record

Append a CHANGELOG entry at the TOP of `$HOME/.config/gsd/CHANGELOG.md` — after
the preamble, before the first `## ` entry. Existing entries are immutable:
never edit, reword, or delete them.

```markdown
## {YYYY-MM-DD} — {one-line summary of the change}

**Files modified:** {list of canonical paths}

### What changed

{The concrete behavior difference, per file where useful.}

### Why

{The user's reasoning — what problem this solves. Future sessions read this
to know whether a proposed change would reverse it.}
```

If an invariant was changed: say so explicitly in **What changed** ("Invariant
changed: …") AND confirm `invariants.md` was updated to match — the changelog
entry and the law file must never disagree.

**NEVER git-commit.** `~/.config/gsd/` is the user's to commit — end by
reminding them to review the diff and commit themselves.

## Done

Summarize the change: what behavior is different now, which files were touched
(targets, seam counterparts, invariants.md/seams.md if applicable), the
verification result (`bin/check` clean, seams re-confirmed), and the CHANGELOG
entry heading. Then remind the user: review the diff in `~/.config/gsd/` and
commit it themselves.
