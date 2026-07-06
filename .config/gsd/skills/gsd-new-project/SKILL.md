---
name: gsd-new-project
description: Initializes a new GSD project from an idea through deep questioning, then writes PROJECT.md, config.json, REQUIREMENTS.md, ROADMAP.md, and STATE.md under .planning/. Triggers on "/gsd-new-project", "start a new project", "initialize a GSD project", "set up planning for this idea", or "kick off a project". This is the most leveraged moment in a project — deep questioning here means better plans, better execution, better outcomes. Refuses to run if .planning/ already exists; recommends /gsd-map-codebase first for directories with substantial existing code.
---

Read $HOME/.config/gsd/shared/conventions.md before doing anything — it defines project-root discovery, the .planning/ tree, commit conventions, config keys, and status vocabularies.

## Purpose

Take the user from fuzzy idea to ready-for-planning: questioning → PROJECT.md →
config → REQUIREMENTS.md → ROADMAP.md → STATE.md, all committed. Downstream skills
(/gsd-discuss-phase, /gsd-plan-phase, /gsd-execute-phase) act on what is captured
here — a vague PROJECT.md forces every one of them to guess, and the cost compounds.

## Step 1 — Guard rails

1. If `.planning/` already exists here (or at the git toplevel): stop.
   "This directory already has a GSD project. Use /gsd-progress to see where you
   are, or /gsd-phase to change the roadmap." Do not touch anything.
2. Detect existing code: source files, a package manifest (`package.json`,
   `pyproject.toml`, `Cargo.toml`, `go.mod`, …), or a populated `src/`-like tree.
   If the directory contains substantial existing code AND `.planning/codebase/`
   does not exist, recommend mapping first. Ask the user (2 options):
   - **Map codebase first (recommended)** — run `/gsd-map-codebase`, then return to
     `/gsd-new-project`. If chosen, stop here.
   - **Skip mapping** — proceed; requirements inference will be weaker.
3. If not inside a git repository: `git init`.

## Step 2 — Deep questioning

This is dream extraction, not requirements gathering. You are a thinking partner,
not an interviewer. Don't follow a script — follow the thread.

**Open the conversation** with a single freeform question, asked as plain text:

> What do you want to build?

Wait for the answer. Everything else builds on it.

**Follow the thread.** Each answer opens new threads. Dig into whatever carried
energy: what excited them, what problem sparked this, what they're doing today that
this replaces. Ask follow-ups using 2–4 concrete options plus freeform — options
should be interpretations to react to ("When you say fast, do you mean sub-second
responses, large datasets, or quick to build?"), never generic categories.

**Techniques — use whichever the thread calls for:**

- **Challenge vagueness.** Never accept fuzzy answers. "Good" means what? "Users"
  means who? "Simple" means how?
- **Make the abstract concrete.** "Walk me through using this." "What does that
  actually look like?" "Give me an example."
- **Surface hidden assumptions.** "You said X — are you assuming Y?" "What's
  already decided?" Make implicit choices explicit so they can be confirmed or
  discarded.
- **Distinguish core value from nice-to-have.** Find the ONE thing that must work
  for this to be worth building. Everything else is negotiable scope.
- **Find edges.** "What happens when there's no data?" "Who should NOT use this?"
- **Reveal motivation.** "What would you do if this existed?" "What prompted this
  now?"

**Freeform rule:** the moment the user signals they want to explain in their own
words ("let me describe it", picks "Other"/"Let me explain"), drop the options and
ask a plain-text follow-up. Resume option-style questions only after processing
their freeform answer.

**Background checklist** (check mentally, never walk it out loud):

- [ ] What they're building — concrete enough to explain to a stranger
- [ ] Why it needs to exist — the problem or desire driving it
- [ ] Who it's for — even if just themselves
- [ ] What "done" looks like — observable outcomes

**Anti-patterns:** checklist walking, canned questions, corporate speak ("who are
your stakeholders?"), interrogation without building on answers, rushing to "the
work", shallow acceptance of vague answers, asking about tech stack before
understanding the idea, asking about the user's technical skill (Claude builds).

**Decision gate.** When you could write a clear PROJECT.md, offer to proceed
(2 options): "Create PROJECT.md" / "Keep exploring — I want to share more".
Loop until the user picks "Create PROJECT.md".

## Step 3 — Write PROJECT.md

Synthesize everything gathered into `.planning/PROJECT.md` using the template at
`$HOME/.config/gsd/shared/templates/project.md`. Do not compress — capture
everything: what this is, core value, context, constraints.

- **Requirements section:** initialize as hypotheses. Greenfield: Validated is
  empty ("None yet — ship to validate"), everything captured goes under Active,
  explicit exclusions with reasons under Out of Scope. Brownfield (a codebase map
  exists): read `.planning/codebase/ARCHITECTURE.md` and `STACK.md`, list what the
  code already does as Validated ("— existing"), new scope as Active.
- **Key Decisions:** record any decision made during questioning with its
  rationale, outcome "— Pending".
- Footer: `*Last updated: {date} after initialization*`.

## Step 4 — Configuration (exactly two questions)

Ask exactly TWO questions — no more:

1. **Mode** — "How do you want to work?"
   - **Interactive** — confirm before plan/execute transitions
   - **YOLO** — auto-approve, just execute
2. **Git tracking** — "Commit planning docs to git?"
   - **Yes** — `.planning/` tracked in version control
   - **No** — keep `.planning/` local-only

Write `.planning/config.json` from the template at
`$HOME/.config/gsd/shared/templates/config.json`: set `mode` and
`planning.commit_docs` from the answers, keep every other key at its template
default. If commit_docs is no, add `.planning/` to `.gitignore` (create it if
needed) — from here on, never stage anything under `.planning/`.

## Step 5 — Requirements

Categorize the scope captured during questioning:

- **v1** — needed for the core value to work. These become active requirements.
- **v2** — real, but deferred. Users may expect them eventually.
- **Out of scope** — explicit exclusions, each with a one-line reason.

Quality bar for every v1 requirement:

- **Specific and testable:** "User can reset password via email link", not
  "Handle password reset".
- **User-centric:** "User can X", not "System does Y".
- **Atomic:** one capability per requirement.

Push back on vague items — "support sharing" becomes "User can share a post via a
link that opens in the recipient's browser".

Assign REQ-IDs as `{CATEGORY}-{NN}` (e.g. `AUTH-01`, `CONT-02`), grouped by
category. Write `.planning/REQUIREMENTS.md`: v1 requirements (checkboxes with
REQ-IDs), v2 deferred list, Out of Scope with reasons, and an empty Traceability
section (filled by the roadmap step).

Present the FULL v1 list (every requirement, not counts) and ask: does this
capture what you're building? Adjust until confirmed.

## Step 6 — Roadmap

Derive 3–6 phases from the requirements — let the work suggest the structure,
don't impose one. For each phase:

- **Goal** — outcome-shaped, describing a state of the world, not activity
  ("Users can sign up and stay logged in", not "Build auth").
- **Requirements** — the v1 REQ-IDs this phase delivers.
- **Success Criteria** — 2–5 observable user-visible behaviors that prove the
  goal is met. Things a person can check, not internal milestones.

Ordering: dependencies first, then risk — put the phase most likely to invalidate
assumptions early.

**Coverage check (mandatory):** every v1 REQ-ID maps to exactly one phase. No
orphaned requirements, no phase without requirements. If something doesn't fit,
revisit Step 5 with the user rather than forcing it.

Write `.planning/ROADMAP.md` using `$HOME/.config/gsd/shared/templates/roadmap.md`
and fill the Traceability section of REQUIREMENTS.md (REQ-ID → phase).

Present the roadmap as a compact table (Phase | Goal | REQ-IDs | criteria count)
plus per-phase detail, then ask (3 options): **Approve** / **Adjust phases** (get
notes, revise, re-present — loop) / **Show raw file**.

## Step 7 — Initialize STATE.md

Write `.planning/STATE.md` from `$HOME/.config/gsd/shared/templates/state.md`:
phase 1 of {N}, status ready to discuss, progress 0%, one-liner from PROJECT.md,
Session Continuity pointing at `/gsd-discuss-phase 1`. Respect the 100-line cap.

## Step 8 — Commit

If `planning.commit_docs` is true, stage the planning files explicitly and commit:

```bash
git add .planning/PROJECT.md .planning/config.json .planning/REQUIREMENTS.md \
        .planning/ROADMAP.md .planning/STATE.md
git commit -m "docs: initialize project"
```

If commit_docs is false, skip the commit (the `.gitignore` entry from Step 4
already excludes `.planning/`; commit the `.gitignore` change alone:
`docs: ignore local planning docs`).

Show a completion summary: project name, artifact table, phase count, requirement
count.

## Next up

- `/gsd-discuss-phase 1` — gather context and clarify approach for the first phase.

Suggestions, not gates — the user decides.
