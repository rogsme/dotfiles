---
phase: {N}
reviewers: [{only the reviewers actually invoked, e.g. gemini, codex, claude}]
reviewed_at: {ISO timestamp}
plans_reviewed: [{list of PLAN.md files}]
---

# Cross-AI Plan Review — Phase {N}

<!-- One section per reviewer, in registry order. Verdicts per conventions.md §8:
     PASS / FLAG / BLOCK per dimension; APPROVE / REVISE / REJECT overall. -->

## {Reviewer Name} Review

{review content}

---

## Consensus Summary

<!-- Synthesize across all reviewers — weight issues by how many flagged them.
     Match issues by file + substance, not wording. -->

### Blockers (raised by 2+ reviewers)
{BLOCK-level issues multiple reviewers independently identified — almost certainly real}

### Agreed Strengths
{strengths mentioned by 2+ reviewers}

### Agreed Concerns
{FLAG-level concerns raised by 2+ reviewers}

### Divergent Views
{where reviewers disagreed — may reveal genuine ambiguity in the plan}

### Unique Insights
{valuable points raised by only one reviewer — the blind spots multi-model review exists to catch}
