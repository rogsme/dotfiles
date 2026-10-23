---
name: simplify-branch
description: "Run a taste pass over the current branch's committed change: review its diff against the base for reuse, simplification, efficiency and altitude, apply only the cleanups that keep behavior the same, verify them, and commit them. Use when the user asks for a taste pass or to simplify the branch before review, or when work-ticket hands over its taste pass."
license: MIT
metadata:
  rogs-skills/contract: "1"
---

# Simplify a branch

A taste pass is one read of the branch's own change, before anyone reviews it, for code that works but could be smaller, plainer or better placed. It keeps behavior exactly as it is. It hunts no bugs and adds no features: a cleanup that would change what the code does is a finding to report, never an edit.

The pass covers the committed change, `<base>...HEAD`, and the code those lines touch. Code the branch did not change stays as it is, unless the change copied it.

## 1. Scope the change

1. Require a clean worktree, since the pass commits only its own edits. When it is dirty, ask the user whether to commit the pending changes first; a caller gets the paths in a report instead.
2. Find the base: the remote and base branch a caller names, else the ones `docs/agents/forge.md` names under `## Forge`, else the remote's default branch (`git symbolic-ref --short refs/remotes/origin/HEAD`). Ask when none of them exists.
3. Fetch the remote and record `HEAD`. The change is `git diff <remote>/<base>...HEAD` and its commits are `git log <remote>/<base>..HEAD`. Stop when the change is empty.

## 2. Read the rules

Read `AGENTS.md` (or `CLAUDE.md`), the rule files the repository names for the touched areas (`docs/agents/workflow.md` lists them under `## Project rules`), the glossary `docs/agents/domain.md` names, and [references/taste.md](references/taste.md), the house taste rules.

A project rule wins over a taste rule when they disagree: duplication the project keeps on purpose, a pattern its rules require, a layout its tools expect.

## 3. Review in four passes

Each pass reads the whole change and lists candidates, each with its path and lines, the cleanup, and why it keeps behavior:

- Reuse: code the change adds that an existing helper, constant, type, fixture or test utility already provides, and repetition inside the change itself.
- Simplification: indirection that buys nothing, dead code, branches that cannot run, parameters every caller passes the same, comments that repeat the code, debug output left behind.
- Efficiency: work done again where once is enough, such as a call inside a loop that one call before it answers, when the cleanup stays local.
- Altitude: each piece at the layer that owns it, at the level of abstraction its neighbors use, named in the domain's words.

When the harness runs subagents, give each pass to its own read-only subagent with the diff, the rules and this section, and merge what they return. Otherwise run the passes one after another.

## 4. Decide each candidate

Apply a candidate only when every one of these holds:

- It keeps behavior: the same results, errors, side effects, and output other programs read.
- It stays inside the change: the lines the branch added or changed, the code they touch, and existing code only where a copy of it gives way to a call.
- It keeps every public surface: exported names and their signatures, command-line flags, file and wire formats, configuration keys, and the seams the tests use.
- The existing tests prove it safe, with no new test.

Drop what the formatter owns, naming preferences no rule backs, speculative architecture and refactors outside the change. A candidate that would change behavior is a finding: report it unapplied.

## 5. Apply, verify and commit

1. Make the edits. Run the format command and the focused checks for the touched areas: the ones `workflow.md` lists under `## Verification`, else the project's task runner.
2. When a check fails, revert the cleanup that broke it; the test stays as it is, since a cleanup that breaks one changed behavior.
3. Commit in themed units, such as one for reuse and one for leftovers. For each, state its exact paths, its intent and the constraints (never amend; no AI attribution and no co-author trailers unless the repository's commit rules say otherwise; never bypass a hook; leave every other path untouched), then call the Skill tool with "commit". Confirm each commit with `git log`.

Leave pushing to the user or the caller. Never rebase, and never rewrite the branch's earlier commits.

## 6. Report

List each commit with its cleanups, one line each; the checks run and their results; the candidates dropped, a line each with the reason; and the behavior-changing findings left for the user. When no candidate survives, say so and commit nothing.
