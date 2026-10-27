# Chat-paste viewer reference

The viewer is plain JavaScript on Node.js 22+ built-ins: no npm install, no package, and no network. `scripts/render_message.mjs` formats a message into a page, `scripts/server.mjs` serves every open message, and `scripts/viewer.mjs` is the agent's interface to both. Every action prints one JSON result. It is a trimmed copy of present-plan's plan viewer: one view, word and range comments, and Done in place of Approve.

## Settings

| Setting | Default | Meaning |
|---|---|---|
| Artifact root | `/tmp/chat-paste` | Sessions and the viewer's own files. Owned by this user, writable by no one else. `/tmp` is cleared at reboot. |
| Port | `4410` | The first port `open` tries. When a viewer it cannot reuse or replace holds it, or another service does (present-plan's viewer included), `open` takes the next usable one of the 20 ports from it up. |
| Listen | `all` | `all` binds `0.0.0.0`, so other machines reach it, including over Tailscale. `loopback` binds `127.0.0.1` only. An IP address binds only that address. |

Pass `--artifacts`, `--port` and `--listen` to override them. `node viewer.mjs check` reports the Node version, the artifact root, `openPort` and what holds each skipped port, without opening anything.

## Render

```sh
node "<skill-dir>/scripts/render_message.mjs" --source "<message.md>" --name "eod-2026-10-27" [--destination slack|teams|both] [--title "<display title>"]
```

The formatter (`assets/formatter.js` with the vendored Marked) runs in Node. The page holds the formatted HTML and, in a JSON data block, the plain text, HTML and Slack Delta the copy buttons write; the browser formats nothing. A `slack` or `teams` destination shows that app's copy button only; plain text is always there. Revisions of the same message pass `--session "<returned-directory>"` with the same `--name`. New content creates an immutable `revision-NNNN.md` snapshot; unchanged content keeps its revision. The title and destination carry over unless given again.

## Open, poll, reply, end

```sh
node "<skill-dir>/scripts/viewer.mjs" open --session "<session>" [--no-open] [--reopen]
node "<skill-dir>/scripts/viewer.mjs" poll --session "<session>"
node "<skill-dir>/scripts/viewer.mjs" reply --session "<session>" --reply-file "<session>/reply.json"
node "<skill-dir>/scripts/viewer.mjs" end --session "<session>"
```

`open` starts the shared server or reuses a matching one, registers the message, launches the browser on the first URL unless `--no-open`, and prints the URLs, the `port` it chose and any `skippedPorts`. A done or ended message reopens only with `--reopen`.

`poll` waits, without a time limit, for the next event the page sent, prints it, then moves it from `events/` to `delivered/`. An interruption between the two delivers the same event again; it never loses one.

A `feedback` event holds the batch's comments. Each target's `kind` is `word`, `text` (a selected range) or `general` (the whole message, with no quote):

```json
{
  "seq": 1,
  "type": "feedback",
  "revision": 1,
  "comments": [
    { "id": "c1", "text": "Say which spreadsheets.", "revision": 1, "target": { "kind": "word", "quote": "spreadsheets", "prefix": "Readers can now import ", "suffix": " without losing column names." } },
    { "id": "c2", "text": "Add tomorrow's plan.", "revision": 1, "target": { "kind": "general", "quote": "", "prefix": "", "suffix": "" } }
  ]
}
```

The reply file is JSON, and `batch` is the event's `seq`:

```json
{
  "batch": 1,
  "message": "Updated the next steps.",
  "answers": [
    { "id": "c1", "outcome": "kept", "text": "The ticket names no file." },
    { "id": "c2", "outcome": "changed", "text": "Added a Tomorrow line." }
  ]
}
```

`reply` refuses a batch not yet polled, a missing or unknown comment id, an outcome other than `changed` or `kept`, an empty answer, and a second reply to the same batch.

A `done` event carries the revision and digest the user finished on; `"done": true` means they match the current source. An `ended` event's `reason` is `agent` after `end`, or `abandoned` when no page had the message open for 30 minutes (`--abandon-minutes` on the server). `end` marks the message ended and removes it from the registry, so its links stop working.

## Session files

A session directory holds `session.json` (name, title, destination, revision, digests, and the message's id and token), `revision-NNNN.md` and `.json` snapshots, `message.html`, `state.json` (`open`, `done` or `ended`), and the channel: `events/`, `delivered/` and `replies/`. The viewer keeps `viewer/sessions/` (the registry), `viewer/preferences.json` (the theme), `viewer/server-<port>.json` (each running server's stop secret) and `viewer/server.log` under the artifact root. Treat the artifact root as private: messages, comments and tokens stay there until the user asks for cleanup.

## The server

One server serves every message registered under its artifact root, each at `/r/<id>/`. The first request carries the token in the link; the server answers with an `HttpOnly`, `SameSite=Strict` cookie scoped to that message and drops the token from the address bar. Every write needs that cookie and an `X-Chat-Paste` header, which other sites cannot send without a preflight the server never answers. Done checks the current revision and digest, and refuses while a batch waits for its reply. The copy buttons keep working after Done.

The page loads scripts and styles from the viewer only. It follows the saved theme, which the server writes onto `<html>`; without one it follows the system. A server-sent event stream tells the page when the revision, its state or the replies change: a new revision reloads the page, and drafts survive the reload. A page that reloads onto a newer revision while the tab has no focus puts `(new)` before its title until it gets focus, and the bell (shown on the Local link only) asks for notifications. The page marks what changed since the last revision this browser showed, with the `Changes (N)` button to hide or show the marks; it keeps the blocks of the last two revisions of the 20 most recent messages in `localStorage`.

The server has no other authentication. With `Listen: all`, anyone on the network who has a message's link can read it and comment, and the traffic is plain HTTP. The server stops itself a few minutes after no message is open, and `/health` reports its app, version, artifact root, listen setting and open messages.
