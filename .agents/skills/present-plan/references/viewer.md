# Plan viewer reference

The viewer is plain JavaScript on Node.js 22+ built-ins: no npm install, no package and no runtime directory. `scripts/render_plan.mjs` builds the page, `scripts/server.mjs` serves every open review, and `scripts/viewer.mjs` is the agent's interface to both. Every action prints one JSON result.

## CDN files

`PINS` in `scripts/common.mjs` names every file loaded from `https://cdn.jsdelivr.net/npm/`, each at an exact version with its SHA-384 hash:

- Marked, which the renderer runs in Node. It downloads the pinned `marked.esm.js` once, checks the hash, and caches it at `<artifact root>/cache/`. A cached file that fails the hash is refused; delete it so the next render fetches it again.
- Mermaid's self-contained classic build, which the page loads with an `integrity` attribute. The module build splits into chunks that an integrity hash cannot cover, so the page uses this one.
- The Fontsource stylesheets for Fira Sans and Roboto Mono. Without the CDN, the page falls back to system fonts.

The page's content policy allows scripts, styles and fonts from `cdn.jsdelivr.net` only, and network requests only to the viewer itself. Upgrading a pin means changing its file and hash together, then running the tests.

## Settings

| Setting | Default | Meaning |
|---|---|---|
| Artifact root | `/tmp/present-plan` | Sessions, the Marked cache and the viewer's own files. Outside every checkout, owned by this user, writable by no one else. `/tmp` is cleared at reboot, and a session stored there cannot resume afterward. |
| Port | `4388` | The one port every review shares. |
| Listen | `all` | `all` binds `0.0.0.0`, so other machines reach it, including over Tailscale. `loopback` binds `127.0.0.1` only. An IP address binds only that address. |

Check without opening anything:

```sh
node "<skill-dir>/scripts/viewer.mjs" check --artifacts "<artifact-root>" --port 4388 --listen all
```

It checks Node, the artifact root's ownership, that Marked is cached or reachable, and what holds the port. `"server"` reports `not running`, `running`, or an older viewer that `open` will replace once its open reviews end. A port held by another service, or by a viewer serving another artifact root, fails the check.

## Render

```sh
node "<skill-dir>/scripts/render_plan.mjs" --source "<report.md>" --repository "<main-checkout>" --worktree "<ticket-checkout>" --ticket "ACM-123" --artifacts "<artifact-root>"
```

Repeat `--rider "ACM-124"` for every rider. For a standalone document, pass `--standalone`, a short name as `--ticket`, and the same directory as repository and worktree outside Git. Use `--title` only for a display title. Revisions of this review pass `--session "<returned-directory>"` with the same identity. New source content creates an immutable Markdown snapshot; unchanged content keeps its revision. Never replace an unrelated file or remove a render lock: an interrupted render needs inspection, not an assumed successful retry.

The renderer emits only its own safe HTML elements. Images are references, not loads. Diagrams sit in a `figure[data-diagram]`; Mermaid draws them in the browser with `securityLevel: "strict"` and SVG labels, so each box is an SVG node the human can comment on.

## Open, poll, reply, end

```sh
node "<skill-dir>/scripts/viewer.mjs" open --session "<session>" --port 4388 --listen all
node "<skill-dir>/scripts/viewer.mjs" poll --session "<session>"
node "<skill-dir>/scripts/viewer.mjs" reply --session "<session>" --reply-file "<session>/reply.json"
node "<skill-dir>/scripts/viewer.mjs" end --session "<session>"
```

`open` starts the shared server when none runs on the port, reuses one that matches this viewer's version, artifact root and listen setting, and replaces an older one only when it has no open review. It never stops a server with open reviews or another service; it fails and names it. It registers the session, launches the browser on the first URL unless `--no-open`, and prints the URLs. An ended, approved or done review reopens only with `--reopen`.

`poll` waits, without a time limit, for the next event the page sent, prints it, then moves it from `events/` to `delivered/`. An interruption between the two delivers the same event again; it never loses one. Use the agent's foreground or background-completion mechanism.

The reply file is JSON:

```json
{
  "batch": 1,
  "message": "Updated the overview and the cursor step.",
  "answers": [
    { "id": "c1", "outcome": "changed", "text": "The overview now names the page size." },
    { "id": "c2", "outcome": "kept", "text": "Step 3 already covers the empty page." }
  ]
}
```

`batch` is the event's `seq`. `reply` refuses a batch not yet polled, a missing or unknown comment id, an outcome other than `changed` or `kept`, an empty answer, and a second reply to the same batch.

`end` marks the review ended and removes it from the registry, so its links stop working. It touches no other review.

## Session files

A session directory holds `session.json` (identity, revision, digest, and the review's id and token), `revision-NNNN.md` and `.json` snapshots, `plan.html`, `state.json` (`open`, `approved`, `done` or `ended`), and the channel: `events/`, `delivered/` and `replies/`. The viewer keeps `viewer/sessions/` (the registry), `viewer/preferences.json` (the theme) and `viewer/server.log` under the artifact root. Treat the whole artifact root as sensitive: plans, comments and tokens are private, and they stay until the user asks for cleanup.

## The server

One server serves every review registered under its artifact root, each at `/r/<id>/`. The first request carries the token in the link; the server answers with an `HttpOnly`, `SameSite=Strict` cookie scoped to that review and drops the token from the address bar. Every write needs that cookie and an `X-Plan-Review` header, which other sites cannot send without a preflight the server never answers. Approve and Done check the current revision and digest, and refuse while a batch waits for its reply.

The page follows the saved theme, which the server writes onto `<html>` before the first paint; without one it follows the system. A server-sent event stream tells the page when the revision, its state or the replies change: a new revision reloads the page, and drafts survive the reload.

The server has no other authentication. With `Listen: all`, anyone on the network who has a review's link can comment on it and approve it, and the traffic is plain HTTP. The server stops itself a few minutes after no review is open, and `/health` reports its app, version, artifact root, listen setting and open reviews.
