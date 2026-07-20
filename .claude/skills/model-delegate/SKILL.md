---
name: model-delegate
description: >-
  Route self-contained subtasks to OpenCode Lazer models only when the user
  explicitly asks to distribute work, run work quickly or cheaply, ask another
  model, get a second opinion, use a named Lazer model, or update/re-run the
  model panel evaluation. Covers model selection, robust invocation, fallback,
  attribution, verification, and panel maintenance. Never triggers proactively.
compatibility: Requires the OpenCode CLI with the Lazer provider, text-file attachments, and GNU timeout.
---

# Model Delegation

Route explicitly requested subtasks through `opencode run -m lazer/<model>`.
Treat results as text suggestions: delegated models do not become trusted
writers, and their conclusions retain attribution until independently checked.

The user's explicit delegation request is sufficient approval to send the
task's necessary context to the selected Lazer model. Do not add a data-
classification or second approval gate. Include only context needed to complete
the task.

Do not trigger this skill proactively. Without an explicit delegation request,
do the work directly.

The routing observations come from one run per model/realm on 2026-07-07, with
retries only for delivery failures. Read `references/eval-results.md` for the
measured scope and limitations. Do not present cost estimates.

## Modes

| Explicit request | Mode | Behavior |
|---|---|---|
| "run this quick" | speed | Use `qwen-3.7-plus`; 120-second timeout |
| "do this cheaply" | budget | Use `minimax-m3` only for mechanical work; otherwise `qwen-3.7-plus` |
| "distribute/spread the work" | fan-out | Split into independent prompts and invoke them through parallel tool calls |
| "use/ask <model>" | manual | Use the named available `lazer/<model>` |
| "get a second opinion" | review | Use a model with a different measured failure profile |

## Routing

| Model | Route here | Avoid here | Measured basis |
|---|---|---|---|
| `qwen-3.7-plus` | Default: exploration summaries, code analysis, debugging, drafts, extraction | Claims requiring acceptance without verification | Strong scores across the eight prompts; lowest observed median latency in this run |
| `minimax-m3` | Mechanical formatting, list transforms, simple summaries | Precise semantics, hard logic, multi-part outputs | Passed simpler realms; missed hard semantic cases and returned empty output twice on realm 8 |
| `glm-5.2` | Hard algorithms, tricky implementation, adversarial review | Unverified code | Only model with all realm-7 checks; emitted a faulty realm-8 self-test |
| `kimi-2.7-code` | User-facing prose when a long wait is acceptable | Interactive or tightly timed work | Strongest judged writing in this run; observed hard-task tail reached about 12 minutes |
| `gpt-5.5` | Correctness-critical second opinions with verification | Bulk work without a specific reason | Near-complete mechanical scores and visible self-checking in its realm-8 response |
| `gemini-3.1-pro` | Alternative second opinion | Preferential routing without task-specific evidence | Strong benchmark scores, but no measured advantage on these prompts |
| `deepseek-v4-pro` | Explicitly requested asynchronous analysis | Interactive or deadline-bound work | One empty response, one long run, and one killed run in this harness |

Do not infer image, PDF, video, long-context, tool-use, or agentic capability
from this evaluation; none was tested. This workflow attaches UTF-8 text files
and consumes text output only.

For multi-model review, use models with different observed failure profiles,
such as `glm-5.2`, `gpt-5.5`, and `qwen-3.7-plus`.

## Invocation

Create a UTF-8 prompt file and a unique output directory. Make the prompt
self-contained: task, necessary text inputs, requested output format, and a
conciseness instruction. Attach additional inputs only when they are text.

Use OpenCode's file attachment instead of expanding prompt contents into a
shell argument:

```bash
timeout --signal=TERM --kill-after=5s "${timeout_seconds}s" \
  opencode run --model "lazer/${model}" --variant high --format default \
  --file "$prompt_file" \
  "Follow the attached UTF-8 prompt exactly and return only the requested text." \
  >"$output_file" 2>"$error_file"
```

Use 120 seconds for speed requests and 600 seconds for hard tasks unless the
user specifies another bound. Treat exit 124 as timeout and any other nonzero
status as failure. Preserve and report relevant stderr; never redirect it to
`/dev/null`.

Launch independent invocations as parallel tool calls. Completion is the tool
result and process exit status; do not assume background completion
notifications and do not poll detached processes.

## Validate And Fall Back

Validate meaning and requested structure, not output length. Examples:

- Parse JSON when JSON was requested and check required keys/types.
- Confirm every requested section or item is present.
- Reject empty output, refusal text that does not answer the task, truncated
  syntax, or prose where a strict machine-readable format was requested.
- For code, extract it and apply the verification tier below.

On delivery or semantic-format failure, retry once on the next suitable model:
`minimax-m3 -> qwen-3.7-plus -> glm-5.2 -> gpt-5.5`. Do not retry the same model.
If a manual model request fails, report the failure before using a fallback.

## Attribution And Verification

- Attribute each delegated result to its model.
- Run relevant tests or checks before presenting delegated code as verified.
- Spot-check repository claims against source files.
- Read prose fully and compare factual statements with the supplied inputs.
- Label unverified conclusions explicitly; never turn attribution into an
  implied endorsement.

## Maintenance

Read `references/update-workflow.md` only when the user explicitly requests a
panel update, re-score, or re-run. The reusable local harness is under `eval/`;
`eval/README.md` documents its mechanics and execution risk.

Do not silently change routing after one bad result. Report repeated
underperformance and recommend an explicitly requested re-evaluation.
