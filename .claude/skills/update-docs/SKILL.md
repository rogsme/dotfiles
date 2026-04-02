---
name: update-docs
description: >-
  Use when the user wants to sync documentation with the codebase, update
  READMEs after code changes, or refresh docs that may be stale. Also use when
  the user says "update docs", "sync README", "docs are outdated", "refresh
  documentation", or after a significant feature has been implemented.
  Requires .claude/skills.md with a documentation map configured.
argument-hint: "[scope]"
---

# Update Docs

Update project documentation (.md files) to reflect the current state of the codebase. Each doc file is updated by reading its source code and refreshing the content.

## Mode: $ARGUMENTS

The `$ARGUMENTS` value selects the scope. If empty, defaults to "all".

---

## Setup: Load Project Config

**Before doing anything else**, read `.claude/skills.md` and find the `## Update Docs` section. This section defines:
- **Documentation Map** — grouped tables mapping each doc file to its source code files
- **Scope Aliases** — how argument values map to documentation groups (e.g., "all" -> Groups 1-4)
- **Skip List** (optional) — files/patterns to never update

If `.claude/skills.md` does not exist or has no `## Update Docs` section, **stop** and tell the user:
> This project needs a `.claude/skills.md` file with a `## Update Docs` section. See the skill documentation for the expected format.

Also read `CLAUDE.md` to understand the project's commit rules.

---

## Scope Resolution

Match `$ARGUMENTS` against the scope aliases from `.claude/skills.md`:
- If it matches a scope alias → use those documentation groups
- If it matches a specific file path → find that file in the documentation map and update only that file
- If empty or "all" → update all documentation groups
- If unrecognized → show available scope aliases and stop

---

## Execution

Launch **parallel general-purpose agents** based on the selected scope, using `mode: "bypassPermissions"` and `model: "sonnet"`. One agent per documentation group (or one agent for a single file).

### Agent Workflow

Each agent prompt MUST include:
- The agent workflow steps (summarized below)
- The specific doc file(s) to update
- The specific source code file paths to read (from the Documentation Map)
- "Preserve the existing document structure, tone, and style. Only change what needs updating."
- "Do NOT add change-marker comments."

1. **Read the current doc file** fully to understand its structure, sections, and style.
2. **Read all source code files** listed in the Documentation Map for that doc.
3. **Compare** what the doc says vs what the code actually contains:
   - Are there new files, classes, methods, endpoints, models, or fields not documented?
   - Are there documented items that no longer exist in the code?
   - Are there descriptions, parameters, or behaviors that have changed?
4. **Update the doc file** to reflect current reality:
   - Preserve the existing document structure, tone, and style.
   - Add new items in the appropriate sections.
   - Remove references to deleted code.
   - Update descriptions where behavior has changed.
   - Do NOT rewrite sections that are already accurate.
   - Do NOT add change-marker comments like `# Updated`, `<!-- Updated -->`, etc.
   - Keep the same formatting conventions (headers, code blocks, tables, lists).
5. **Re-read the updated doc** to verify it reads naturally and is accurate.

---

## After All Agents Complete

1. Invoke the `commit` skill to stage and commit the documentation changes. If no files were changed, do not commit.
2. Summarize what was updated across all doc files:
   - Files modified vs files already up-to-date
   - Key additions (new endpoints, models, services documented)
   - Key removals (stale references removed)
3. List any doc files that may need manual review (e.g., architecture diagrams, workflow guides).
