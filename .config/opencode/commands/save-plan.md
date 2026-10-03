---
description: Save a project-scoped plan and request approval
agent: plan
subagent: false
---

Prepare an implementation plan from our current discussion.
Additional request: $ARGUMENTS

## Resolve the project

Use read-only discovery from this session's current directory.
Inside a Git working tree, use `git rev-parse --show-toplevel` to identify
the current working-tree root, then `git worktree list --porcelain` to find
the main repository location in the first worktree record. Use that main
location as the project root, so linked worktrees share a project folder.
Outside Git, use the current directory as the project root. If Git discovery
fails for another reason, ask for clarification rather than guessing.
Normalize the project root to an absolute real path. The project name is
its final directory component; it is not the current branch name.

The default project folder is ~/.opencode/plan/<project-name>/.
Before using an existing folder, inspect its plans' Project root metadata.
If it belongs to another project or its ownership is unclear, look for an
existing project folder whose plans identify this project root. Reuse a
unique match; otherwise ask the user to select a distinguishing folder name.
Keep every project folder inside ~/.opencode/plan/ and preserve existing files.

## Save and approve

1. Resolve any questions that would materially change implementation.
   If there is no task in the discussion or additional request, ask what
   to plan and wait for the answer.
2. Save a self-contained plan to <project-folder>/<descriptive-name>.md.
   Use a descriptive lowercase, hyphen-separated filename without path
   separators. Use a unique filename; preserve existing files.
3. Include:
   - Status: draft
   - Project root: the absolute real path used for project identity
   - Planning directory: this session's absolute current directory
   - Working-tree root, branch (or detached HEAD), and commit when in Git
     Record an unborn branch or unavailable commit explicitly.
   - Objective, requirements, and exclusions
   - Agreed decisions and relevant code locations
   - Ordered implementation steps with target files or modules
   - Acceptance criteria, each with a verification command, its working
     directory, and expected result; where automation is unavailable,
     specify a concrete manual check and expected observation
   - Dependencies, risks, and unresolved questions
   Keep credentials and secrets out of the file.
4. Read back the saved file and confirm that:
   - No unresolved decision blocks implementation.
   - Every implementation step identifies its target files or modules.
     Check existing targets against the project; label planned new targets.
   - Every acceptance criterion has a concrete verification method and
     expected result. Check existing verification commands against the
     project's scripts or tooling; label planned new verification tooling.
   If any check fails, keep the plan draft, explain what is missing, and
   resolve it before requesting approval.
   Once all checks pass, summarize the saved plan and use the question tool
   to offer: Approve, Revise, or Cancel.
5. On Revise, gather feedback, update the draft, and request approval again.
   Any substantive change to the reviewed plan requires renewed approval.
   On Cancel, leave it unapproved and stop.
   On Approve, mark that version approved and read back the saved status.
6. Return the absolute plan path and the exact /execute-plan <name>
   invocation to use in a new session in this project. Another worktree
   of the same repository is valid; outside Git, use the same project directory.
   Use only the filename without its .md extension for <name>.
   Finish without implementing the plan.
