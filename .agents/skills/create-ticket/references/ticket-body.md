# Ticket body

The default body for a new ticket. Use implementation-ready detail only when the user asks for it.

```markdown
> Soft plan only. Before implementation, inspect the current code and produce a detailed plan.

## Problem

Why the ticket exists and what currently fails or is missing.

## Soft scope

The expected outcome and likely boundaries, without prescribing a complete implementation.

## Acceptance criteria

- Observable behavior that demonstrates completion.
- Important error and edge-case behavior.
- Required ownership, security or data-integrity guarantees.
- Expected automated verification.

## Dependencies

None.
```

For dependent work, replace `None.` with the named prerequisites, then create the matching relations once the ids exist. The prose is for readers; the relations are what the lifecycle skills follow.

Optional parts, in this order:

- A `## <Area> integration` section with that side's own acceptance criteria, for a cross-stack ticket.
- A `## <name> reference` section before `## Dependencies`, when the work borrows from a reference implementation: the pinned version, the exact files and lines cited, what to borrow, and what to avoid.
- A `## Model routing` section, when model routing is on: first line `Model: <id>` or `Model: frontier`, then the guardrails the implementing model needs.
- A `Delivers with: <ids>` line, when the ticket rides in a bundle.
- The extra body lines the project's ticket conventions require, at the end.
