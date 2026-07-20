# Panel Update Workflow

Follow this only when the user explicitly requests a Lazer panel update,
re-score, or re-run. The explicit request is sufficient approval to send the
benchmark prompts and necessary text inputs to the selected external models;
do not add a classification gate.

## 1. Detect Changes

Compare available `lazer/*` model IDs with the routing table in `../SKILL.md`.
Classify each difference as new, replaced, removed, or metadata-only. Evaluate
new and replaced models. Do not rerun models for metadata-only changes unless
the user requests it. Never show cost estimates.

## 2. Run Incrementally

Read `../eval/README.md` before running anything. Its local-execution warning is
part of this workflow: generated code runs locally under timeouts, not in a
sandbox, and can still access host resources.

Use `../eval/run_one.sh` for each realm. Launch independent invocations through
parallel tool calls; rely on returned statuses rather than detached jobs or
completion notifications. Keep stdout, stderr, and metadata artifacts. The
runner's default is a real 1,200-second timeout; any override must remain
finite.

Retry empty successful output once and record the flake. Two empty outputs or a
timeout are delivery failures for that realm. Do not hide stderr.

## 3. Grade

- For realms 1, 2, 3, 4, 6, and 7, use the graders under `../eval/ref/`.
- If a grader changed, validate it against its reference solution before using
  it for new claims.
- Realm 4 accepts either "rollback" or "rolled back" in the summary.
- Realm 5 anchors: factual accuracy, the 150-word hard cap, complete coverage of
  what/why/risk/out-of-scope, and no invented facts.
- Realm 8 anchors: behavioral battery first, then concrete data structures,
  invariants, cycle handling, and a genuinely argued rejected alternative.
  Record unexecuted or failing self-tests rather than assuming they passed.
- Record median and maximum observed latency. Label timeouts and retries.

The known realm-7 large-integer comparison artifact may be disclosed separately
but must not be silently erased from raw results.

## 4. Compare

Compare only measured behavior: per-realm checks, judged outputs under the
anchors above, delivery failures, and observed latency. Do not infer image,
document, long-context, tool-use, or agentic capability from this text-only
benchmark. With one primary run per cell, phrase differences as observations,
not stable rankings.

Present the proposed routing changes with one evidence sentence each. If the
user requested only evaluation, wait for approval before changing routing. If
the user explicitly requested evaluation and routing refresh, that request is
the edit approval.

## 5. Update Consistently

Update only the affected files:

1. `../SKILL.md`: routing rows, observed basis, fallback, and evaluation date.
2. `../references/eval-results.md`: append a dated section; preserve prior raw
   observations as the audit trail.
3. `../eval/README.md`: only when harness mechanics or risk changed.

Do not add references to tools, skills, models, or capabilities that are not
present and verified in the current OpenCode/Lazer setup.

## 6. Verify

- Every routed model is available as `lazer/<id>` or clearly marked historical.
- Every referenced local resource exists.
- Frontmatter still says explicit requests only.
- Shell syntax and Python compilation pass before any optional execution.
- If the user requested a live probe, run it through the same finite-timeout,
  stderr-preserving invocation contract as other delegations.

Judged scores can vary by evaluator. Preserve the anchors and disclose close
calls instead of manufacturing precision.
