# Lavish execution and review protocol

Use Node.js 22+, npm's `npx` command and the versions in `scripts/common.mjs`. The wrapper runs Lavish through pinned `npx` execution. No local or global Lavish installation, upstream skill, hook, agent plugin or MCP server is needed.

## Execution and renderer prerequisites

The wrapper uses this invocation, with its local-only environment applied:

```sh
npx --yes --ignore-scripts --package=lavish-axi@0.1.89 -- lavish-axi --version
```

`npx` resolves the pinned package through npm's cache and may download it on first use. It adds no dependency or lockfile to the project or renderer runtime. Offline use needs the package already cached; a cache/network failure uses the terminal fallback. Keep all npx flags before the binary, so they apply to npm rather than Lavish. Never run `npm install` for Lavish or fall back to a global executable.

Marked and Mermaid are separate renderer dependencies. Choose an absolute private renderer runtime path outside every checkout and a private state directory. An XDG cache directory is suitable for the renderer.

The artifact root defaults to `/tmp/lavish`, created with mode 0700. The renderer refuses a root that another user owns or can write, which matters in a shared `/tmp`. `/tmp` is cleared at reboot: a session stored there cannot resume afterward, so render a new one. OpenCode asks once for `external_directory` access to the root. A planning agent with a narrower allowed path passes `--artifacts` with that path.

After explicit installation approval:

```sh
npm install --prefix "<runtime>" --ignore-scripts --save-exact --no-audit --no-fund marked@18.1.0 mermaid@11.12.1
```

Keep the resulting renderer lockfile there. Renderer preparation stays a separate user-approved action; presenting and checking never install renderer dependencies. An older runtime that also contains Lavish needs no destructive cleanup: the wrapper ignores that copy and invokes `npx`. Package upgrades are explicit and require repeating the tests; update the checked versions and recipes together.

Choose a stable unprivileged local port, initially `4388` when free. Do not take over another service. Sessions can share their private state/port. Record the renderer runtime, artifact root, state directory and port under `## Plan presentation` when using the lifecycle.

Check without opening a browser:

```sh
node "<skill-dir>/scripts/lavish.mjs" check --runtime "<runtime>" --state-dir "<state-dir>" --port 4388
```

The check verifies Node, renderer versions, the pinned Lavish version through `npx`, private permissions on existing server state, and any already-running server. It creates no review, starts no server and performs no local installation. Its version probe may populate npm's cache. A new state directory is created with mode 0700 when a review opens. Existing permissions stay untouched: choose a private path when the check rejects them. Browser launch and diagram rendering require the browser pass in `tests/README.md`.

## Render

The input is the complete settled report, including all required investigation details, every ticket's criteria, diagrams already considered during review, and the review table or warning.

```sh
node "<skill-dir>/scripts/render_plan.mjs" --source "<report.md>" --repository "<main-checkout>" --worktree "<ticket-checkout>" --ticket "ACM-123" --runtime "<runtime>" --state-dir "<state-dir>" --port 4388
```

Add `--artifacts "<artifact-root>"` when the root is not the default. Repeat `--rider "ACM-124"` for every rider. For a standalone document, use a short name instead of a ticket and the same root for repository/worktree outside Git. Use `--title` only for a display title, not a second summary.

The renderer returns JSON with `session`, `html`, `source`, `revision` and `sourceDigest`. Revisions of this review pass `--session "<returned-directory>"` with the same identity and runtime settings. New source content creates an immutable Markdown snapshot; the current page stays at `plan.html`. Unchanged content keeps its revision. Never replace an unrelated file or remove a render lock: an interrupted render needs inspection, not an assumed successful retry.

The renderer loads Marked from the prepared runtime and only emits its own safe HTML elements. Images are references, not loads. Mermaid's self-contained classic browser bundle and license are copied beside the page, so no CDN is needed. Use classic scripts: Lavish's iframe has an opaque origin, and its local asset routes do not supply the CORS headers that ES modules need. Keep the sandbox intact. Diagrams sit in a `.diagram` container rather than `.mermaid`: Lavish replaces a Mermaid diagram inside `.mermaid` with an Excalidraw whiteboard, whose boxes cannot take notes, while it anchors notes to the boxes of any other rendered Mermaid SVG. A plan with `## Overview` also gets `assets/tabs.js`, which switches the Overview and Full plan tabs; diagrams in the hidden tab render when it is shown.

The page is light only. Lavish's own frame around it stays dark in this version and has no setting. Raw source, review history and feedback may contain private code: treat the whole artifact directory as sensitive and retain it until the user requests cleanup.

The page adds a local-only content policy. Mermaid sources that contain network references, image/icon resources or configuration directives stay escaped as source with a warning, rather than entering the renderer. This conservative boundary can also flag a URL used only as a label; preserve it as text for review.

## Open, poll, reply, end

```sh
node "<skill-dir>/scripts/lavish.mjs" open --session "<session>"
node "<skill-dir>/scripts/lavish.mjs" poll --session "<session>"
node "<skill-dir>/scripts/lavish.mjs" reply --session "<session>" --reply-file "<session>/reply.md"
node "<skill-dir>/scripts/lavish.mjs" end --session "<session>"
```

For an automated test or a user who does not want an automatic browser launch, `open` accepts `--no-open`. A user-requested reopening accepts `--reopen`. No action installs hooks or calls the upstream `setup` command.

Native output may suggest a bare Lavish command or a cached executable path. Use the wrapper above instead, so every retry keeps pinned npx execution and the local-only environment.

Each action returns a receipt naming a raw native-output file. Read that complete file. Lavish currently writes TOON, not a supported `--json` stream; the wrapper deliberately stores it without parsing or truncating it. Its `complete` field describes the command, not the user's decision. `approval` is always false. When collection spans a render, `revisionChangedDuringCommand` is true and the caller must reconcile the feedback against the named snapshots. These fields identify polling context, not the target of every delayed native comment: `targetRevisionVerified` stays false. Compare anchors and snapshots, and ask when the target revision remains unclear.

Lavish's `queuePrompt()` preserves `prompt`, `tag` and supported target fields. Custom `options.data` becomes JSON appended to the prompt string under `Context data:`; it is not a separate structured decision field. Ordinary annotations are sufficient here. Browser controls do not implement the lifecycle's approval gate.

`poll` waits indefinitely. Use the agent's supported foreground or background-completion mechanism, without adding the upstream test-only timeout flag. If a background task cannot resume the agent, give the URL without claiming monitoring and retrieve feedback when the human returns. On POSIX, the wrapper forwards interruption to the whole npx process group so a child poll cannot consume feedback after its wrapper exits. It preserves complete or partial output. Never interpret a timeout or nonzero exit as consent.

## Local-only boundary

Every action forces `LAVISH_AXI_TELEMETRY=0`, `LAVISH_AXI_HOST=127.0.0.1`, `LAVISH_AXI_LINK_HOST=127.0.0.1`, the private state/port, and a loopback Host allowlist. These override inherited settings. The wrapper checks the existing server's application, exact version, state directory and listeners before invoking the CLI. It rejects unknown, non-loopback or other-owner services rather than stopping or upgrading them.

Lavish otherwise automatically adds a Tailscale listener when available. Setting an environment variable does not remove a listener from an existing server. Use another configured private state/port when reuse is unsafe. The server has no authentication; never expose it to a network.

The wrapper offers no `share`, `setup`, `update`, or `stop`. Lavish still displays its own Publish control; do not use it for private plans. Hosted sharing uploads to a third party and is public by default. This wrapper does not remove that upstream UI or provide network isolation. End only a review owned by this call. Do not stop a shared server or delete saved reviews without authorization.

## Sources

Checked against Lavish `0.1.89` on 2026-10-17:

- [CLI, feedback, privacy and sharing](https://github.com/kunchenguid/lavish-axi/blob/lavish-axi-v0.1.89/README.md)
- [Feedback data encoding](https://github.com/kunchenguid/lavish-axi/blob/lavish-axi-v0.1.89/src/artifact-sdk.js)
- [Local server invariants](https://github.com/kunchenguid/lavish-axi/blob/lavish-axi-v0.1.89/docs/invariants.md)
- [Marked token and renderer documentation](https://marked.js.org/using_pro)
- [npx package selection and npm-cache execution](https://docs.npmjs.com/cli/v11/commands/npx)
