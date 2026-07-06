---
name: gsd-ship
description: Ships a completed phase as a pull request. Triggers on "/gsd-ship N", "ship phase N", "open the PR for phase N", or "create the pull request for this phase". Runs hard preflight checks (verification passed, security gate threats_open == 0, clean tree, feature branch, remote + gh auth), pushes the branch, generates a rich PR body from the phase's planning artifacts (summaries, REQ-IDs, verification, key decisions, UAT results), and creates the PR with gh. Closes the plan → execute → verify → ship loop for the phase.
argument-hint: "<phase>"
---

Read $HOME/.config/gsd/shared/conventions.md before doing anything — it defines project-root discovery, the .planning/ tree, commit conventions, config keys, and status vocabularies.

## Purpose

Turn a verified phase into a reviewable PR whose body is generated from the
planning artifacts on disk — no hand-written summaries, no shipping unverified
work.

## Arguments

- `<phase>` (required) — phase number (integer or decimal insertion like `2.1`).

## Step 1 — Preflight (ALL must pass, or stop with the full list)

Discover the project root and resolve `{N}`, `{NN}`, `{slug}`,
`{phase_dir}` = `.planning/phases/{NN}-{slug}/`, and the phase name from
ROADMAP.md. Run every check below, collect every failure, and if anything failed
present the complete list with the fix for each — don't stop at the first one.

1. **Verification passed.** `{phase_dir}/{NN}-VERIFICATION.md` must exist with
   frontmatter `status: passed`. Anything else blocks:
   - missing → run `/gsd-execute-phase {N}` (its verifier writes VERIFICATION.md)
   - `gaps_found` → close the gaps: `/gsd-plan-phase {N}` for structural gaps or
     `/gsd-fast` for small fixes, then re-verify
   - `human_needed` → `/gsd-verify-work {N}` to complete the human checks
   The user may explicitly override this check ("ship anyway") — confirm once,
   clearly restating what is unverified, then proceed with a `Status: shipped
   unverified (user override)` note carried into the PR body.
2. **Security gate — no override exists for this one.** If
   `{phase_dir}/{NN}-SECURITY.md` exists, read its frontmatter `threats_open`.
   The gate passes ONLY when it is exactly `0`. Greater than zero, missing, or
   non-numeric → refuse to ship, fail closed, and list the open threats from the
   file: "Resolve the open threats and set `threats_open: 0` before shipping."
   No SECURITY.md at all → gate not applicable, continue silently.
3. **Clean working tree.** `git status --porcelain` must be empty; otherwise ask
   the user to commit or stash first.
4. **Not on the default branch.** Detect the default:
   `git symbolic-ref --short refs/remotes/origin/HEAD` (strip `origin/`), falling
   back to `main`/`master`. If the current branch IS the default (the
   `branching: none` config was used), offer to move the phase's work onto
   `phase-{NN}-{slug}` — ask first, never do it silently:
   1. Confirm the commits to move: `git log origin/{default}..HEAD --oneline`.
   2. `git checkout -b phase-{NN}-{slug}` (branch keeps all local commits).
   3. Point the local default back at the remote:
      `git branch -f {default} origin/{default}` — safe because every local
      commit is now on the new branch; verify that with `git log` before forcing.
      Never use `git reset --hard`.
   If the user declines, stop — shipping from the default branch is not supported.
5. **Remote and gh.** `git remote get-url origin` must succeed and
   `gh auth status` must be OK. Otherwise give one-line setup instructions
   (`git remote add origin …` / `gh auth login`) and stop.

## Step 2 — Push

```bash
git push --set-upstream origin {current_branch}
```

Report the branch and how many commits it is ahead of the default branch.

## Step 3 — Generate the PR body from artifacts

Build the body from what's on disk — read only what each section needs:

- **Summary** — phase goal from the ROADMAP.md section, verification status, and
  a short paragraph of accomplishments synthesized from the `one_liner`
  frontmatter of every `{phase_dir}/{NN}-*-SUMMARY.md` (in plan order).
- **Changes** — one bullet per plan: `{NN}-{PP}: {one_liner}`, plus key
  created/modified files from each SUMMARY's frontmatter when present.
- **Requirements addressed** — the REQ-IDs listed in the phase's ROADMAP.md
  section, each with its description looked up from `.planning/REQUIREMENTS.md`.
- **Verification** — status line from `{NN}-VERIFICATION.md` plus any
  human-verification items it lists (checked/unchecked as recorded).
- **Key decisions** — decisions from `{phase_dir}/{NN}-CONTEXT.md` (locked
  choices) and any phase-relevant rows of PROJECT.md's Key Decisions table.
- **Test plan** — if `{phase_dir}/{NN}-UAT.md` exists: "UAT: {p} passed,
  {i} issues ({severities})" from its results. Otherwise omit the section.

Omit any section whose source file doesn't exist. Write the body to a temp file
(`mktemp`) so large bodies never hit shell argument limits.

## Step 4 — Create the PR

```bash
gh pr create \
  --title "Phase {N}: {phase name}" \
  --body-file "$PR_BODY_FILE" \
  --base {default_branch}
```

Then delete the temp file.

## Step 5 — Report

Show: PR URL and number, branch → base, commit count, requirements count, and
verification status.

## Next up

- `/gsd-discuss-phase {next}` — start the next phase (next = lowest phase in
  ROADMAP.md that isn't complete).
- `/gsd-milestone complete` — if this was the LAST phase of the roadmap.
- `/gsd-progress` — see where the project stands.

Suggestions, not gates — the user decides.
