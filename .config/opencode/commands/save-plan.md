---
description: Save a reusable plan and request approval
agent: plan
subagent: false
---

Prepare an implementation plan from our current discussion.
Additional request: $ARGUMENTS

1. Resolve any questions that would materially change implementation.
   If there is no task in the discussion or additional request, ask what
   to plan and wait for the answer.
2. Save a self-contained plan to ~/.opencode/plan/<descriptive-name>.md.
   Use a unique filename; preserve existing files.
3. Include:
   - Status: draft
   - Absolute project directory
   - Objective, requirements, and exclusions
   - Agreed decisions and relevant code locations
   - Ordered implementation steps
   - Tests and acceptance criteria
   - Dependencies, risks, and unresolved questions
   Include enough context for a fresh session to execute the plan.
   Keep credentials and secrets out of the file.
4. Read back the saved file, summarize it, and use the question tool
   to offer: Approve, Revise, or Cancel.
5. On Revise, gather feedback, update the draft, and request approval again.
   Any change to the reviewed plan requires renewed approval.
   On Cancel, leave it unapproved and stop.
   On Approve, mark that version approved and read back the saved status.
6. Return the absolute plan path and the exact /execute-plan <name>
   invocation to use in a new session in the plan's project directory.
   Use only the filename without its .md extension for <name>.
   Finish without implementing the plan.
