# OpenCode Lazer Model Evaluation: 2026-07-07

Seven models were each prompted once through
`opencode run -m lazer/<model> --variant high` across eight text-only realms;
delivery failures were retried where noted. One Claude Fable 5 session judged
the subjective writing and planning outputs, but that model was not evaluated
as a candidate. Raw outputs were stored under `out/`, with graders under `ref/`.

These are benchmark observations, not broad capability rankings. Most cells
have `n=1`, prompts were short, and no files, images, long context, tools, or
multi-turn behavior were evaluated.

## Realms

| # | Realm | Grading |
|---|---|---|
| 1 | Interval-priority implementation | 14 tests |
| 2 | Debug three seeded bugs | Fixed-program output plus bug-list review |
| 3 | Scheduling reasoning | Brute-force-verified answers |
| 4 | Strict incident JSON | Mechanical validator |
| 5 | PR description within 150 words | Judged against supplied facts and requirements |
| 6 | Cron `next_fire` implementation | 14 vectors |
| 7 | Regex/evaluator/cache exam | 2,084 checks against standard/reference behavior |
| 8 | Spreadsheet design and implementation | 11 checks, self-test run, and judged plan |

Realms 1-4 did not separate the seven candidates: all passed the scored checks.
Realms 6-8 exposed differences on these particular tasks.

## Observed Results

| Model | Realm 6 | Realm 7 | Realm 8 battery | Realm 8 plan | Median latency | Maximum latency |
|---|---:|---:|---:|---:|---:|---:|
| `gpt-5.5` | 14/14 | 2083* | 11/11; response showed self-checking | 9.5 | 14.4 s | 220 s |
| `qwen-3.7-plus` | 14/14 | 2083* | 11/11 | 9.5 | 7.2 s | 97 s |
| `glm-5.2` | 14/14 | 2084/2084 | 11/11; supplied self-test failed | 8.0 | 26.9 s | 400 s |
| `gemini-3.1-pro` | 14/14 | 2083* | 11/11 | 8.5 | 69.8 s | 193 s |
| `kimi-2.7-code` | 14/14 | 2083* | 11/11 | 9.0 | 111.1 s | 704 s |
| `deepseek-v4-pro` | 14/14 after retry | 2082/2084 | DNF after a killed run | not scored | 47.9 s | 1005 s completed run |
| `minimax-m3` | 9/14 | 2072/2084 | DNF after two empty responses | not scored | 33.9 s | 133 s |

`*` The shared miss was `4 % 6**7**4`, where float-native evaluators diverged
from arbitrary-precision integer behavior. Preserve the raw miss and disclose
the artifact when interpreting it.

Latency is the observed median and maximum across completed realm runs. With
one primary observation per cell, it does not establish a stable service-level
distribution.

## Per-Model Observations

- `qwen-3.7-plus` matched the strongest scored results except for the shared
  realm-7 artifact and had the lowest observed median latency. Its realm-8 plan
  used iterative evaluation for deep chains.
- `gpt-5.5` also matched the strongest scored results except for the artifact.
  Its realm-8 answer visibly described and performed sanity checks.
- `glm-5.2` was the only candidate to pass all realm-7 checks. Its engine passed
  the realm-8 battery, but one supplied self-test used an invalid cell reference
  and failed, so the response was not self-consistent.
- `kimi-2.7-code` passed the scored hard realms and received the strongest
  writing judgment in realm 5. Two hard runs took roughly 10.5-11.7 minutes.
- `gemini-3.1-pro` passed the scored checks except for the shared artifact. This
  benchmark did not establish a task-specific advantage over the other strong
  candidates.
- `deepseek-v4-pro` had one regex failure, one empty response, one completed run
  of about 17 minutes, and one realm-8 run killed after about 25 minutes.
- `minimax-m3` missed realm-6 strict-after semantics and several realm-7 cases,
  including unary-minus precedence. It returned empty output twice on realm 8.

These statements are limited to the prompts and grader behavior above. They do
not establish causal explanations for model behavior.

## Routing Signals

- Default text analysis and code-shaped work: `qwen-3.7-plus`, based on broad
  scored coverage and the lowest observed median latency in this run.
- Mechanical low-stakes transformations: `minimax-m3`, with semantic validation
  and fallback because its hard-prompt results were weaker.
- Hard algorithmic implementation: `glm-5.2`, followed by independent tests
  because its supplied realm-8 self-test failed.
- User-facing prose with a loose deadline: `kimi-2.7-code`, based on the judged
  writing result and observed latency tail.
- Correctness-focused second opinion: `gpt-5.5`, with the same independent
  verification required for every delegated model.
- Avoid deadline-bound routing to `deepseek-v4-pro` based on the observed empty,
  long, and killed runs.

## Limitations

- One primary run per model/realm, with retries only where noted.
- Short, text-only, one-shot prompts; no repository tools, file attachments,
  multi-turn work, long context, or media inputs.
- Mechanical graders cover selected behavior, not complete correctness.
- Realms 5 and realm-8 planning were judged by one model session; evaluator bias
  and score precision are unresolved.
- Provider load and model versions may have changed since 2026-07-07.
