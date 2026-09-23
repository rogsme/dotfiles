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

## Main Config

The main configuration lives in `opencode.json`.

### Default Models

- Default chat model: `openai/gpt-6-astra`
- Planning agent model: `openai/gpt-6-astra`
- Build agent model: `openai/gpt-6-sol`
- Small model: `lazer/glm-5.3-flash`

Both configured agents currently use `reasoningEffort: "high"`; build also uses `variant: "high"`.

### Enabled Tools

- `webfetch`: enabled

### Global Instructions

This config loads one shared instruction file:

- `~/.config/opencode/instructions/shell-strategy/shell_strategy.md`

That instruction set is specifically aimed at non-interactive shell use. It teaches the agent to avoid commands that hang in headless environments, prefer non-interactive flags, and avoid TTY-dependent workflows.

### Custom Provider

The config defines a provider named `lazer` using `@ai-sdk/openai-compatible` with:

- provider name: `Lazer`
- base URL: `https://proxy.lazertechnologies.com/`

### Registered Models

The `lazer` provider currently exposes these model IDs:

- `claude-haiku-4.5`
- `claude-opus-5.5`
- `claude-sonnet-5`
- `deepseek-v4-flash`
- `deepseek-v4-pro`
- `deepseek-v4.1-flash`
- `gemini-3.1-pro`
- `gemini-3.8-flash`
- `gemma-4-31b`
- `glean`
- `glean-advanced`
- `glm-5.3`
- `glm-5.3-flash`
- `gpt-5.6-terra`
- `gpt-6-astra`
- `gpt-6-luna`
- `gpt-6-sol`
- `gpt-oss-120b`
- `grok-4.6`
- `kimi-k3`
- `minimax-m3`
- `qwen-3.7-plus`
- `qwen-3.8-max`

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

### `agents/claude-plan.md`

A Claude-Code-style plan mode agent: read-only planning with an approval loop that writes approved plans to `.opencode/plans/*.md` for a fresh Build session.

Current agent characteristics:

- model: `openai/gpt-6-astra`
- mode: `primary`
- edit permission: denied except for plan files

### `agents/plan-reviewer.md`

A hidden read-only subagent that reviews draft implementation plans for missing assumptions, regression risks, file omissions, and weak verification.

Current agent characteristics:

- model: `openai/gpt-6-sol`
- mode: `subagent`
- edit permission: `deny`

## Configuration Guidelines

When updating this setup:

- treat `opencode.json` as the source of truth for the main OpenCode behavior
- keep `tui.json` focused on interface preferences
- keep agent-specific behavior inside `agents/`
- keep reusable instruction content inside `instructions/`

