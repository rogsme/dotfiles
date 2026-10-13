# Implementation handoff

Post this on the lead ticket once the exact-head CI gate passes, reusing an equivalent existing comment. Copy the pull request's current review brief right under the heading, refreshed against the exact-head CI result and the remaining review comments. The brief adds no approval, transition or permission; every gate stays as it is.

```markdown
## Implementation handoff

## Review brief

{the pull request's current review brief}

Agent: {harness, or Unknown}
Model: {exact model and variant, or Unknown}

### What I did

- {each implemented outcome}
- Pull request: {URL}

### Acceptance evidence

| Ticket | Acceptance criterion | Evidence | Observed result | Human verification |
|---|---|---|---|---|
| {id} | {criterion} | {test, command, capture or code path} | {result} | {step number, or None} |

### Browser pass

- Instance: {instance and URL per persona used}
- Captures: {title and permanent URL, one per line}
- Negative check: {what was tried and what happened}

### Verification snapshot

- Head SHA: `{full SHA}`
- Base SHA: `{the base SHA the head contains}`
- CI: {URL and result; "no checks: the diff touches no CI-filtered path"; or "no CI configured"}
- Local checks: {commands and results, or "not configured" with the gap}

### Potential issues and limitations

- {known gap, unverified surface, operational risk, review comments left for address-pr-review, or "None known"}

### Human verification

{the same numbered procedure as in the pull request}
```

- Write one acceptance-evidence row for every criterion of every member. Name missing evidence and unverified boundaries explicitly instead of leaving a row out, and point every criterion that still needs a person at its numbered human step.
- With the browser pass off, drop `### Browser pass`. With it on and no visible surface, keep the heading and give the one-line reason.

On each rider, post only a pointer:

```markdown
## Implementation handoff

Delivered with {lead id} in {pull request URL}. The full handoff is on {lead id}: {link to the lead's comment}.
```
