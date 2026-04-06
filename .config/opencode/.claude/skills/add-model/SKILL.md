---
name: add-model
description: Use this skill when the user wants to add, register, update, or look up an AI model in OpenCode/Lazer config, including requests like "add this model", "register model X", "update models.dev metadata", "models.dev lookup", or "new model for opencode". Also use it when updating the bundled model catalog in this repo.
---

# Add Model to OpenCode

This skill updates the Lazer provider model catalog in `~/.config/opencode/opencode.json` and, when needed, the bundled defaults in `install.sh`. Treat `install.sh` as the source of truth for shipped models; treat the live OpenCode config as user state that must be preserved.

## Workflow

### 1. Identify the target

- If the user wants the change shipped with the installer, update `install.sh`'s `LAZER_PROVIDER_JSON`.
- If the user only wants their local OpenCode config changed, update `~/.config/opencode/opencode.json`.
- If the request is ambiguous, ask one short clarifying question before writing anything.

### 2. Parse the user's request

The user will provide a model ID like `lazer/deepinfra/Qwen/Qwen3-Coder-480B`. Parse it as:
- **Provider**: the first segment (e.g., `lazer`)
- **Model key**: everything after the provider (e.g., `deepinfra/Qwen/Qwen3-Coder-480B`)

If the user doesn't specify a provider, ask unless the request is clearly for a bundled Lazer model.

### 3. Resolve the model against models.dev

```bash
curl -s https://models.dev/api.json -o /tmp/models-dev-api.json
```

- Search by `id`, `slug`, `name`, and the last path segment of the user's model ID.
- Prefer exact path matches over fuzzy matches.
- If multiple plausible matches exist, present the candidates and ask which one to use.
- If no match exists, tell the user and ask for manual specs instead of guessing.

### 4. Fetch the OpenCode schema and compare with repo examples

```bash
curl -s https://opencode.ai/config.json -o /tmp/opencode-config-schema.json
```

- Use the schema to confirm field names before writing.
- Use `install.sh` as the local reference for the current bundled shape.
- Reuse nearby entries in `LAZER_PROVIDER_JSON` for naming, modality, reasoning, and limit patterns.

### 5. Map source data to OpenCode format

Build the model entry from source data and the existing config shape:

```json
{
  "name": "<display name from models.dev>",
  "family": "<model family — derive from model name, e.g., 'qwen', 'gemini-flash', 'gpt'>",
  "release_date": "<from models.dev if available, ISO format YYYY-MM-DD>",
  "attachment": <true if model supports image/pdf/file inputs>,
  "reasoning": <true if model supports reasoning/thinking>,
  "temperature": <true if temperature is configurable>,
  "tool_call": <true if model supports function/tool calling>,
  "structured_output": <true if supported>,
  "cost": {
    "input": <per 1M input tokens>,
    "output": <per 1M output tokens>,
    "cache_read": <if available>,
    "cache_write": <if available>
  },
  "limit": {
    "context": <context window size in tokens>,
    "output": <max output tokens>
  },
  "modalities": {
    "input": ["text", ...other supported input types],
    "output": ["text"]
  }
}
```

Add optional fields only when the source data supports them:
- `interleaved.field = reasoning_content` for models that emit reasoning in a separate field, especially Qwen, GLM, Kimi, MiniMax, and DeepSeek variants.
- `variants` for GPT-style reasoning effort levels.
- `cost.context_over_200k` when pricing changes above 200k context.
- `limit.input` only when max input differs from total context window.

Normalize pricing to per 1M tokens. Do not invent missing cost or limit values.

### 6. Confirm the exact entry

- Show the complete JSON fragment before writing a live config file.
- If the model already exists, update it in place instead of adding a duplicate.
- If models.dev data is stale or incomplete, flag the uncertainty and ask for user input.

### 7. Write the change safely

Read `~/.config/opencode/opencode.json`, add the model under the specified provider's `models` object, and write the file back. Preserve the existing formatting and structure.

Use `jq` and atomic writes. Preserve unrelated provider keys, defaults, and custom models.

If the provider doesn't exist yet in the config, create the full provider entry and ask the user for:
- `npm`: the AI SDK package (e.g., `@ai-sdk/openai-compatible`)
- `name`: display name
- `options.baseURL`: API endpoint URL

## Important notes

- Cost values in models.dev may use different units (per token, per 1K, per 1M) — normalize to **per 1M tokens** to match the existing opencode.json entries.
- Always cross-reference the config schema from opencode.ai before adding new fields.
- `install.sh` already shows current bundled shapes for `structured_output`, `interleaved`, and GPT-style `variants`; mirror those patterns instead of inventing new ones.
- If models.dev doesn't have pricing or limit data, stop and ask the user rather than guessing.

## Verification

- After editing live config, run `lazer-opencode models list` or inspect `jq '.provider.lazer.models' ~/.config/opencode/opencode.json`.
- After editing `install.sh`, run `bash -n install.sh` and confirm the new entry round-trips into the generated config.
