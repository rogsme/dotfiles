import { spawn } from "node:child_process";
import { watch } from "node:fs";
import { lstat, open, readFile, rename, unlink } from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { APP, DEFAULT_LISTEN, DEFAULT_PORT, PINS, atomicWrite, checkNode, checkOwnedDirectory, defaultArtifactRoot, externalDirectory, inside, integrityOf, invokedDirectly, loadSession, makePrivateDirectory, readJSON, registryDirectory, safePath, serverFile, viewerDirectory, viewerVersion } from "./common.mjs";
import { fetchPinned } from "./render_plan.mjs";
import { bindAddress, listEvents, pendingBatches, readState, writeState } from "./server.mjs";

const serverScript = fileURLToPath(new URL("server.mjs", import.meta.url));

// How many ports, from the configured one up, open tries before it gives up.
export const PORT_TRIES = 20;

// A port that something open cannot reuse or replace holds; open moves on to the next one.
const taken = (message) => Object.assign(new Error(message), { portTaken: true });
const pause = () => new Promise((resolve) => setTimeout(resolve, 100));

function request(host, port, method, route, body) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const call = http.request({ host, port, method, path: route, timeout: 1500, headers: payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {} }, (response) => {
      let text = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { text += chunk; if (text.length > 65_536) call.destroy(new Error("Unexpected viewer response.")); });
      response.on("end", () => {
        try { resolve({ status: response.statusCode, body: JSON.parse(text) }); }
        catch { reject(taken(`Port ${port} belongs to another service; it was left running.`)); }
      });
    });
    call.on("timeout", () => call.destroy(taken(`Cannot tell what holds port ${port}; it was left untouched.`)));
    call.on("error", (error) => error.code === "ECONNREFUSED" ? resolve(null) : reject(error));
    if (payload) call.write(payload);
    call.end();
  });
}

// A specific listen address is the only one the server answers on; all and loopback answer on 127.0.0.1.
const probeHost = (listen) => listen === "all" || listen === "loopback" ? "127.0.0.1" : listen;

export async function health({ port, listen }) {
  const result = await request(probeHost(listen), port, "GET", "/health");
  if (result === null) return null;
  if (result.status !== 200 || result.body?.app !== APP) throw taken(`Port ${port} belongs to another service; it was left running.`);
  return result.body;
}

function settings(options) {
  const port = Number(options.port ?? DEFAULT_PORT);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Use an unprivileged port between 1024 and 65535.");
  const listen = options.listen ?? DEFAULT_LISTEN;
  bindAddress(listen);
  return { port, listen };
}

// A process can hold the port without answering HTTP on the probe address, so a free port is one this viewer can bind.
function bindable(port, listen) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once("error", () => resolve(false));
    probe.listen(port, bindAddress(listen), () => probe.close(() => resolve(true)));
  });
}

// Viewers older than per-port server files kept one server.json per artifact root.
async function serverInfo(root, port) {
  for (const file of [serverFile(root, port), path.join(viewerDirectory(root), "server.json")]) {
    const info = await readJSON(file).catch(() => null);
    if (info?.secret && info.port === port) return info;
  }
  return null;
}

// What open would do on this port: start a viewer, reuse the matching one, or replace an older one with no open review.
async function inspectPort({ root, port, listen, version }) {
  const running = await health({ port, listen });
  if (!running) {
    if (!(await bindable(port, listen))) throw taken(`Port ${port} is held by a process that does not answer as a viewer; it was left running.`);
    return { plan: "start" };
  }
  if (running.version === version && running.root === root && running.listen === listen) return { plan: "reuse" };
  const difference = running.root !== root ? `serves the artifact root ${running.root}` : running.listen !== listen ? `listens on ${running.listen}` : `runs viewer version ${running.version}`;
  if (running.openSessions > 0) throw taken(`The viewer on port ${port} ${difference} and still has ${running.openSessions} open review(s); it was left running.`);
  const info = running.root === root ? await serverInfo(root, port) : null;
  if (!info) throw taken(`The viewer on port ${port} ${difference}, and it can only be stopped from its own artifact root; it was left running.`);
  return { plan: "replace", secret: info.secret, difference };
}

// Starts the viewer on this one port, reuses a matching one, and replaces an older one only when it has no open review.
export async function ensureServer({ root, port, listen }) {
  const version = await viewerVersion();
  const found = await inspectPort({ root, port, listen, version });
  if (found.plan === "reuse") return { started: false, version };
  if (found.plan === "replace") {
    if ((await request(probeHost(listen), port, "POST", "/shutdown", { secret: found.secret }))?.status !== 200) throw taken(`The viewer on port ${port} ${found.difference} and refused to stop; it was left running.`);
    let running = true;
    for (let i = 0; i < 50 && running; i++) { await pause(); running = await health({ port, listen }).catch(() => null); }
    if (running) throw taken(`The older viewer on port ${port} did not stop; it was left running.`);
  }
  await makePrivateDirectory(viewerDirectory(root));
  const log = await open(path.join(viewerDirectory(root), "server.log"), "a", 0o600);
  const child = spawn(process.execPath, [serverScript, "--root", root, "--port", String(port), "--listen", listen], { detached: true, stdio: ["ignore", log.fd, log.fd] });
  child.unref();
  await log.close();
  for (let i = 0; i < 50; i++) {
    await pause();
    const started = await health({ port, listen }).catch(() => null);
    if (started?.version === version && started.root === root && started.listen === listen) return { started: true, version };
    if (child.exitCode !== null) break;
  }
  // Another open can win a free port first: reuse its viewer when it matches, and leave the port to it when it does not.
  const after = await inspectPort({ root, port, listen, version });
  if (after.plan === "reuse") return { started: false, version };
  if (after.plan === "replace") throw taken(`Another viewer took port ${port} while this one started; it was left running.`);
  throw new Error(`The viewer did not start on port ${port}; see ${path.join(viewerDirectory(root), "server.log")}.`);
}

// Tries the configured port first, then the ports above it, and skips each one a viewer or service holds that open cannot use.
async function eachPort({ port }, attempt) {
  const skipped = [];
  for (let next = port; next < port + PORT_TRIES && next <= 65535; next++) {
    try { return { ...(await attempt(next)), port: next, skippedPorts: skipped }; }
    catch (error) { if (!error.portTaken) throw error; skipped.push({ port: next, reason: error.message }); }
  }
  throw new Error(`No usable port from ${port} to ${port + skipped.length - 1}. Port ${port}: ${skipped[0].reason}`);
}

export const startViewer = ({ root, port, listen }) => eachPort({ port }, (next) => ensureServer({ root, port: next, listen }));

// Tailscale addresses come first: that is how another of the user's machines reaches this one.
export function reviewURLs({ id, token }, { port, listen }) {
  const route = `/r/${id}/?t=${token}`;
  const urls = [];
  if (listen === "all" || listen === "loopback") urls.push({ label: "Local", url: `http://127.0.0.1:${port}${route}` });
  // Container and VM bridges are not how another machine reaches this one.
  const bridge = /^(docker|br-|veth|virbr|vboxnet|vmnet|lxc|lxd|cni|flannel|podman|kube)/;
  const addresses = listen === "all"
    ? Object.entries(os.networkInterfaces()).filter(([name]) => !bridge.test(name)).flatMap(([, items]) => items)
      .filter((item) => item.family === "IPv4" && !item.internal).map((item) => item.address)
    : listen === "loopback" ? [] : [listen];
  const tailscale = (address) => { const [a, b] = address.split(".").map(Number); return a === 100 && b >= 64 && b <= 127; };
  for (const address of addresses.sort((a, b) => Number(tailscale(b)) - Number(tailscale(a)))) {
    const host = address.includes(":") ? `[${address}]` : address;
    urls.push({ label: tailscale(address) ? "Tailscale" : "Network", url: `http://${host}:${port}${route}` });
  }
  return urls;
}

function launch(url) {
  const [command, args] = process.platform === "darwin" ? ["open", [url]] : process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : ["xdg-open", [url]];
  return new Promise((resolve) => {
    const child = spawn(command, args, { detached: true, stdio: "ignore" });
    child.once("error", (error) => resolve({ opened: false, reason: `${command}: ${error.code || error.message}` }));
    child.once("spawn", () => { child.unref(); resolve({ opened: true }); });
  });
}

export async function checkViewer(options = {}) {
  checkNode();
  const root = await externalDirectory(options.artifactRoot || defaultArtifactRoot(), []);
  const { port, listen } = settings(options);
  const info = await lstat(root).catch((error) => { if (error.code === "ENOENT") return null; throw error; });
  if (info) await checkOwnedDirectory(root);
  const cached = path.join(root, "cache", PINS.marked.file.replace(/[/@]/g, "_"));
  let marked = "missing";
  const code = await readFile(cached).catch(() => null);
  if (code && integrityOf(code) === PINS.marked.integrity) marked = "cached";
  else { await fetchPinned(PINS.marked); marked = "reachable"; }
  const version = await viewerVersion();
  const found = await eachPort({ port }, (next) => inspectPort({ root, port: next, listen, version }));
  const server = { start: "not running", reuse: "running", replace: "running an older viewer or listen setting; open replaces it" }[found.plan];
  return { status: "ready", node: process.versions.node, artifactRoot: root, port, listen, openPort: found.port, skippedPorts: found.skippedPorts, marked, server, version, browserOpened: false };
}

// The server finds a review through its registry entry and serves it while its state is open.
export async function registerSession(manifest, { port, listen }) {
  await makePrivateDirectory(registryDirectory(manifest.artifactRoot));
  await atomicWrite(path.join(registryDirectory(manifest.artifactRoot), `${manifest.id}.json`), JSON.stringify({ session: manifest.session }) + "\n");
  await writeState(manifest.session, { status: "open", port, listen, openedAt: new Date().toISOString() });
}

export async function openReview(options) {
  const manifest = await loadSession(options.session);
  const { port, listen } = settings(options);
  const state = await readState(manifest.session);
  if (["ended", "approved", "done"].includes(state.status) && !options.reopen) throw new Error(`This review is ${state.status}. Pass --reopen only when the user asks to reopen it.`);
  const server = await startViewer({ root: manifest.artifactRoot, port, listen });
  await registerSession(manifest, { port: server.port, listen });
  const urls = reviewURLs(manifest, { port: server.port, listen });
  const browser = options.noOpen ? { opened: false, reason: "--no-open" } : await launch(urls[0].url);
  return { action: "open", session: manifest.session, urls, browserOpened: browser.opened, browserReason: browser.reason || null, server: server.started ? "started" : "reused", port: server.port, skippedPorts: server.skippedPorts, revision: manifest.revision, sourceDigest: manifest.sourceDigest };
}

// Waits for the next thing the browser sent, prints it, then marks it delivered.
// Printing comes first: an interruption in between delivers the same event again, never loses it.
export async function pollReview(options, { signal } = {}) {
  const manifest = await loadSession(options.session);
  const events = path.join(manifest.session, "events");
  await makePrivateDirectory(events);
  await makePrivateDirectory(path.join(manifest.session, "delivered"));
  let wake = () => {};
  const watcher = watch(events, () => wake());
  try {
    for (;;) {
      if (signal?.aborted) throw new Error("Poll interrupted before any event arrived.");
      const next = (await listEvents(manifest.session)).find((event) => !event.delivered);
      if (next) {
        const event = await readJSON(next.file);
        const current = await loadSession(manifest.session);
        const stale = event.type === "feedback" ? event.comments.filter((comment) => comment.revision !== current.revision).length : 0;
        const result = {
          action: "poll", session: manifest.session, event,
          currentRevision: current.revision, currentSourceDigest: current.sourceDigest, staleComments: stale,
          approval: event.type === "approval" && event.revision === current.revision && event.sourceDigest === current.sourceDigest,
          done: event.type === "done",
        };
        options.write?.(result);
        await rename(next.file, path.join(manifest.session, "delivered", path.basename(next.file)));
        return result;
      }
      if ((await readState(manifest.session)).status === "ended") return { action: "poll", session: manifest.session, event: { type: "ended" }, approval: false, done: false };
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 1000);
        wake = () => { clearTimeout(timer); resolve(); };
        signal?.addEventListener("abort", wake, { once: true });
      });
    }
  } finally { watcher.close(); }
}

export async function replyReview(options) {
  const manifest = await loadSession(options.session);
  const file = await safePath(options.replyFile);
  if (!inside(manifest.session, file)) throw new Error("Keep the reply file in this review's session directory.");
  const reply = await readJSON(file);
  const batch = (await listEvents(manifest.session)).find((event) => event.type === "feedback" && event.seq === reply.batch);
  if (!batch) throw new Error(`No feedback batch ${reply.batch} exists in this review.`);
  if (!batch.delivered) throw new Error(`Batch ${reply.batch} has not been polled yet.`);
  const comments = (await readJSON(batch.file)).comments;
  const answers = Array.isArray(reply.answers) ? reply.answers : [];
  for (const answer of answers) {
    if (!comments.some((comment) => comment.id === answer.id)) throw new Error(`Batch ${reply.batch} has no comment ${answer.id}.`);
    if (answer.outcome !== "changed" && answer.outcome !== "kept") throw new Error("Each answer's outcome is changed or kept.");
    if (typeof answer.text !== "string" || !answer.text.trim()) throw new Error("Each answer says what changed, or why the plan stays as it is.");
  }
  const missing = comments.filter((comment) => !answers.some((answer) => answer.id === comment.id));
  if (missing.length) throw new Error(`Answer every comment in batch ${reply.batch}; missing: ${missing.map((comment) => comment.id).join(", ")}.`);
  await makePrivateDirectory(path.join(manifest.session, "replies"));
  const target = path.join(manifest.session, "replies", `${String(reply.batch).padStart(4, "0")}.json`);
  const clean = { batch: reply.batch, at: new Date().toISOString(), revision: manifest.revision, message: typeof reply.message === "string" ? reply.message.slice(0, 4000) : "", answers: answers.map(({ id, outcome, text }) => ({ id, outcome, text: text.slice(0, 4000) })) };
  await atomicWrite(target, JSON.stringify(clean, null, 2) + "\n", { exclusive: true }).catch((error) => { if (error.code === "EEXIST") throw new Error(`Batch ${reply.batch} already has a reply.`); throw error; });
  return { action: "reply", session: manifest.session, batch: reply.batch, answered: answers.length, pending: await pendingBatches(manifest.session) };
}

export async function endReview(options) {
  const manifest = await loadSession(options.session, { verifyContent: false });
  const state = await writeState(manifest.session, { status: "ended", endedAt: new Date().toISOString() });
  await unlink(path.join(registryDirectory(manifest.artifactRoot), `${manifest.id}.json`)).catch((error) => { if (error.code !== "ENOENT") throw error; });
  return { action: "end", session: manifest.session, status: state.status };
}

function argumentsFor(argv) {
  const options = {};
  const fields = { "--session": "session", "--artifacts": "artifactRoot", "--port": "port", "--listen": "listen", "--reply-file": "replyFile" };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--no-open") options.noOpen = true;
    else if (argv[i] === "--reopen") options.reopen = true;
    else if (fields[argv[i]] && argv[i + 1]) options[fields[argv[i]]] = argv[++i];
    else throw new Error(`Unknown or incomplete argument: ${argv[i]}`);
  }
  return options;
}

if (invokedDirectly(import.meta.url)) {
  if (process.argv.includes("--help")) {
    console.log([
      "node viewer.mjs check [--artifacts <root>] [--port <port>] [--listen <all|loopback|address>]",
      "node viewer.mjs open --session <owned-review-directory> [--port <port>] [--listen <all|loopback|address>] [--no-open] [--reopen]",
      "node viewer.mjs poll --session <owned-review-directory>",
      "node viewer.mjs reply --session <owned-review-directory> --reply-file <json-in-session-directory>",
      "node viewer.mjs end --session <owned-review-directory>",
      "Every action prints one JSON result. Only a poll result with \"approval\": true approves the plan.",
    ].join("\n"));
  } else {
    try {
      const [action, ...rest] = process.argv.slice(2);
      const options = argumentsFor(rest);
      const actions = { check: checkViewer, open: openReview, reply: replyReview, end: endReview };
      let result;
      if (action === "poll") {
        const controller = new AbortController();
        for (const name of ["SIGINT", "SIGTERM"]) process.once(name, () => controller.abort());
        result = await pollReview({ ...options, write: (value) => console.log(JSON.stringify(value, null, 2)) }, { signal: controller.signal });
        if (result.event.type === "ended") console.log(JSON.stringify(result, null, 2));
      } else if (actions[action]) {
        console.log(JSON.stringify(await actions[action](options), null, 2));
      } else throw new Error("Use check, open, poll, reply or end. See --help.");
    } catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
