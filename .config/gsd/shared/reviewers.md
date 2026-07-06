# GSD Reviewer Registry

Edit THIS file only. `/gsd-review`, `/gsd-code-review`, and `/gsd-ui-review` all read
it at runtime and build their panels, output sections, and score tables from it.
Adding a reviewer = adding one table row. Removing one = deleting a row.
Log model swaps in `~/.config/gsd/CHANGELOG.md`.

## Settings

- timeout_ms: 600000        # 10 minutes per reviewer — slow high-variant models need it;
                            # shorter timeouts killed models mid-response and produced
                            # empty output falsely marked as "failed"
- execution: parallel       # launch every reviewer in one message; wait, never poll
- keep_host_model: true     # Claude stays on the panel even when running inside Claude Code

## Panel

| slug     | display         | default | command                                                                     |
|----------|-----------------|---------|-----------------------------------------------------------------------------|
| gemini   | Gemini 3.1 Pro  | yes     | opencode run -m lazer/gemini-3.1-pro --variant high "$(cat {prompt})" 2>/dev/null > {out} |
| codex    | GPT-5.5         | yes     | opencode run -m lazer/gpt-5.5 --variant high "$(cat {prompt})" 2>/dev/null > {out} |
| minimax  | MiniMax M3      | yes     | opencode run -m lazer/minimax-m3 --variant high "$(cat {prompt})" 2>/dev/null > {out} |
| kimi     | Kimi 2.7 Code   | yes     | opencode run -m lazer/kimi-2.7-code --variant high "$(cat {prompt})" 2>/dev/null > {out} |
| glm-5    | GLM-5.2         | yes     | opencode run -m lazer/glm-5.2 --variant high "$(cat {prompt})" 2>/dev/null > {out} |
| qwen     | Qwen 3.6 Plus   | yes     | opencode run -m lazer/qwen-3.6-plus --variant high "$(cat {prompt})" 2>/dev/null > {out} |
| deepseek | DeepSeek V4 Pro | yes     | opencode run -m lazer/deepseek-v4-pro --variant high "$(cat {prompt})" 2>/dev/null > {out} |
| claude   | Claude Fable 5  | yes     | opencode run -m lazer/claude-fable-5 --variant high "$(cat {prompt})" 2>/dev/null > {out} |

## Invocation contract

Review skills MUST follow these rules; nothing about the panel is hardcoded in any skill.

1. **Selection:** rows with `default: yes`, unless the user passed `--only slug1,slug2`.
   Apply Settings: keep the host model on the panel (`keep_host_model`). Every reviewer
   row counts as independent — each runs in its own session, even when its CLI matches
   the host runtime.
2. **Availability:** the required CLI is the first word of `command`. `command -v` it;
   if missing, skip that reviewer with a note in the output — never fail the whole review.
3. **Substitution:** replace `{prompt}` with the skill's prompt file
   (`/tmp/gsd-{kind}-prompt-{phase}.md`) and `{out}` with
   `/tmp/gsd-{kind}-{slug}-{phase}.md`, where `{kind}` is `review`, `code-review`,
   or `ui-review`.
4. **Execution:** launch ALL selected reviewers in parallel, each with `timeout_ms`.
   Claude Code: one background Bash call per reviewer, all in a single message, then
   WAIT for completion notifications — do not poll. OpenCode: batch all calls in one
   parallel tool block.
5. **Validation:** output counts as valid only if it contains ≥3 lines of meaningful
   content matching the requested format. Otherwise mark that reviewer failed, note it,
   continue with the rest. Never auto-retry.
6. **Hard rules:** the stderr redirection is part of each command cell — do not add
   or strip `2>/dev/null` per-row. (If a `claude -p` row ever returns: never add
   `--no-input` to it — unsupported, fails silently.)
7. **Dynamic output:** per-reviewer sections, status lines, and score-table columns are
   generated from the `display` column of the rows actually invoked (and marked
   failed/skipped as appropriate).
8. **Cleanup:** delete the `/tmp/gsd-{kind}-*` files after the results are written into
   the phase artifact.
