# Update workflow — re-evaluating the panel and refreshing the routing table

Follow this when a lazer model is added, removed, replaced, or repriced, or
when the user asks to re-run the model evals. This workflow owns ONLY this
skill's routing table and eval records. Gateway registration is the
`add-model` skill's job; the GSD reviewer panel is `gsd-update-reviewers`' job
— point the user there for those.

## 1. Detect what changed

Diff the live config against the routing table in `../SKILL.md`:

```bash
python3 -c "
import json
cfg = json.load(open('$HOME/.config/opencode/opencode.json'))
for mid, m in cfg['provider']['lazer']['models'].items():
    c = m.get('cost', {})
    print(mid, '|', c.get('input'), '/', c.get('output'), '| ctx', m.get('limit',{}).get('context'))"
```

Classify each difference: **new model** (full eval), **replaced model** (full
eval, treat as new), **repriced** (no re-run; update Cost line guidance and
value judgments only), **removed** (drop the table row; keep its history in
eval-results.md).

## 2. Run the eval (incremental by default)

Evaluate ONLY new/changed models unless the user asks for a full panel re-run
or the harness itself changed. Mechanics live in `../eval/README.md` — read it
now; do not improvise commands. Summary: `mkdir -p out work` in `../eval/`,
launch all 8 realms for the model as parallel background calls via
`run_one.sh`, 600 s+ timeouts, wait for notifications.

Reliability protocol (from the 2026-07-07 run): empty output → one retry and
record the flake; two empties on the same realm = DNF for that realm; a run
past ~2× the timeout gets killed and recorded as DNF. Flakes and tails are
first-class results — they decide interactive-tier eligibility.

## 3. Grade

- **Mechanical realms (1, 2, 3, 4, 6, 7)**: use the graders in `../eval/ref/`.
  If any grader was modified since the last run, re-validate it against its
  reference solution FIRST — a fresh harness must score 100% on the reference
  before model results count.
- **Standing discounts**: realm 7's `4 % 6**7**4` case (punishes float-native
  evaluators); realm 4's rollback check accepts "rolled back".
- **Judged realms — apply the original anchors for consistency:**
  - Realm 5 (writing): accuracy to inputs, ≤150-word cap is a hard
    instruction-following penalty (~1.5 pts), completeness (what/why/risk/
    out-of-scope), no invented facts. 9 = accurate+complete+within cap;
    8-8.5 = minor organizational flaws; ≤7.5 = cap violation or inaccuracy.
  - Realm 8 (design): battery score is the floor; judge the PLAN on data
    structures, real invariants, and a genuinely-argued rejected alternative.
    Deduct for: global `sys.setrecursionlimit` instead of iterative design
    (-0.5 to -1), delegating parsing to `ast` (-0.5), self-tests that were
    clearly never executed (-1 to -1.5). Credit visible self-verification.
- Record median AND max latency across all realms, and estimated cost
  (visible chars/4 × current pricing — note it is a floor).

## 4. Compare and propose (approval gate)

Build a comparison table: new model's per-realm scores, median/max latency,
and price next to the current tier occupants. Propose a tier placement and any
routing-table changes (including displacements — e.g. a new value king demotes
qwen), each with a one-line justification tied to measured results. **Present
this to the user and wait for approval before editing anything.**

## 5. Write the updates

After approval, keep these consistent in one pass:

1. `../SKILL.md` — routing table row(s): route-here / never-route / notes with
   the measured basis; update the eval-date stamp in the intro; update the
   fallback chain if the cheap tier changed; update mode defaults if the
   workhorse changed.
2. `../references/eval-results.md` — APPEND a dated section with the new
   scores, latency, flakes, and judged notes. Never rewrite or delete previous
   results; they are the audit trail.
3. `../eval/README.md` — only if the harness or protocol itself changed.

## 6. Verify

- Every model in `opencode.json`'s lazer provider appears in the routing table
  (or is explicitly listed as excluded, like claude-fable-5).
- No table row cites a model absent from the config.
- Frontmatter description still <1024 chars if edited.
- Quick probe of any newly added model:
  `opencode run -m lazer/<id> --variant high "Reply with exactly: PROBE_OK"`.

## Consistency warning

Judged scores (realms 5, 8) are assigned by whichever Claude session runs this
workflow. Stick to the anchors above rather than personal taste, and when a
judgment call is close, say so in eval-results.md instead of forcing precision.
