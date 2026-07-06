---
phase: {N}
reviewers: [{only the reviewers actually invoked}]
reviewed_at: {ISO timestamp}
diff_base: {commit sha or ref the diff starts from}
diff_head: {commit sha or ref reviewed}
files_reviewed: {N}
verdict: {approve | revise | reject}   # consensus overall verdict
blockers: {N}                          # count of consensus blockers (2+ reviewers)
---

# Cross-AI Code Review — Phase {N}

<!-- One section per reviewer. Verdicts per conventions.md §8:
     PASS / FLAG / BLOCK per finding; APPROVE / REVISE / REJECT overall. -->

## {Reviewer Name} Review

{review content}

---

## Consensus Summary

<!-- Match findings by file + substance, not wording. -->

### Blockers (raised by 2+ reviewers)

<!-- Each with exact location and the fix reviewers agree on. -->

- `{file}:{line}` — {issue} — **Agreed fix:** {concrete fix}

### Agreed Concerns
{FLAG-level findings raised by 2+ reviewers}

### Divergent Views
{where reviewers disagreed — investigate before dismissing}

### Unique Insights
{valuable findings raised by only one reviewer}
