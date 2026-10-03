---
description: Implement a saved, approved plan by name
agent: build
subagent: false
---

Plan name: $ARGUMENTS

Resolve the name under ~/.opencode/plan/, adding .md if omitted.
Read that file. If no name is provided or the file doesn't exist, list
available plans, ask which one to use, and wait for the answer.

Before implementation:
1. Require a plan whose status is approved. If it is unapproved or its
   status is missing, ask for approval and stop until approval is given.
2. Confirm this session is in the plan's project directory.
   If not, ask the user to open a session there and stop.
3. Read the applicable project instructions and inspect the current code.
4. If the plan conflicts with the current code or requires a material
   scope change, explain the conflict and request clarification before
   proceeding.

Implement the approved plan while preserving unrelated user changes.
Run its verification steps. Report completed work, test results,
and any unmet acceptance criteria.
