---
name: configure-project-skills
description: >-
  This skill should be used whenever a user asks to create, configure, update,
  repair, validate, or migrate `.claude/skills.yaml` for audit-tests,
  fill-test-gaps, review-conventions, or update-docs, including migration from
  legacy `.claude/skills.md`. Use it proactively for missing, invalid, stale,
  or partially configured project skill settings rather than guessing a
  consumer skill's configuration.
compatibility: Designed for Claude Code and OpenCode; requires Git and uv, plus network access on the first run to resolve PyYAML.
---

# Configure Project Skills

Build one evidence-based `.claude/skills.yaml` at the Git root. Treat the four
sibling consumer `SKILL.md` files as the current contracts; do not rely on a
remembered schema or make the legacy Markdown authoritative.

## Boundaries

- Configure only applicable sections: `audit-tests`, `fill-test-gaps`,
  `review-conventions`, and `update-docs`.
- Never execute project commands, including proposed check, fix, test,
  coverage, lint, format, documentation, migration, or deployment commands.
  Reading manifests and tool configuration is allowed.
- Never delete `.claude/skills.md`; retain it as migration evidence and report
  any content that cannot be represented.
- Never commit or push.
- Never write before showing the proposal, validator result, migration losses,
  and receiving approval.

## Workflow

1. Resolve the requested location with `git rev-parse --show-toplevel`. Set the
   exact target to `<git-root>/.claude/skills.yaml`. Reject a target symlink
   whose resolved destination is outside that root. In a monorepo, keep one
   root configuration and express package scopes as root-relative globs; use a
   nested root only when it is independently resolved by Git.
2. Detect applicable sections from the request and repository evidence. Read
   the sibling `../audit-tests/SKILL.md`, `../fill-test-gaps/SKILL.md`,
   `../review-conventions/SKILL.md`, and `../update-docs/SKILL.md` contracts for
   applicable sections before drafting.
3. Read the existing target and legacy `.claude/skills.md` when present. Also
   inspect relevant manifests, test-runner and coverage configuration,
   `CONVENTIONS.md`, documentation layout, and generated-file rules. Do not run
   their commands.
4. Classify every proposed value as **confirmed**, **safely inferred**,
   **ambiguous**, or **unrepresentable**. Safely infer only stable facts proved
   by repository files, such as configured test roots, extensions, coverage
   output, convention headings, and source-to-doc relationships. Require
   confirmation for policy choices, destructive or mutating commands, unclear
   ownership, multiple plausible globs, aliases, exceptions, or undocumented
   intent. Never invent placeholder commands.
5. Ask one grouped question set covering all ambiguous values that block a
   valid configuration. If accurate scope requires enumerating individual
   files instead of stable globs, stop and report it as unrepresentable; the
   current schema has no enumerated-files field.
6. Propose the complete YAML for a new file or a focused diff for an existing
   file. Existing YAML is an update, not a rewrite: preserve comments, key
   order, formatting, and unknown sibling skill sections. Repair only requested
   or invalid recognized sections. Note dirty-worktree changes and avoid
   overwriting concurrent edits; do not clean, stash, or revert them.
7. Store the candidate in session temporary storage outside the repository and
   validate its exact YAML through stdin before editing. Run from this skill
   directory:

   ```bash
   uv run scripts/validate_config.py --repo "$repo" --stdin < proposed.yaml
   ```

8. Show the proposal, JSON validation result, evidence classification, and all
   migration losses or changed semantics. Wait for explicit approval.
9. Apply the smallest targeted edit to the exact target. Re-read first if the
   worktree changed, preserving comments, order, and unknown sibling sections.
10. Validate the written target:

    ```bash
    uv run scripts/validate_config.py --repo "$repo" "$repo/.claude/skills.yaml"
    ```

11. Report the target, configured sections, validation result, retained legacy
    file, migration losses, and unresolved items. Do not run configured values.

## Existing And Legacy Configuration

Prefer valid existing YAML values over inference unless repository evidence
proves they are stale. Validate recognized sections together because root-level
shape and cross-section filesystem facts matter; preserve unknown sibling
sections without interpreting them. If existing comments cannot be retained by
a proposed editing method, use a targeted text edit instead.

Translate legacy Markdown only where meaning maps exactly to the current
consumer contract. Report omitted prose, unsupported options, uncertain command
intent, and scope changes as migration losses. Stop rather than silently
broadening a scope or replacing an explicit file inventory with guessed globs.

The current contracts cannot express exclusions inside audit source/test glob
sets or individual convention-review scopes. When those omissions create
overlap, stop and identify the consumer-schema limitation; do not emit brittle
per-file globs.

Use `scripts/validate_config.py --help` for validator options. Treat exit `0` as
valid, `1` as invalid configuration, and `2` as a usage or environment error.
