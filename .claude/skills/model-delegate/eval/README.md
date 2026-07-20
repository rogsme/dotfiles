# Model Evaluation Harness

Reusable local benchmark behind the model-delegate routing observations. The
last full run was 2026-07-07: seven Lazer models across eight realms. Results
and limitations are in `../references/eval-results.md`.

Run this harness only after an explicit user request. `run_one.sh` invokes the
OpenCode-specific `lazer/<model>` provider and attaches each prompt as a text
file, avoiding command substitution and prompt-size argument limits.

## Accepted Local Execution Risk

Generated candidate Python is extracted, imported, and executed locally with
timeouts. The harness is **not sandboxed**: timeouts bound elapsed time but do
not prevent filesystem, network, subprocess, or credential access. An explicit
request to run the evaluation accepts this local risk. Use a disposable host or
external sandbox when that risk is unacceptable.

## Realms

| # | Test | Grading |
|---|---|---|
| 1 | Implement `resolve_schedule` | `ref/run_realm1_tests.py` (14 tests) |
| 2 | Debug three seeded bugs | Run the fixed program with `TZ=America/New_York`; compare with `ref/realm2_expected.txt` and inspect reported bugs |
| 3 | Reasoning puzzle | `PART_A: Wednesday`, `PART_B: 2`; verify with `ref/realm3_brute.py` |
| 4 | Structured JSON | `ref/realm4_validator.py <output>`; both "rollback" and "rolled back" satisfy the summary check |
| 5 | PR description of at most 150 words | Judge accuracy, cap compliance, completeness, and invented claims |
| 6 | Implement cron `next_fire` | `ref/run_realm6_tests.py` (14 vectors) |
| 7 | Regex/evaluator/cache exam | `ref/grade_realm7.py` (2,084 checks); separately disclose the known large-integer comparison artifact |
| 8 | Spreadsheet design | `ref/realm8_battery.py` (11 checks), candidate self-tests, and judged plan |

## Run One Model

`run_one.sh` creates `out/`, validates arguments, records stdout/stderr/meta
separately, enforces a real timeout, and returns the OpenCode process status.
The default evaluation timeout is 1,200 seconds; override it explicitly when
needed.

```bash
./run_one.sh <model-suffix> <slug> <realm> [timeout-seconds]
```

Example:

```bash
./run_one.sh qwen-3.7-plus qwen 7 1200
```

Launch independent realms through parallel tool calls and use each tool result
as completion. Do not detach jobs or assume completion notifications. Exit 124
means timeout. Preserve `.stderr` files and record empty successful output as a
delivery failure eligible for one retry on a different run.

## Extract And Grade

Create per-realm work directories before extraction. Example for realm 7:

```bash
d="work/r7-<slug>"
mkdir -p "$d"
python3 ref/extract_code.py "out/r7-<slug>.md" regex_match >"$d/candidate.py"
cp ref/grade_realm7.py "$d/"
(cd "$d" && timeout --signal=TERM --kill-after=5s 300s python3 grade_realm7.py)
```

Run graders with their working directory set to the candidate directory when
they import `candidate.py`. Required extraction markers are realm 1
`resolve_schedule`, realm 2 `bucket_events`, realm 6 `next_fire`, realm 7
`regex_match`, and realm 8 `class Spreadsheet`. Realm 8 uses
`ref/grade_realm8.sh <slug>` and the standard `out/`/`work/` layout.

## Protocol

- Retry an empty response once and record both attempts. Two empty responses
  for one realm are a delivery failure.
- Treat timeout as a result, not a reason to remove the bound.
- Validate every changed grader against its reference before counting future
  model results.
- Record median and maximum observed latency, including retries and timeouts
  with clear labels.
- Keep judged scores explicitly subjective and preserve the original anchors.
- Do not infer untested multimodal, long-context, tool-use, or agentic ability.
