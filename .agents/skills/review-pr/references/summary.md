# Review output formats

## Inline comment

One comment per finding, anchored to its changed line:

```markdown
**BUG**: one-sentence claim.

{the failing path, input or sequence, and its impact}

Reproduced: {the command and what it showed} (or Traced: {the code path})

Correction: {the smallest change, written so it can be applied verbatim}
```

## Summary

The summary records this head, not a history. Open it with a freshly derived `## Review brief` in the format the pull request body template gives (Change, Inspect, Proven, Unknown, Next), validated against this diff and evidence rather than copied from the author's brief. Separate what you reproduced or traced from what the author reports. Point the next action at the unresolved findings, or at the numbered human procedure when the gates allow it. A clean review alone does not establish green CI, completed human QA, or permission to merge.

Then, with actionable findings:

```
Reviewed head: <full SHA>
Reviewed base: <full SHA>
Reviewed against: <ticket ids, lead first, or "the pull request description">
1. BUG `path:line`: one-sentence claim (inline)
2. QUESTION `path:line`: one-sentence claim (inline)
Resolved: <links, or none>. Not reviewed: <areas outside your judgment, or none>.
Verdict: CHANGES_REQUESTED
```

Without actionable findings (nits allowed):

```
Reviewed head: <full SHA>
Reviewed base: <full SHA>
Reviewed against: <ticket ids, lead first>
Since the previous review: <one sentence; omit the line on a first review>
Verified: <one sentence naming what you traced or ran>
Resolved: <links, or none>
NIT `path:line`: one-sentence note (inline)
Verdict: READY_FOR_HUMAN
```

followed by a `## Human verification` section holding the final numbered procedure.

## Rules

- Keep each finding line under about sixty words; the details live in the inline comment. A finding whose line is outside the diff, or whose inline comment failed to post, carries its details in the summary instead.
- List each resolved thread as a link labelled with its file and line, `[path:line](link)`, never as a raw thread id.
- Exactly one verdict line appears, and only in the summary.
- Never narrate earlier rounds, and never add separate sections for requirements checked or residual uncertainty beyond what the formats above hold.
