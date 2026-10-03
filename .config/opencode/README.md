# OpenCode Configuration

This is my personal configuration for [OpenCode](https://opencode.ai), the AI
coding agent I use in the terminal. It targets OpenCode V2, starts in Plan mode,
and connects to the tools I use around it: RTK, Worktrunk, Herdr, and Moshi.

Like my [tmux](../tmux/README.org) and [Herdr](../herdr/README.org)
configurations, this README explains the settings alongside examples. It is a
Markdown reference, though: nothing is tangled or generated from it. Edit the
JSON files and plugin sources directly.

## Contents

- [Installation](#installation)
- [Getting Started](#getting-started)
- [File Layout](#file-layout)
- [Models and Agents](#models-and-agents)
- [Permissions and Instructions](#permissions-and-instructions)
- [Terminal Settings](#terminal-settings)
- [Plugins](#plugins)
- [Maintenance and Troubleshooting](#maintenance-and-troubleshooting)
- [Secrets and Local State](#secrets-and-local-state)
- [Documentation](#documentation)

## Installation

### Requirements

- OpenCode V2. See the [official documentation](https://opencode.ai/v2/docs/)
  for installation instructions.
- [Bun](https://bun.sh) for the local plugin dependencies. Use Bun only in this
  directory; `bun.lock` is the dependency lockfile.
- An OpenAI connection for the default model and a Lazer connection for title
  generation and the custom model catalog.

The integrations have their own optional requirements:

| Integration | Requirement |
| --- | --- |
| RTK | `rtk` 0.23.0 or newer on the server's `PATH` |
| Worktrunk | `wt` on the server's `PATH`, inside a Git repository |
| Herdr | A Herdr pane and its exported socket/pane environment |
| Moshi | A running Moshi hook daemon; a supported terminal multiplexer for pane binding |

### Restore Dependencies

Keep this directory at `~/.config/opencode/`, or
`$XDG_CONFIG_HOME/opencode/` when using a different XDG configuration root.
After restoring the configuration, run:

```sh
cd ~/.config/opencode
bun install --frozen-lockfile --omit=peer --ignore-scripts
```

`package.json` pins `@opencode/plugin` to `2.0.22`. The local integrations do
not need the optional UI peer packages or dependency install scripts. Keep the
SDK compatible with the installed OpenCode release when upgrading.

### Connect Providers

Start `opencode`, then use `/connect` to configure OpenAI and Lazer credentials.
Use `/models` to check that the configured models are available. Credentials
are separate from the model definitions in `opencode.json`.

The goal plugin is declared as a package in `opencode.json`. OpenCode installs
missing package plugins; the local integrations under `plugins/` are discovered
automatically.

## Getting Started

1. Open a terminal in the project you want to work on and run `opencode`.
2. Describe the task. New sessions default to Plan mode.
3. Review the plan, then switch to Build when you want implementation work.
   `Shift+Tab` cycles agents; `Ctrl+X a` opens the agent picker.
4. Use `Ctrl+X m` to select a model and `Ctrl+T` to cycle its variants.
5. Interrupt a running session with `Esc`. `Ctrl+C` is the configured exit
   binding for the application.

OpenCode's terminal client connects to a shared background service. That service
owns sessions, provider connections, permissions, and server plugins. Closing
a terminal client and restarting the service are different operations.

### Quick Reference

The leader key stays at the OpenCode default, `Ctrl+X`. For `Ctrl+X m`, press
the leader, release it, then press `m`. Herdr and tmux have their own separate
`Ctrl+B` prefix.

| Shortcut | Action |
| --- | --- |
| `Ctrl+P` | Open the command palette, including settings and theme selection |
| `Ctrl+X n` | Create a session |
| `Ctrl+X l` | List sessions |
| `Ctrl+X a` | Choose an agent |
| `Shift+Tab` | Cycle agents |
| `Ctrl+X m` | Choose a model |
| `Ctrl+T` | Cycle model variants |
| `Ctrl+X t` | Toggle the terminal pane |
| `Ctrl+X q` | Manage queued prompts |
| `Ctrl+X c` | Compact the session |
| `Esc` | Interrupt the session |
| `Ctrl+C` | Exit the application |

Only the exit binding is overridden here. The other shortcuts are V2 defaults.

## File Layout

```text
~/.config/opencode/
  README.md                       Configuration reference
  AGENTS.md                       Global agent instructions
  opencode.json                   Server and project defaults
  cli.json                        Terminal client preferences
  package.json                    Pinned local plugin SDK dependency
  bun.lock                        Dependency lockfile
  .gitignore                      Dependencies, secrets, and generated files
  plugins/
    rtk.ts                        Shell command rewriting
    worktrunk.ts                  Git branch activity markers
    herdr-agent-state.js          Herdr pane state reporting
    moshi-hooks.ts                Moshi notifications, approvals, transcripts
    moshi-hooks-tui/
      tui.js                      Per-terminal Moshi session binding
  node_modules/                   Installed dependencies, ignored
  service.json                    Private service configuration, ignored
```

`opencode.json` applies globally. Project `opencode.json(c)` files can override
matching settings, and `.opencode/opencode.json(c)` files take precedence over
direct config files discovered in the same directory tree. OpenCode searches
the current directory and its ancestors through the filesystem root, so a config
above a repository can also affect it.

`cli.json` is global and terminal-only; there is no project-local CLI config.
Keep themes, keybindings, and transcript presentation there. Provider settings
and permissions belong in `opencode.json`.

## Models and Agents

### Defaults

The main model and agent overrides in [opencode.json](opencode.json) are:

```json
{
  "model": "openai/gpt-6.1-sol",
  "default_agent": "plan",
  "agents": {
    "plan": { "model": "openai/gpt-6.1-sol#max" },
    "build": { "model": "openai/gpt-6.1-sol#high" },
    "title": { "model": "lazer/glm-5.3-flash" }
  },
  "compaction": { "buffer": 10000 },
  "experimental": { "subagent_depth": 2 }
}
```

This is an excerpt, not a replacement for the complete file.

| Setting | Current behavior |
| --- | --- |
| Default model | GPT-6.1 Sol through the `openai` provider |
| Plan agent | GPT-6.1 Sol with the `max` variant |
| Build agent | GPT-6.1 Sol with the `high` variant |
| Title agent | GLM 5.3 Flash through Lazer |
| Compaction buffer | A 10,000-token reserve for automatic compaction |
| Subagent depth | Experimental nesting limit set to `2` |

The `#variant` suffix selects a model variant for an agent. The root `model`
setting uses the plain `provider/model` reference. Other built-in agents are
not overridden in this file.

### Lazer Provider

Lazer is the custom OpenAI-compatible proxy at
`https://proxy.lazertechnologies.com/`. Its current configuration uses
`aisdk:@ai-sdk/openai-compatible` and defines the model inventory explicitly
under `providers.lazer.models`.

| Family | Configured model IDs |
| --- | --- |
| DeepSeek | `deepseek-v4-pro`, `deepseek-v4-flash`, `deepseek-v4.1-flash` |
| Gemini | `gemini-3.1-pro`, `gemini-3.8-flash` |
| Gemma | `gemma-4-31b` |
| GPT OSS | `gpt-oss-120b` |
| GLM | `glm-5.3`, `glm-5.3-flash` |
| Kimi | `kimi-k3` |
| MiniMax | `minimax-m3` |
| Qwen | `qwen-3.7-plus`, `qwen-3.8-max` |
| Claude | `claude-sonnet-5`, `claude-opus-5.5`, `claude-haiku-4.5` |
| GPT | `gpt-5.6-terra`, `gpt-6-astra`, `gpt-6-sol`, `gpt-6.1-sol`, `gpt-6-luna` |
| Grok | `grok-4.6` |
| Glean | `glean`, `glean-advanced` |

Each definition records capabilities, token limits, and pricing metadata. Most
also define reasoning variants. The variants and accepted media differ by
model; check the individual entry before copying settings between models.
DeepSeek V4 Pro is explicitly configured without tool support.

Several models use `compatibility.reasoningField: "reasoning_content"`.
Gemma and GPT OSS variants use `reasoning_effort`, while most other variant
settings use `reasoningEffort`. Preserve these model-specific details when
updating the catalog. Configured prices and limits are metadata, not a guarantee
of the proxy's current billing or availability.

GPT defaults and new GPT references should use `openai`, as required by
`AGENTS.md`. Keep the existing Lazer catalog, including its GPT aliases.

## Permissions and Instructions

### Directory Permissions

The global configuration adds three rules:

```json
{
  "permissions": [
    {
      "action": "external_directory",
      "resource": "~/.claude/*",
      "effect": "allow"
    },
    {
      "action": "edit",
      "resource": "~/.claude/*",
      "effect": "ask"
    },
    {
      "action": "external_directory",
      "resource": "/home/roger/.local/share/rtk/tee/*",
      "effect": "allow"
    }
  ]
}
```

These remove the external-directory prompt for shared Claude files and RTK's
saved command output. Edits under `~/.claude/` still request approval. Directory
access and permission to perform an action are separate checks; these rules do
not grant unrestricted edits or shell access.

Rules are ordered, with the last matching rule winning. Built-in agent rules
still apply, including Plan's edit restrictions. The RTK path is specific to
this machine; update it if restoring the configuration under another username.

### Global Instructions

[AGENTS.md](AGENTS.md) contains the instructions used across projects:

- Run shell commands without a TTY and use non-interactive arguments.
- Prefer dedicated read, search, and patch tools for file operations.
- Use timeouts for commands that can wait; keep SSH host verification enabled.
- Preserve user work and obtain authorization before destructive operations.
- Keep secrets out of command arguments, logs, and responses.
- Use OpenAI for GPT references while preserving Lazer's model inventory.

These are agent instructions, separate from the enforced permission rules.

### Shared Skills

There is no local `skills/` directory or explicit `skills` array in this setup.
OpenCode also discovers skills from compatibility locations such as
`~/.claude/skills` and `~/.agents/skills`, so shared skills can be available
without being copied here. Project-local skills can live in `.opencode/skills/`.

No custom slash commands or MCP servers are declared in this global file.
Projects and plugins may add their own.

## Terminal Settings

[cli.json](cli.json) keeps the terminal preferences separate from server
configuration:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "theme": { "name": "orng" },
  "keybinds": { "app.exit": "ctrl+c" },
  "scroll": { "acceleration": false },
  "diffs": { "wrap": "word" },
  "session": {
    "sidebar": "auto",
    "scrollbar": false,
    "thinking": "hide"
  },
  "animations": true
}
```

The theme is `orng`. Scroll acceleration is disabled, and long diff lines wrap
at words. The sidebar appears when there is enough space; the transcript
scrollbar and reasoning blocks are hidden by default. Hiding reasoning changes
its presentation, not the model's reasoning effort. Animations stay enabled.

Use `Ctrl+P` and select **Open settings** to change common preferences. Valid
edits to `cli.json` reload while the TUI is running.

## Plugins

### Loading

Local plugins are discovered under [plugins/](plugins/). The goal plugin is the
one explicitly configured package:

```json
{
  "plugins": ["@prevalentware/opencode-goal-plugin"]
}
```

Server plugins that expose a TUI component are also loaded by the terminal
client. The goal UI and the discovered Moshi TUI companion do not need duplicate
entries in `cli.json`.

### RTK

[plugins/rtk.ts](plugins/rtk.ts) hooks shell execution and calls `rtk rewrite`
to replace supported commands with RTK equivalents that reduce tool output.
The rewrite rules belong to RTK itself; this plugin is only the adapter.

If `rtk` is absent, the plugin logs a warning and disables itself. If a rewrite
fails or returns no change, the original command runs unchanged.

### Worktrunk

[plugins/worktrunk.ts](plugins/worktrunk.ts) updates the activity marker shown
by `wt list` for the current Git working directory. It tracks top-level sessions
and distinguishes active execution from sessions that are idle. Child sessions
do not get separate branch markers.

It does nothing outside Git repositories. If the `wt` executable is missing,
it logs a warning and stops attempting marker updates. This integration reports
activity; it does not replace OpenCode's worktree creation strategy.

### Herdr

[plugins/herdr-agent-state.js](plugins/herdr-agent-state.js) reports the current
root session and its `working`, `blocked`, or `idle` state to Herdr over its
Unix socket. Permission requests, input forms, and failed execution can mark a
pane as blocked. Child-session requests are associated with their root session.

It activates only when all of these are present in the server environment:

```text
HERDR_ENV=1
HERDR_SOCKET_PATH
HERDR_PANE_ID
```

The shared service does not acquire each connected terminal's pane environment.
This server-side integration uses the environment of the process that started
the service, so it cannot reliably identify every TUI pane in a shared-service
setup. Moshi handles per-terminal binding separately.

### Moshi

Moshi has two parts:

- [plugins/moshi-hooks.ts](plugins/moshi-hooks.ts) sends session notifications
  and permission requests to the Moshi daemon. It applies approve/deny replies
  only while the corresponding native request is still pending. Input forms
  are announced, but must be answered in the terminal.
- [plugins/moshi-hooks-tui/tui.js](plugins/moshi-hooks-tui/tui.js) runs in each
  terminal client and binds the selected root session to that pane. It detects
  tmux, Herdr, and Zellij, in that order, and retries unacknowledged bindings.

Both honor `MOSHI_SOCKET_PATH`. On Linux the default is
`$XDG_RUNTIME_DIR/moshi-hook.sock`, falling back to `/tmp/moshi-hook.sock`.
The companion does not bind sessions when it cannot identify a supported pane.

The server plugin also opens a read-only HTTP relay on `127.0.0.1` with an
automatically assigned port. Moshi uses it for transcript retrieval and change
events. It exposes retained V2 user and assistant context for top-level sessions
in the plugin's working directory. It does not recover archived messages removed
by compaction. The relay has no authentication of its own; keep it on loopback
and do not forward or expose its port.

Remaining context is an estimate based on the latest primary model call's token
usage and configured context limit. It is not calculated from cumulative session
usage, and is cleared after compaction or a model change.

### Goal Mode

[`@prevalentware/opencode-goal-plugin`](https://www.npmjs.com/package/@prevalentware/opencode-goal-plugin)
adds explicit objectives, lifecycle controls, progress history, and autonomous
continuation. Goal tools can set token, duration, and continuation limits.

A goal must be explicitly requested. In Plan mode it is recorded as paused;
execution requires switching to Build. Completion requires an audit against
concrete evidence. Ordinary tasks do not automatically become goals.

### Local Adaptations

The Herdr and Moshi server integrations are locally maintained V2 adaptations.
Their installers can overwrite them, and the Moshi TUI file is installer-generated.
Compare installer output with these copies before accepting an update. Preserve
the V2 API usage and the separation between server state and terminal pane identity.

## Maintenance and Troubleshooting

### Applying Changes

Watched configuration and plugin sources can reload automatically. After changing
dependencies or updating integrations, restart the shared service to check a
fresh load:

```sh
opencode service restart
opencode service status
opencode api get /api/info
```

Restart the terminal client as well when checking changes to the Moshi TUI
companion. A service restart affects other clients connected to that service;
wait for active work to finish first.

### Upgrade Checks

Check the installed OpenCode release and package plugin updates with:

```sh
opencode --version
opencode plugin list
opencode plugin check
```

The goal package is not version-pinned in `opencode.json`; its installed version
can change independently of the SDK pinned in `package.json`. OpenCode's package
update commands skip local plugin files, so review those separately.

After an upgrade, check the integrations you use:

- RTK rewrites a supported shell command and still returns useful output.
- `wt list` reflects active and idle sessions in a Git project.
- Herdr reports the expected working/blocked/idle state, with the shared-service
  pane limitation in mind.
- Moshi receives notifications, shows retained transcripts, and resolves an
  approval without overriding a reply already made in the terminal.
- Switching sessions updates Moshi's pane binding.
- Goal controls and their TUI component still load.

There are no test scripts in `package.json`; these are manual smoke checks.

### Diagnosing Problems

| Symptom | Check |
| --- | --- |
| Default model or title generation fails | OpenAI/Lazer connections and the exact model IDs in `/models` |
| Local plugin fails to import | Bun dependencies and SDK compatibility with the installed V2 release |
| RTK or Worktrunk has no effect | The background service's `PATH`, not just the current terminal's |
| Herdr reports the wrong pane | Which pane environment the shared service inherited |
| Moshi notifications or bindings are missing | Daemon availability, socket path, and the TUI companion |
| Moshi transcript omits older messages | Compaction may have removed them from retained context |
| Service appears stuck | `opencode service status` and `opencode api get /api/info` |

Installed builds write logs to:

```text
~/.local/share/opencode/log/opencode.log
```

Look for `role=server` when diagnosing providers, permissions, and server plugins,
or `role=cli` for terminal startup. Running `opencode --standalone` uses a private
server and can help isolate shared-service problems. It also gives server plugins
the launching terminal's environment.

Do not delete the database or service files to fix startup problems. Use service
commands, back up persistent data before external inspection, and redact secrets
and conversation contents before sharing logs.

## Secrets and Local State

`service.json` contains private service credentials and is ignored by Git. Never
copy its contents into this README, a config example, or an issue report.

[.gitignore](.gitignore) also excludes `node_modules/`, `package-lock.json`,
`server.env`, generated `logs/`, `scheduler/`, `cache/`, and Python bytecode.
Keep `package.json` and `bun.lock` together when backing up the configuration.

On this machine, shell-exported secrets are documented in the
[Fish configuration](../fish/README.org) and kept in its ignored
`conf.d/secrets.fish`. If a provider needs an environment variable, make sure it
is available to the background service; a newly opened terminal does not update
an already-running service's environment.

Session data lives outside this directory. The default database is
`~/.local/share/opencode/opencode.db`, and the service registration is
`~/.local/state/opencode/service.json`. The latter is distinct from the private
configuration file here. Restoring these configuration files alone does not
restore conversation history or provider credentials.

## Documentation

- [V2 configuration](https://opencode.ai/v2/docs/config)
- [Providers and model definitions](https://opencode.ai/v2/docs/providers)
- [Permissions](https://opencode.ai/v2/docs/permissions)
- [Skills](https://opencode.ai/v2/docs/skills)
- [Terminal settings](https://opencode.ai/v2/docs/cli/config)
- [Default keybindings](https://opencode.ai/v2/docs/cli/keybinds)
- [Plugin configuration](https://opencode.ai/v2/docs/plugins)
- [Plugin development](https://opencode.ai/v2/docs/build/plugins)
- [Terminal plugin loading](https://opencode.ai/v2/docs/cli/plugins)
- [Troubleshooting](https://opencode.ai/v2/docs/troubleshooting)
