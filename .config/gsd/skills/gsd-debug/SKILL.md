---
name: gsd-debug
description: Systematic scientific-method debugging with a persistent session file. Use when the user says "gsd debug", "help me debug this", "this is broken and I don't know why", describes a bug with unknown cause, or wants to resume a previous debugging session. Gathers symptoms (expected vs actual, repro steps, when it last worked), creates .planning/debug/{slug}.md as the durable evidence log, and spawns a debugger subagent that forms falsifiable hypotheses, runs discriminating experiments, and only fixes the confirmed root cause. Bare invocation lists open sessions and offers to resume.
argument-hint: [symptom description]
---

Read $HOME/.config/gsd/shared/conventions.md before doing anything — it defines project-root discovery, the .planning/ tree, commit conventions, config keys, and status vocabularies.

# GSD Debug

Debugging as science: hypothesis → experiment → evidence → repeat until
confirmed → fix only the confirmed cause. The session file is the debugging
brain — it survives `/clear`, context death, and days away.

Locate the project root (conventions §1). Sessions live at
`.planning/debug/{slug}.md`.

## Session file format

```markdown
---
status: open | resolved
created: {ISO date}
updated: {ISO date}
---

# Debug: {one-line description}

## Symptom
expected: {what should happen}
actual: {what actually happens}
repro: {steps to trigger it}
started: {when it broke / last known working / always broken}
errors: {verbatim messages, if any}

## Evidence Log
<!-- append-only: one entry per experiment -->
- {timestamp} — checked: {what} — found: {observation} — implies: {meaning}

## Hypotheses
<!-- every hypothesis ever formed, with fate -->
- [rejected] {hypothesis} — disproved by: {evidence}
- [confirmed] {hypothesis} — confirmed by: {evidence}

## Resolution
root_cause: {empty until confirmed}
fix: {empty until applied}
verification: {empty until verified}
```

## 1. Bare invocation — list and offer resume

If invoked with no symptom description: list sessions in `.planning/debug/`
with `status: open` (slug, created date, latest hypothesis, last evidence
entry). Ask the user: resume one of these, or describe a new problem? If there
are no open sessions, just ask for the symptom. If a slug is chosen, skip
symptom gathering — the file IS the context — and go to step 3.

## 2. New session — gather symptoms, create the file

Gather conversationally (skip anything already in the invocation text):

1. **Expected** — what should happen?
2. **Actual** — what happens instead? Error messages verbatim.
3. **Repro** — how do you trigger it? Reliably or intermittently?
4. **Timeline** — when did it start? Did it ever work? What changed around then?

Derive a slug (kebab-case, ≤30 chars, from the symptom). Create
`.planning/debug/{slug}.md` with the format above, `status: open`, Symptom
filled in, Evidence Log and Hypotheses empty.

## 3. Spawn the debugger subagent

Spawn a fresh-context subagent (conventions §9):

```
Read $HOME/.claude/skills/gsd-debug/references/debugger-prompt.md and follow it.

Session file: {project root}/.planning/debug/{slug}.md
Repro: {repro steps / command, restated}
Goal: find the root cause, fix it, verify the fix.
Return a compact summary: root cause, fix, verification — or the current state
of the evidence log if unresolved.
```

Wait for it to return (this can take a while — it's running experiments). The
subagent updates the session file after every experiment, so nothing is lost if
it dies.

## 4. On a confirmed fix

When the debugger returns with root cause confirmed, fixed, and verified:

1. Commit the fix (stage explicit paths): `fix: {description}` — or
   `fix({NN}-{PP}): ...` if the bug clearly belongs to the phase currently being
   executed.
2. Set the session file `status: resolved`, fill the Resolution section, update
   `updated`. Commit the session file (`docs: resolve debug session {slug}`)
   unless config `planning.commit_docs` is false.
3. Summarize for the user: root cause, the fix, how it was verified, and how
   many hypotheses died along the way.

## 5. If the debugger returns unresolved

Don't spin silently. Present the state honestly:

- The evidence log so far (what was checked, what was found)
- Hypotheses rejected and why
- The debugger's best remaining lead, if any

Ask the user how to proceed:

1. **More cycles** — respawn the debugger with the session file (it resumes
   from the evidence log, never re-tests rejected hypotheses)
2. **Add information** — the user may know something that reframes the search;
   append it to the Evidence Log, then respawn
3. **Park it** — leave `status: open`; a later bare `/gsd-debug` will offer to
   resume it

Never mark a session resolved without a confirmed root cause and a verified fix.
