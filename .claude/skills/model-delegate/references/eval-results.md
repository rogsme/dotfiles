# OpenCode Lazer Model Evaluation — 2026-07-07 (final, realms 1–8)

7 models, one-shot via `opencode run -m lazer/<model> --variant high`.
`lazer/claude-fable-5` excluded by decision: assumed best-in-class in every realm
and the most expensive ($10/$50 per M) — the ceiling the rubric routes up to.
Judge: Claude Fable 5. Realms 1–4, 6, 7 mechanically anchored (test suites,
fuzzers vs ground truth, validators); realms 5 and 8-planning judged.

Raw outputs in `out/`, graders in `ref/`, per-model work dirs in `work/`.

## Realms

| # | realm | grading |
|---|---|---|
| 1 | Coding — implement (interval priority flattening) | hidden 14-test suite |
| 2 | Coding — debug (3 seeded bugs) | bug list + fixed program executed |
| 3 | Reasoning (schedule puzzle + counting variant) | brute-force verified answers |
| 4 | Structured output (strict JSON schema) | mechanical validator |
| 5 | Technical writing (PR description ≤150 words) | judged |
| 6 | Coding — hard (cron `next_fire`) | hidden 14-vector suite |
| 7 | Coding — exam (regex engine, expression evaluator, LRU+TTL byte cache) | 2,084 checks: fuzzed vs `re`/`eval`/reference sim |
| 8 | Design exercise (mini spreadsheet engine: PLAN + impl + self-tests) | 11-check behavioral battery + self-test run + judged plan |

Realms 1–4 were a clean sweep for all 7 models (ceiling effect) — realms 6–8
were added to force separation, and did.

## Headline matrix

| model | r6 hard | r7 exam (2084) | r8 battery (11) | r8 plan (judged) | median lat | max lat | $/M in/out |
|---|---|---|---|---|---|---|---|
| gpt-5.5 | 14/14 | 2083* | 11 + self-verified | 9.5 | 14.4 s | 220 s | 5 / 30 |
| qwen-3.7-plus | 14/14 | 2083* | 11 | 9.5 | **7.2 s** | 97 s | 0.4 / 1.6 |
| glm-5.2 | 14/14 | **2084 (perfect)** | 11, own test buggy | 8.0 | 26.9 s | 400 s | 1.4 / 4.4 |
| gemini-3.1-pro | 14/14 | 2083* | 11 | 8.5 | 69.8 s | 193 s | 2 / 12 |
| kimi-2.7-code | 14/14 | 2083* | 11 | 9.0 | 111.1 s | **704 s** | 0.95 / 4 |
| deepseek-v4-pro | 14/14† | 2082 (1 real bug) | **DNF (killed 25 min)** | — | 47.9 s | **1005 s** | 1.74 / 3.48 |
| minimax-m3 | **9/14** | **2072 (12 real fails)** | **DNF (2× empty)** | — | 33.9 s | 133 s | 0.1 / 0.4 |

\* sole miss is a shared artifact (`4 % 6**7**4` needs arbitrary-precision ints;
punishes float-native evaluators) — discounted. † after one retry; first attempt
returned 0 bytes.

Median/max latency across all completed runs (realms 1–8). Earlier-round detail
(realm 5 word-cap violations by gpt-5.5 and minimax; realm-4 validator regrade)
preserved in git-style history below the fold of this file's first version.

## What the hard rounds actually showed

- **glm-5.2** was the only model to go perfect on the realm-7 exam (kept integer
  arithmetic through the overflow case). But in realm 8 it shipped a self-test
  that uses a spec-invalid cell ref (`"H"`, no row) and asserts on it — its
  engine was right, its test was wrong, and it clearly never executed its own
  tests. Elite implementer, weak self-verification.
- **gpt-5.5** visibly ran its own sanity checks in realm 8 before answering
  (cycles, ranges, deep chain) — the only model that demonstrably verified.
  Effectively perfect everywhere, never slower than 3.7 min, usually ~15 s.
- **qwen-3.7-plus** matched gpt-5.5's scores at 1/16th the price, and produced
  the single best design of realm 8: an explicit two-phase evaluation stack that
  avoids Python's recursion limit — no other model solved deep chains without
  touching `sys.setrecursionlimit`. Fastest model in the panel, every round.
- **kimi-2.7-code** is elite on quality (all rounds) and writes the best prose,
  but took 10.5–11.7 minutes on the two hardest rounds.
- **gemini-3.1-pro** never made a real error, but leaned on crutches
  (`ast` module for parsing, global recursion-limit bump) and never
  distinguished itself for its 2nd-highest price.
- **deepseek-v4-pro** made one real regex backtracking error, produced one empty
  output, took 16.75 min on the exam, and had to be killed at ~25 min on realm 8.
  Capable but operationally untrustworthy in this CLI setup.
- **minimax-m3** implemented `-2**2` as `(-2)**2` in realm 7 (the spec spelled
  out the correct example) and returned empty output twice on realm 8. Its
  realm-6 failure was also semantics ("strictly after"). Pattern: cuts corners
  on precise semantics, and its delivery pipeline breaks on complex prompts.

## Final tiers

1. **Elite, fast, expensive** — `gpt-5.5`. The only "verifies before shipping"
   model. 12–16× qwen's cost.
2. **Elite value (default)** — `qwen-3.7-plus`. Indistinguishable from the
   elite tier on every measured axis; fastest; near-cheapest.
3. **Elite with caveats** — `glm-5.2` (best raw exam score, sloppy
   self-verification), `kimi-2.7-code` (elite + best writing, 10× slower tails).
4. **Premium, no observed edge** — `gemini-3.1-pro`. Fine everywhere; its likely
   real edge (1M multimodal context) was not exercised by this eval.
5. **Operational risk** — `deepseek-v4-pro`. Good brain, bad service: flakes,
   extreme tails, one real bug under pressure.
6. **Cheap tier only** — `minimax-m3`. 4× cheaper than qwen; fails on precise
   semantics and complex-prompt delivery.

## Routing rubric (seed for the skill — accuracy × cost × latency)

- **Trivial mechanical tasks** (rename, config bump, one-liner, format):
  `minimax-m3`. Cheapest by 4×; its failure modes don't apply. Fall back to
  `qwen-3.7-plus` on any sign of empty/garbled output.
- **Default for everything code-shaped** (features, debugging, refactors,
  reviews, extraction): `qwen-3.7-plus`. Elite-tier measured accuracy, fastest,
  0.4¢-class cost. This is the workhorse.
- **Prose the user will read** (PR bodies, docs, review summaries):
  `kimi-2.7-code` when async (best writing), `glm-5.2` when latency matters.
- **Hard algorithmic / correctness-critical code**: `glm-5.2` (best exam score,
  cheap) with output always verified by tests; `gpt-5.5` when you also want
  speed or the task punishes non-verification.
- **Second opinion / adversarial review panels**: pair models with different
  failure profiles — e.g. `glm-5.2` + `gpt-5.5` + `qwen-3.7-plus`.
- **Long-context or multimodal input** (>200K tokens, images, PDFs, video):
  `gemini-3.1-pro` — untested here, but it is the only panel member built for it.
- **Mission-critical, price-no-object** (architecture, final gate, one-shot
  irreversible): `claude-fable-5` (assumed apex, excluded from testing).
- **Avoid**: `deepseek-v4-pro` for anything interactive or time-boxed;
  `minimax-m3` for precise semantics, hard logic, or long structured outputs.

## Limitations

- One-shot CLI prompts; no agentic tool-use loops, no multi-turn, no >4 KB
  context; kimi/qwen/deepseek long-context behavior untested.
- n=1 per cell (n=2 where retried); latency tails clearly have variance.
- Cost estimates from visible tokens only (`--variant high` reasoning hidden).
- Realms 5 and 8-planning judged by Claude Fable 5 — model family excluded from
  the panel, but judge bias is possible.
