---
name: gsd-new-skill
description: Scaffolds a new gsd-* skill into the GSD system — gathers the design, writes the SKILL.md and any subagent prompts in the house pattern, wires the contract seams, deploys, and records the change. Use when the user says "new gsd skill", "add a skill to gsd", "scaffold a gsd skill", "create a gsd command for X", or "extend gsd with" a new capability. For changes to an existing skill, use /gsd-modify instead.
argument-hint: "<skill-name or purpose>"
---

Read $HOME/.config/gsd/shared/conventions.md before doing anything — it defines project-root discovery, the .planning/ tree, commit conventions, config keys, and status vocabularies.

# New GSD Skill

Add a skill to Roger's GSD without breaking its contracts. A skill is never just
one file: its frontmatter feeds the OpenCode wrappers, its "Next up" block must
agree with the pipeline table, and any new artifact must appear in the .planning/
tree and templates. This skill scaffolds all of it together, in the house pattern.

Also read `$HOME/.config/gsd/shared/seams.md` (the seam map — S7 and S10 always
apply here) and skim `$HOME/.config/gsd/shared/invariants.md` so the new skill
doesn't contradict recorded law.

**Argument:** a skill name or purpose (optional). Whatever is given, don't re-ask.

## 1. Gather the design

Ask only for what the argument didn't already give, one question at a time,
each with 2–4 concrete options plus freeform (conventions §9):

1. **Name** — kebab-case, must start `gsd-`. Check
   `$HOME/.config/gsd/skills/{name}/` doesn't already exist; on collision,
   suggest `/gsd-modify` or a different name.
2. **Purpose** — one sentence: what the skill does and what it produces.
3. **Arguments/flags** — positional args, flags like `--research`, or none.
4. **Kind** — PIPELINE STEP (slots into conventions §10 between two existing
   steps — ask where) or STANDALONE (an interrupt/utility like gsd-fast,
   gsd-debug).
5. **Subagents** — does it spawn any? For each: role name and the artifact it
   produces. Default to inline (no subagent) unless the work is heavy cognitive
   lifting per conventions §9.
6. **Artifacts** — does it write a new `.planning/` file? If so: name, location
   in the tree, and which skills will consume it.

Play back the design in a short table and confirm before writing anything.

## 2. Scaffold the skill

Create `$HOME/.config/gsd/skills/gsd-{name}/SKILL.md` in the house pattern:

- **Frontmatter** — `name`; a third-person `description` whose first sentence
  states what the skill does (it becomes the OpenCode wrapper description, S10)
  and which embeds 4–6 concrete trigger phrases the user would actually say;
  `argument-hint`.
- **First body line** — exactly the conventions pointer this file opens with.
- **Title + orientation paragraph** — why the skill exists, in house voice:
  imperative, concrete, runtime-neutral (no Claude-Code-only tool names).
- **Numbered steps** — the skill's real logic, drafted WITH the user from the
  gathered purpose. No lorem, no "TODO: fill in". Locate/load inputs first,
  then the work, then output. Target 100–300 lines; reference conventions.md
  rather than restating its rules.
- **Commit step** — if it writes `.planning/` artifacts, commit per conventions
  §5 honoring `planning.commit_docs` (`docs({NN}): …` or `docs: …`).
- **Ending** — PIPELINE STEP: a "Next up" section suggesting the following
  pipeline step(s), closing with "Suggestions, not gates — the user decides."
  STANDALONE: a final report block instead (see gsd-fast §6) — no "Next up".

For each subagent, write `references/{role}-prompt.md` in the house shape
(model: `gsd-ui-phase/references/ui-researcher-prompt.md`,
`gsd-execute-phase/references/verifier-prompt.md`):

- Second-person, fully self-contained — "You are the GSD {role}…".
- Inputs arrive as *paths* in the spawning prompt, never inline contents; the
  SKILL.md spawns it with "Read
  $HOME/.claude/skills/gsd-{name}/references/{role}-prompt.md and follow it."
  followed by the input paths and the required output path.
- The subagent writes its artifact to disk itself with the Write tool — never
  heredocs, never the artifact body in its response. No commits from subagents.
- Ends with an explicit **"Return to orchestrator"** contract: a short fenced
  block with the output path and status fields only.

## 3. Wire the seams

Per `shared/seams.md` — update every counterpart in the same pass:

- **PIPELINE STEP (S7):** add the step to the conventions §10 pipeline table in
  its slot, AND update both neighbor skills' "Next up" blocks to point through
  the new step. All three files change together.
- **New `.planning/` artifact:** add it to the conventions §2 tree (with its
  "from gsd-{name}" annotation) AND create
  `$HOME/.config/gsd/shared/templates/{artifact}.md` in house template style —
  `{placeholder}` syntax, frontmatter first, HTML comments for guidance, and
  field names matching upstream equivalents where one exists (e.g. reuse
  `phase`, `status`, `one_liner` rather than inventing synonyms).
- **Reviewer panel consumer:** if the skill invokes external reviewers, it must
  derive panel, commands, and timeouts entirely from
  `$HOME/.config/gsd/shared/reviewers.md` (S4 invariant — zero hardcoding).
- If the new skill creates a genuinely new cross-file contract, append it to
  `shared/seams.md` so `/gsd-modify` can protect it later.

## 4. Deploy and verify

1. `$HOME/.config/gsd/bin/sync` — symlinks the new skill into `~/.claude/skills/`.
2. `$HOME/.config/gsd/bin/check` — must end `Status: clean`; fix anything else
   before continuing.
3. `$HOME/.config/gsd/bin/gen-opencode` — regenerates the OpenCode command
   wrappers from the frontmatter (S10).
4. Read the finished SKILL.md top to bottom once: every referenced file,
   template, and prompt exists; steps are internally consistent; a pipeline
   step's "Next up" matches the updated §10.

## 5. Record

Append a CHANGELOG entry at the TOP of `$HOME/.config/gsd/CHANGELOG.md` — after
the preamble, before the first `## ` entry. Existing entries are immutable.

```markdown
## {YYYY-MM-DD} — Add gsd-{name}

**Files modified:** {every touched path: the skill dir, conventions.md,
templates, neighbor skills, seams.md…}

### What changed

{What the skill does, its artifacts, and which seams were wired.}

### Why

{The user's reasoning — the gap this skill fills.}
```

**NEVER git-commit.** `~/.config/gsd/` is the user's to commit.

## Done

Summarize: every file created or modified, the `bin/check` result, and the
CHANGELOG heading. Remind the user to review the diff in `~/.config/gsd/` and
commit it themselves. Then suggest a test drive: invoke `/gsd-{name}` on a toy
case (or dry-read it against an existing project) before trusting it in the
pipeline.
