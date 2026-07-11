---
name: model-delegate
description: "Route self-contained subtasks to cheaper/faster OpenCode lazer models as text-only subagents. Use when the user says \"distribute the work among models\", \"spread this across models\", \"do this cheaply\", \"run this quick\", \"ask another model\", \"get a second opinion from X\", or names a lazer model for a task. Also consult before large context-heavy reads (huge files, bulk repo exploration, research sweeps) where offloading to a cheap model would save cost and context — propose the delegation and wait for approval. Also use when the panel changes: \"a new model was added\", \"re-run the model evals\", \"re-score the panel\", \"update model-delegate\" — see the update workflow. Covers model selection by strength, cost/latency budgets, fallback chains, verification rules, and panel re-evaluation."
---

# Model Delegation

Route self-contained subtasks to `lazer/*` models through the OpenCode CLI,
treating each call as a **text-only subagent**: it returns analysis, drafts,
reviews, or suggested diffs. Claude remains the only writer — never let a
delegated model edit files, and never apply its output without the
verification step for its tier.

Rankings below were measured on 2026-07-07 across 8 realms (58 runs; coding
implementation/debugging/hard-exam, reasoning, structured output, writing,
open-ended design). Full data: `references/eval-results.md`.

## When NOT to delegate (check first)

Skip delegation and do the work directly when ANY of these hold:

- The task depends on conversation or repo context already absorbed — writing
  a self-contained handoff prompt would take longer than the task itself.
- The result needs Claude-level judgment anyway (architecture calls, security
  decisions, anything the user will act on without review).
- The task is a quick targeted lookup (one file, one symbol) — direct tools
  are faster than a 7s+ round trip.
- The user asked for Claude's own opinion.

## Modes

| Trigger | Mode | Behavior |
|---|---|---|
| "run this quick" | speed | qwen-3.7-plus, 120 s cap |
| "do this cheaply" | budget | minimax-m3 for trivial/mechanical; qwen-3.7-plus for anything with logic |
| "distribute the work" / "spread across models" | fan-out | Split into self-contained subtasks; launch all in parallel; match model to subtask by the routing table |
| "use <model> for this" / "ask <model>" | manual | User override — route to the named model regardless of the table |
| No trigger, Claude's judgment | proactive | **Propose first, wait for approval.** One line: what, to which model, why, estimated cost (see Cost line) |

## Routing table

| Model | Route here | Never route here | Notes |
|---|---|---|---|
| `qwen-3.7-plus` | DEFAULT workhorse: exploration, file/repo summarization, standard code analysis, debugging, drafts, structured extraction | — | Elite accuracy, fastest (7 s median), ~$0.4/$1.6 per M. Best value in panel; produced the best design in the open-ended eval |
| `minimax-m3` | Trivial mechanical: reformat, rename lists, boilerplate, simple summaries | Precise semantics, hard logic, multi-part structured prompts | Cheapest by 4×. Measured failures: operator-precedence and boundary-semantics bugs; returned empty output twice on a complex 3-section prompt |
| `glm-5.2` | Hard algorithmic work, tricky implementations, adversarial code review | Anything accepted without verification | Only perfect score on the 2,084-check exam — but shipped a broken self-test it never ran. ALWAYS verify its output yourself |
| `kimi-2.7-code` | Prose the user reads: PR bodies, docs, summaries, review write-ups | Time-boxed/interactive work | Best judged writing. Latency tail up to 12 min — async only |
| `gpt-5.5` | Correctness-critical + fast turnaround; second opinions on hard problems | Budget-sensitive bulk work | Only model that self-verified before answering. Flat latency (~15 s typical). Premium: $5/$30 per M |
| `gemini-3.1-pro` | Very large inputs: huge files, PDFs, images, long transcripts (1M ctx, multimodal) | Ordinary code tasks (no measured edge for 2nd-highest price) | Big-input strength inferred from specs, not eval-tested — flag this when using |
| `deepseek-v4-pro` | Async batch analysis where wall-clock is irrelevant | Anything interactive or deadline-bound | Correct but operationally unreliable: empty-output flake, 17-min run, one 25-min hang killed |
| `claude-fable-5` | Never delegate to it | — | That is the host model's family and the price ceiling; do the work directly instead |

For adversarial multi-model review, pair models with different failure
profiles: `glm-5.2` + `gpt-5.5` + `qwen-3.7-plus`.

## Invocation contract

Run each delegation as a background Bash call so work continues while waiting:

```bash
opencode run -m lazer/<model> --variant high "$(cat <prompt-file>)" 2>/dev/null > <out-file>
```

1. **Prompt file**: write the handoff prompt to the session scratchpad. It must
   be self-contained — the model has no conversation or repo context. Include:
   task, all needed input inline, exact output format, and "be concise".
2. **Parallel**: launch independent delegations in ONE message, all background.
   Wait for completion notifications — never poll.
3. **Timeouts**: 120 s for speed-mode/lookups, 600 s for hard tasks. On expiry,
   kill and fall back.
4. **Validation**: output is valid only if it contains ≥3 lines of meaningful
   content in the requested format. Empty or garbled output → retry ONCE on
   the next model up the fallback chain, never the same model:
   `minimax-m3 → qwen-3.7-plus → glm-5.2 → gpt-5.5`.
5. **Attribution**: when presenting delegated results, say which model produced
   what. Never present a delegated conclusion as verified unless it passed the
   verification tier below.

## Verification tiers

- **Code from any delegated model**: run it / run its tests before presenting.
  Mandatory for `glm-5.2` and `minimax-m3` output.
- **Factual claims about the repo**: spot-check at least one claim against the
  actual source before relying on it.
- **Prose/drafts**: read fully; check no invented facts vs the inputs given.

## Cost line (for proposals and fan-out plans)

Estimate: `(prompt_chars + expected_output_chars) / 4 / 1e6 × ($in + $out)`.
Read current pricing from `~/.config/opencode/opencode.json`
(`.provider.lazer.models.<id>.cost`) — do not trust the table above to stay
current. Typical delegation ≈ $0.001–0.05 on qwen; ~16× that on gpt-5.5.

## Maintenance

- Model list and pricing live in `~/.config/opencode/opencode.json`; the
  routing table reflects the 2026-07-07 eval.
- When a model is added, replaced, or repriced — or the user asks to re-run
  the evals — read **`references/update-workflow.md`** and follow it: detect
  changes, run the harness incrementally, grade with the original anchors,
  propose tier placement for approval, then update the table and append to
  the results file.
- If a routed model consistently underperforms its tier, note it to the user
  and suggest a re-eval rather than silently rerouting.

## Resources

- **`references/eval-results.md`** — full evaluation report backing the
  routing table. Read when the user questions a routing choice or asks about
  model strengths.
- **`references/update-workflow.md`** — panel re-evaluation procedure. Read
  when models are added/changed or a re-score is requested.
- **`eval/`** — the complete reusable benchmark harness (prompts, graders,
  runner). `eval/README.md` has the mechanics; the update workflow drives it.
