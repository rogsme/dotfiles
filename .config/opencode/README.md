# OpenCode Configuration

This directory contains the primary OpenCode configuration used on this machine.

## Purpose

The top-level config here defines:

- the default model and agent model routing
- enabled tools and global instructions
- custom provider and model aliases
- UI keybinds and theme behavior
- installed plugins
- local custom agents

## Directory Layout

| Path | Purpose |
| --- | --- |
| `opencode.json` | Main OpenCode config |
| `tui.json` | TUI theme and keybind configuration |
| `settings.json` | Local OpenCode settings |
| `dcp.jsonc` | Dynamic Context Pruning plugin config |
| `agents/` | Custom OpenCode agents |
| `instructions/` | Local instruction content |
| `pal-mcp-server/` | Separate MCP server project used alongside OpenCode |

## Main Config

The main configuration lives in `opencode.json`.

### Default Models

- Default chat model: `openai/gpt-5.4`
- Planning agent model: `openai/gpt-5.4`
- Build agent model: `openai/gpt-5.3-codex`

Both configured agents currently use `reasoningEffort: "medium"`.

### Enabled Tools

- `webfetch`: enabled

### Global Instructions

This config loads one shared instruction file:

- `~/.config/opencode/instructions/shell-strategy/shell_strategy.md`

That instruction set is specifically aimed at non-interactive shell use. It teaches the agent to avoid commands that hang in headless environments, prefer non-interactive flags, and avoid TTY-dependent workflows.

### Custom Provider

The config defines a provider named `lazer` using `@ai-sdk/openai-compatible` with:

- provider name: `Lazer`
- base URL: `https://llm.lazertechnologies.com/v1`

### Registered Models

The `lazer` provider currently exposes these model IDs:

- `deepinfra/MiniMaxAI/MiniMax-M2.5`
- `deepinfra/Qwen/Qwen3-235B-A22B-Instruct-2507`
- `deepinfra/Qwen/Qwen3-235B-A22B-Thinking-2507`
- `deepinfra/Qwen/Qwen3-Coder-480B-A35B-Instruct`
- `deepinfra/Qwen/Qwen3-Coder-480B-A35B-Instruct-Turbo`
- `deepinfra/deepseek-ai/DeepSeek-V3.2`
- `deepinfra/moonshotai/Kimi-K2.5`
- `deepinfra/openai/gpt-oss-120b`
- `deepinfra/openai/gpt-oss-120b-Turbo`
- `deepinfra/zai-org/GLM-5`
- `gemini/gemini-2.0-flash`
- `gemini/gemini-2.5-flash`
- `gemini/gemini-2.5-pro`
- `gemini/gemini-3-flash-preview`
- `gemini/gemini-3.1-pro-preview`
- `openai/gpt-5.3-codex`
- `openai/gpt-5.4`
- `xai/grok-code-fast-1`

These are presented in OpenCode with friendlier display names via the provider config.

## UI And Keybinds

Keybinds are defined in both `opencode.json` and `tui.json`.

Current bindings:

- leader: `ctrl+x`
- exit app: `ctrl+c,<leader>q`
- open editor: `<leader>e`
- theme picker: `<leader>t`

`tui.json` currently uses:

- theme: `system`

## Plugins

The current OpenCode plugin list is:

- `@tarquinen/opencode-dcp@latest`
- `opentmux`
- `opencode-snip@latest`
- `@franlol/opencode-md-table-formatter@latest`

### Plugin Notes

- `@tarquinen/opencode-dcp@latest` works with `dcp.jsonc` to enable Dynamic Context Pruning.
- `opentmux` integrates OpenCode with tmux workflows.
- `opencode-snip@latest` adds snippet support.
- `@franlol/opencode-md-table-formatter@latest` helps format Markdown tables.

## Local Agents

The `agents/` directory contains custom OpenCode agents.

### `agents/opencode-expert.md`

This agent is a specialized OpenCode helper for:

- setup and configuration
- agents and permissions
- providers and models
- keybinds and workflows
- OpenCode troubleshooting
- migrations from other coding assistants into OpenCode

Current agent characteristics:

- model: `lazer/gemini/gemini-3-flash-preview`
- mode: `primary`
- edit permission: `ask`

The prompt is designed to be OpenCode-first, practical, and docs-driven.

## Configuration Guidelines

When updating this setup:

- treat `opencode.json` as the source of truth for the main OpenCode behavior
- keep `tui.json` focused on interface preferences
- keep agent-specific behavior inside `agents/`
- keep reusable instruction content inside `instructions/`

