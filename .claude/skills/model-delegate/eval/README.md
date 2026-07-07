# Model eval harness

Reusable benchmark behind the model-delegate routing table. Last full run:
2026-07-07 (7 lazer models × 8 realms; report in `../references/eval-results.md`).
Re-run this when a model is added to or swapped in the lazer gateway.

## Realms

| # | tests | grading |
|---|---|---|
| 1 | coding: implement `resolve_schedule` | `ref/run_realm1_tests.py` (14 tests) |
| 2 | coding: debug 3 seeded bugs | run fixed program: `TZ=America/New_York python3 candidate.py < ref/realm2_input.txt`, diff vs `ref/realm2_expected.txt`; read bug list for false positives |
| 3 | reasoning puzzle | answers: PART_A Wednesday, PART_B 2 (verify: `ref/realm3_brute.py`) |
| 4 | structured JSON | `ref/realm4_validator.py <out>` — treat "rolled back" as satisfying the rollback-mention check |
| 5 | PR description ≤150 words | judged: accuracy to inputs, word cap, completeness |
| 6 | coding hard: cron `next_fire` | `ref/run_realm6_tests.py` (14 vectors) |
| 7 | 3-problem exam (regex/eval/cache) | `ref/grade_realm7.py` — 2,084 checks fuzzed vs `re`/`eval`/reference sim. Discount the known `4 % 6**7**4` big-int artifact |
| 8 | open-ended spreadsheet design | `ref/realm8_battery.py` (11 checks) + run their self-tests + judge the PLAN |

## How to score one model

```bash
cd <this eval dir>
mkdir -p out work
./run_one.sh <model-suffix> <slug> <realm>   # e.g. ./run_one.sh qwen-3.7-plus qwen 7
# launch realms in parallel (background); .meta files record ms= latency and bytes=
```

Then per coding realm, extract and grade (marker = required symbol):

```bash
d=work/r7-<slug>; mkdir -p $d
python3 ref/extract_code.py out/r7-<slug>.md regex_match > $d/candidate.py
cp ref/grade_realm7.py $d/ && (cd $d && timeout 300 python3 grade_realm7.py)
```

Markers: realm1 `resolve_schedule`, realm2 `bucket_events`, realm6 `next_fire`
(also copy `ref/realm6_vectors.py ref/run_realm6_tests.py` into the work dir),
realm7 `regex_match`, realm8 `class Spreadsheet` (use `ref/grade_realm8.sh <slug>`,
which expects this directory layout).

## Rules learned the hard way

- 10-min timeout minimum; kimi/deepseek legitimately run 10–17 min on realm 7.
- Empty output (rc=0, 0 bytes) happens — retry once and record the flake; two
  empties = delivery failure, score DNF.
- Grade the graders first: every realm has a reference solution; a fresh
  harness must score 100% on it before any model result counts.
- Record median AND max latency across all realms — tails routed kimi and
  deepseek out of interactive tiers, not their accuracy.
- Compare cost from visible tokens only (chars/4 × price from
  `~/.config/opencode/opencode.json`); hidden reasoning tokens make it a floor.
