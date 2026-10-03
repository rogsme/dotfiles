---
description: Implement an approved plan for the current project by name
agent: build
subagent: false
---

Plan name: $ARGUMENTS

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

## Select the plan

Treat the argument as a filename in the resolved project folder, adding .md
if omitted. Require a basename rather than an absolute path or directory
traversal. If no name is provided or the file doesn't exist, list only this
project's available plans, ask which one to use, and wait for the answer.
If the project folder has no plans, explain that and stop.
Read the selected plan. Leave legacy plans directly under ~/.opencode/plan/
untouched; use project-scoped plans for this command.

## Implement

Before implementation:
1. Require a plan whose status is approved. If it is unapproved or its
   status is missing, ask for approval and stop until approval is given.
2. Require the plan's Project root to match this session's resolved project
   root. Another worktree of the same repository is valid; a matching folder
   name alone is insufficient. Outside Git, require the same project directory.
   If identity is missing or mismatched, request clarification and stop.
3. Read the applicable project instructions and inspect the current code.
4. Compare the plan's recorded branch and commit with the current checkout
   when available. Report differences and assess their effect on the plan;
   a different branch or commit does not by itself invalidate approval.
   If the plan conflicts with the current code or requires a material scope
   change, explain the conflict and request clarification before proceeding.

Implement the approved plan while preserving unrelated user changes.
Run every verification step from its specified working directory.
In the final report, account for every implementation step as completed,
failed, or blocked, and every acceptance criterion as passed, failed,
or blocked. Include the verification commands or manual checks performed
and their observed results. Mark unperformed verification as blocked and
explain why; an unverified criterion is not passed.
Claim the plan is complete only when every implementation step is completed
and every acceptance criterion has passed with verification evidence.
