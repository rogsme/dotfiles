# Slicing work into tickets

Break a plan, spec or conversation into **tracer-bullet** tickets: thin vertical slices, each declaring the tickets that **block** it.

## Vertical slices

- Each slice cuts a narrow but complete path through every layer it touches (schema, API, UI, tests): vertical, never a horizontal slice of one layer.
- A completed slice is demoable or verifiable on its own.
- Each slice fits in a single fresh context window and runs in its own worktree.
- Prefactoring comes first: "make the change easy, then make the easy change."

## Blocking edges

Give each ticket its blocking edges: the other tickets that must be done before it can start. A ticket with no blockers can start immediately. An edge is real only when the earlier ticket genuinely gates the later one; shared files or a similar topic are not edges.

Work the **frontier**: the tickets whose blockers are all done. For a purely linear chain that means top to bottom. Create tickets in dependency order, blockers first, so each edge can point at a real id.

## Wide refactors

A **wide refactor** is one mechanical change (rename a column, retype a shared symbol) whose blast radius fans across the whole codebase, so a single edit breaks every call site at once and no vertical slice can land green. Sequence it as **expand-contract** instead of forcing it into a tracer bullet:

1. Expand: add the new form beside the old one, so nothing breaks.
2. Migrate the call sites in batches sized by blast radius (per package, per directory), each batch its own ticket blocked by the expand. The old form still exists, so every batch keeps CI green.
3. Contract: delete the old form once no caller remains, in a ticket blocked by every migrate batch.

When even the batches cannot stay green alone, keep the sequence but let them share an integration branch that all block a final integrate-and-verify ticket; green is promised only there.

## The breakdown review

Present the proposed breakdown as a numbered list. For each ticket, show the title, which tickets block it, and the end-to-end behavior it makes work. Then ask:

- Does the granularity feel right, or is it too coarse or too fine?
- Is every blocking edge real: does each ticket depend only on tickets that genuinely gate it?
- Should any tickets merge or split further?

Iterate until the user approves the breakdown.

## What stays out of a ticket

Specific file paths and code snippets go stale fast; describe behavior and boundaries instead. Two exceptions: a snippet from a prototype that encodes a decision more precisely than prose (a state machine, a schema, a type shape), trimmed to the decision-rich part and marked as coming from a prototype; and citations into a reference implementation at a pinned version.
