# Review standards

Apply these on every review. Do not restate them in the review itself.

## Evidence

- Build two ledgers before judging. The requirements come from the tickets. The claims are every guarantee the diff states about itself, in a docstring, a contract table, a README or the pull request body: what is ordered, what is denied by default, what is withheld, what converges. Check each claim against every surface it covers, including facts noted elsewhere in the review. A claim the code does not honor is a `BUG`.
- Before posting a finding: reproduce it with the installed environment where possible, confirm the line exists at this head, and check that no existing thread or human comment already settles it. Then try to refute it and drop what does not survive. Every finding says whether it was reproduced or traced.
- Never report a defect a later commit in the same pull request already removed.
- Never post a finding an open thread already carries; point at that thread in the summary instead.
- Leave a thread open when a human replied and the underlying gap remains, even when the actionable part was fixed.

## House standards

- Comments are a last resort. Flag long inline comment blocks, comments that restate the line, and prose that belongs in a docstring.
- Verify dependency and supply-chain claims against what is actually installed (the lockfile, the package manager's dependency tree) and who owns the package before posting them. A lockfile-only advisory is not reachable; a similar name is not a typosquat.
- A check against fixture data is worse than an honest gap. Never ask for a guard that only looks like protection; ask for the ticket reference and a code marker where the wrong assumption is made.
- Never trade a visible failure for the client for an invisible internal one. Validation that drops a whole response to catch an internal inconsistency is wrong: degrade the one field, and have the contract say so.
- A warning that precedes the write it warns about is a `BUG`, not a nit. Trace what runs after the log line; "deferred to a follow-up" answers it only when the write is deferred too.
- A test that pins today's gap as expected behavior is a finding, not coverage. Name the case to flip.
- Judge a gate against the routes the contract and the tickets' successors name, not only the routes that exist at this head. A subtree protected as an exact path is a bug before the first route lands under it.
- An exception handler that enumerates leaf classes is judged against the full hierarchy installed: the library's base class and the transport's base class are what a translation must catch.
- Where a request reads one system and trusts another that is eventually consistent, the contract states what the client sees inside the window and how it differs from the permanent state. One error that means both "not yet synced" and "revoked" is a contract finding.
- A change to a decisions log, a contract or a documented constraint with no recorded decision behind it is a `QUESTION` asking for the decision record, not a silent accept.
- Contracts between disciplines move together: when one side changes a value the other side types against, the contract document changes in the same pull request.
- Accessibility defects are real bugs: identical control names across sibling rows, missing landmarks, incomplete ARIA ranges, reduced-motion rules that cannot apply.
- Guards for personal data and secrets agree across layers: ignore patterns, code guards and documentation name the same files.
- Fix at the source, not the symptom. Two hand-written lists that must agree should be derived from one; a test derived from the constant beats a copy.
- New tests must bite. When a regression test would pass against the old code, say so and name the mutation that should fail it.
- Work that serves none of the pull request's tickets is a `QUESTION`, never a silent accept.
- With the browser pass on, a user-visible change links one capture per visible acceptance criterion. Report a missing capture once.
- The human verification procedure must be runnable: exact setup, expected results, a negative check. Report a gap there once.
- A finding one of these standards settles is a `BUG`, never a `QUESTION`. An author's reply that the behavior is intended closes it only with a decision record.
- Style, formatter output, naming preferences and tooling choices are out of scope. Never request generic coverage or speculative refactors.
