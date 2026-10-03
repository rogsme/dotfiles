# OpenCode configuration

V2-only configuration. `opencode.json` owns server settings; `cli.json` owns
terminal preferences; `AGENTS.md` contains global instructions.

## Local plugins

`plugins/` is auto-discovered. RTK rewrites shell commands; Worktrunk tracks
branch activity; Herdr reports pane state; Moshi handles notifications,
permission responses, and a loopback transcript relay. The Moshi TUI companion
binds sessions to terminal panes. The goal plugin is configured in
`opencode.json`; its TUI component does not need a duplicate CLI entry.

Herdr and Moshi are locally maintained V2 adaptations. Their installers can
overwrite these files. Compare installer updates before accepting them.
Herdr's server integration uses the server process's pane environment; a shared
service does not acquire each connected terminal's environment automatically.
Moshi's TUI companion handles its pane binding separately.

Moshi serves retained V2 session context, not archived history removed by
compaction. It reports approximate remaining context from the latest primary
model call's token usage and model limit, not cumulative session totals.

## Dependencies and checks

Use Bun only. `package.json` pins the plugin SDK; `bun.lock` records its
dependencies. Run `bun install --frozen-lockfile --omit=peer --ignore-scripts`
after restoring this directory; these plugins do not require UI peer packages.
Keep the SDK compatible with the installed OpenCode release when upgrading.

After changing plugins or dependencies, restart the service and check Herdr,
Worktrunk, Moshi transcripts/approvals, RTK rewriting, and goal-mode UI.
`service.json` contains service credentials and must remain private.

Ctrl+C exits the application. The default leader shortcuts open the terminal
and queued prompts; choose themes through the command palette.
