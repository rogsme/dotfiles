import { randomBytes, timingSafeEqual } from "node:crypto";
import { readFile, readdir, unlink } from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { APP, SCHEMA, SESSION_ID, atomicWrite, inside, invokedDirectly, makePrivateDirectory, readJSON, registryDirectory, revisionFile, safePath, viewerDirectory, viewerVersion } from "./common.mjs";

const assets = fileURLToPath(new URL("../assets/", import.meta.url));
const ASSETS = { "viewer.js": "text/javascript", "viewer.css": "text/css", "tabs.js": "text/javascript", "diagrams.js": "text/javascript", "attention.js": "text/javascript", "changes.js": "text/javascript" };
const POLICY = "default-src 'none'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; font-src https://cdn.jsdelivr.net; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const TARGETS = new Set(["text", "word", "box", "diagram", "general"]);

export function bindAddress(listen) {
  if (listen === "all") return "0.0.0.0";
  if (listen === "loopback") return "127.0.0.1";
  if (net.isIP(listen)) return listen;
  throw new Error("Listen is all, loopback, or one IP address of this machine.");
}

// The channel between the page and the agent is files in the session directory:
// events/ holds what the browser sent and poll has not delivered, delivered/ what it has,
// and replies/ the agent's answer to each feedback batch.
const EVENT = /^(\d{4,})-(feedback|approval|done)\.json$/;

export async function listEvents(session) {
  const events = [];
  for (const folder of ["events", "delivered"]) {
    const names = await readdir(path.join(session, folder)).catch((error) => { if (error.code === "ENOENT") return []; throw error; });
    for (const name of names) {
      const match = name.match(EVENT);
      if (match) events.push({ seq: Number(match[1]), type: match[2], file: path.join(session, folder, name), delivered: folder === "delivered" });
    }
  }
  return events.sort((a, b) => a.seq - b.seq);
}

export async function listReplies(session) {
  const names = await readdir(path.join(session, "replies")).catch((error) => { if (error.code === "ENOENT") return []; throw error; });
  return names.map((name) => name.match(/^(\d{4,})\.json$/)).filter(Boolean).map((match) => ({ batch: Number(match[1]), file: path.join(session, "replies", match[0]) }));
}

export async function readState(session) {
  return readJSON(path.join(session, "state.json")).catch((error) => { if (error.code === "ENOENT") return { status: "new" }; throw error; });
}

export async function writeState(session, changes) {
  const state = { ...(await readState(session)), ...changes, updatedAt: new Date().toISOString() };
  await atomicWrite(path.join(session, "state.json"), JSON.stringify(state, null, 2) + "\n");
  return state;
}

export async function writeEvent(session, type, body) {
  await makePrivateDirectory(path.join(session, "events"));
  for (let attempt = 0; attempt < 20; attempt++) {
    const events = await listEvents(session);
    const seq = (events.at(-1)?.seq || 0) + 1;
    const file = path.join(session, "events", `${String(seq).padStart(4, "0")}-${type}.json`);
    try {
      await atomicWrite(file, JSON.stringify({ seq, type, at: new Date().toISOString(), ...body }, null, 2) + "\n", { exclusive: true });
      return seq;
    } catch (error) { if (error.code !== "EEXIST") throw error; }
  }
  throw new Error("Could not record the event; too many writers at once.");
}

// A feedback batch is pending until the agent replies to it.
export async function pendingBatches(session) {
  const answered = new Set((await listReplies(session)).map((reply) => reply.batch));
  return (await listEvents(session)).filter((event) => event.type === "feedback" && !answered.has(event.seq)).map((event) => event.seq);
}

const text = (value, limit) => typeof value === "string" ? value.slice(0, limit) : "";

export function cleanComment(comment) {
  const target = comment?.target || {};
  const body = text(comment?.text, 10_000).trim();
  if (!TARGETS.has(target.kind) || !body) throw new Error("Every comment needs text and a target.");
  // A general comment is on the plan as a whole, so it points at nothing inside it.
  if (target.kind === "general" && (target.quote || target.label || target.diagram != null)) throw new Error("A general comment has no quote, diagram or label.");
  return {
    id: text(comment.id, 64), text: body, tab: text(comment.tab, 20) || null,
    headings: (Array.isArray(comment.headings) ? comment.headings : []).slice(0, 8).map((heading) => text(heading, 300)),
    revision: Number.isInteger(comment.revision) ? comment.revision : null,
    sourceDigest: /^[0-9a-f]{64}$/.test(comment.sourceDigest || "") ? comment.sourceDigest : null,
    target: {
      kind: target.kind, quote: text(target.quote, 4000), prefix: text(target.prefix, 200), suffix: text(target.suffix, 200),
      diagram: Number.isInteger(target.diagram) ? target.diagram : null, label: text(target.label, 500),
    },
  };
}

function send(response, status, body, headers = {}) {
  const json = typeof body !== "string";
  response.writeHead(status, {
    "Content-Type": json ? "application/json; charset=utf-8" : "text/plain; charset=utf-8",
    "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", ...headers,
  });
  response.end(json ? JSON.stringify(body) : body);
}

async function readBody(request) {
  if (!/^application\/json\b/.test(request.headers["content-type"] || "")) throw Object.assign(new Error("Send JSON."), { status: 415 });
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1_048_576) throw Object.assign(new Error("The request is too large."), { status: 413 });
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw Object.assign(new Error("The request is not valid JSON."), { status: 400 }); }
}

function cookie(request, name) {
  for (const part of (request.headers.cookie || "").split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return null;
}

const sameToken = (a, b) => typeof a === "string" && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function startServer({ root, port, listen, idleMinutes = 5, onIdle = () => {} }) {
  const version = await viewerVersion();
  const secret = randomBytes(32).toString("base64url");
  const host = bindAddress(listen);
  await makePrivateDirectory(registryDirectory(root));
  const preferences = path.join(viewerDirectory(root), "preferences.json");
  const streams = new Set();
  let lastActive = Date.now();

  async function registered() {
    const names = await readdir(registryDirectory(root)).catch(() => []);
    const sessions = [];
    for (const name of names) {
      const id = name.replace(/\.json$/, "");
      const manifest = SESSION_ID.test(id) ? await findSession(id) : null;
      if (manifest) sessions.push({ manifest, state: await readState(manifest.session) });
    }
    return sessions;
  }

  async function findSession(id) {
    if (!SESSION_ID.test(id)) return null;
    const entry = await readJSON(path.join(registryDirectory(root), `${id}.json`)).catch(() => null);
    const session = entry && await safePath(entry.session).catch(() => null);
    if (!session || !inside(root, session) || session === root) return null;
    const manifest = await readJSON(path.join(session, "session.json")).catch(() => null);
    if (manifest?.schema !== SCHEMA || manifest.id !== id || manifest.session !== session) return null;
    return manifest;
  }

  async function theme() {
    const value = (await readJSON(preferences).catch(() => ({}))).theme;
    return value === "light" || value === "dark" ? value : null;
  }

  async function snapshot(manifest) {
    const session = manifest.session;
    const replies = new Map();
    for (const reply of await listReplies(session)) replies.set(reply.batch, await readJSON(reply.file));
    const batches = [];
    let approval = null;
    for (const event of await listEvents(session)) {
      const body = await readJSON(event.file);
      if (event.type === "feedback") batches.push({ seq: event.seq, at: body.at, revision: body.revision, comments: body.comments, reply: replies.get(event.seq) || null });
      if (event.type === "approval" || event.type === "done") approval = { type: event.type, revision: body.revision, sourceDigest: body.sourceDigest, at: body.at };
    }
    const state = await readState(session);
    const { ticket, riders, kind } = manifest.identity;
    return {
      kind, ticket, riders, revision: manifest.revision, sourceDigest: manifest.sourceDigest, status: state.status,
      pending: batches.some((batch) => !batch.reply), batches, approval, theme: await theme(),
    };
  }

  // The page asks for a fresh snapshot whenever this signature changes.
  async function signature(manifest) {
    const fresh = await readJSON(path.join(manifest.session, "session.json")).catch(() => manifest);
    const state = await readState(manifest.session);
    return [fresh.revision, fresh.sourceDigest, state.status, (await listEvents(manifest.session)).length, (await listReplies(manifest.session)).length].join(":");
  }

  // Approval and Done close the review, so they need the current revision and no batch waiting on the agent.
  async function close(manifest, type, body) {
    const state = await readState(manifest.session);
    if (state.status !== "open") return [409, { error: "This review is closed." }];
    if (body.revision !== manifest.revision || body.sourceDigest !== manifest.sourceDigest) return [409, { error: `Reload: revision ${manifest.revision} exists.` }];
    if ((await pendingBatches(manifest.session)).length) return [409, { error: "The agent is revising." }];
    const { ticket, riders } = manifest.identity;
    const seq = await writeEvent(manifest.session, type, { revision: manifest.revision, sourceDigest: manifest.sourceDigest, ticket, riders });
    await writeState(manifest.session, { status: type === "approval" ? "approved" : "done" });
    return [200, { seq }];
  }

  async function route(request, response) {
    const url = new URL(request.url, "http://viewer.invalid");
    if (url.pathname === "/health" && request.method === "GET") {
      const sessions = await registered();
      return send(response, 200, { app: APP, version, root, listen, port: server.address().port, pid: process.pid, openSessions: sessions.filter((item) => item.state.status === "open").length });
    }
    if (url.pathname === "/shutdown" && request.method === "POST") {
      const body = await readBody(request);
      if (!sameToken(body.secret, secret)) return send(response, 403, { error: "Not allowed." });
      if ((await registered()).some((item) => item.state.status === "open")) return send(response, 409, { error: "Reviews are still open." });
      send(response, 200, { stopping: true });
      return stop();
    }
    const asset = url.pathname.match(/^\/assets\/([a-z]+\.(?:js|css))$/);
    if (asset && ASSETS[asset[1]] && request.method === "GET") {
      response.writeHead(200, { "Content-Type": `${ASSETS[asset[1]]}; charset=utf-8`, "Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff" });
      return response.end(await readFile(path.join(assets, asset[1])));
    }
    const match = url.pathname.match(/^\/r\/([0-9a-f]{32})(\/.*)?$/);
    const manifest = match && await findSession(match[1]);
    if (!manifest) return send(response, 404, "No review here.");
    const id = manifest.id;
    const rest = match[2] || "";
    const name = `pp_${id}`;
    const query = url.searchParams.get("t");
    if (rest === "" || (rest === "/" && query !== null)) {
      if (!sameToken(query, manifest.token)) return send(response, 403, "This review link needs its token. Use the full link the agent printed.");
      return send(response, 303, "", { Location: `/r/${id}/`, "Set-Cookie": `${name}=${manifest.token}; Path=/r/${id}/; HttpOnly; SameSite=Strict` });
    }
    if (!sameToken(cookie(request, name) || request.headers["x-plan-token"], manifest.token)) return send(response, 403, "This review link needs its token. Use the full link the agent printed.");
    lastActive = Date.now();
    const session = manifest.session;
    if (rest === "/" && request.method === "GET") {
      const html = await readFile(path.join(session, "plan.html"), "utf8");
      const mode = await theme();
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": POLICY, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" });
      return response.end(mode ? html.replace("<html ", `<html data-theme="${mode}" `) : html);
    }
    if (rest === "/source" && request.method === "GET") return send(response, 200, await readFile(path.join(session, revisionFile(manifest.revision)), "utf8"));
    if (rest === "/api/state" && request.method === "GET") return send(response, 200, await snapshot(manifest));
    if (rest === "/events" && request.method === "GET") {
      response.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive", "X-Accel-Buffering": "no" });
      let last = null;
      let beat = 0;
      const tick = async () => {
        try {
          const current = await signature(manifest);
          if (current !== last) { last = current; response.write(`event: state\ndata: ${JSON.stringify(current)}\n\n`); }
          else if (++beat % 20 === 0) response.write(": keep-alive\n\n");
        } catch { /* a session mid-render reads again on the next tick */ }
      };
      const timer = setInterval(tick, 1000);
      const stream = { response, timer };
      streams.add(stream);
      request.on("close", () => { clearInterval(timer); streams.delete(stream); });
      return tick();
    }
    if (request.method !== "POST" || request.headers["x-plan-review"] !== "1") return send(response, 404, "No such review route.");
    // The custom header forces a CORS preflight, which this server never answers, so other sites cannot post here.
    const body = await readBody(request);
    if (rest === "/api/theme") {
      if (body.theme !== "light" && body.theme !== "dark") return send(response, 400, { error: "Theme is light or dark." });
      await atomicWrite(preferences, JSON.stringify({ theme: body.theme }, null, 2) + "\n");
      return send(response, 200, { theme: body.theme });
    }
    if (rest === "/api/feedback") {
      if ((await readState(session)).status !== "open") return send(response, 409, { error: "This review is closed." });
      if (!Array.isArray(body.comments) || !body.comments.length || body.comments.length > 200) return send(response, 400, { error: "Send between 1 and 200 comments." });
      let comments;
      try { comments = body.comments.map(cleanComment); }
      catch (error) { return send(response, 400, { error: error.message }); }
      const seq = await writeEvent(session, "feedback", { revision: manifest.revision, sourceDigest: manifest.sourceDigest, comments });
      return send(response, 200, { seq });
    }
    if (rest === "/api/approve" || rest === "/api/done") {
      const type = rest === "/api/approve" ? "approval" : "done";
      if ((type === "approval") !== (manifest.identity.kind === "ticket")) return send(response, 400, { error: type === "approval" ? "A standalone document has Done, not Approve." : "A ticket plan has Approve, not Done." });
      const [status, result] = await close(manifest, type, body);
      return send(response, status, result);
    }
    return send(response, 404, "No such review route.");
  }

  const server = http.createServer((request, response) => {
    route(request, response).catch((error) => {
      if (!response.headersSent) send(response, error.status || 500, { error: error.status ? error.message : "The viewer hit an error; see its log." });
      else response.end();
      if (!error.status) console.error(error);
    });
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(port, host, resolve); });

  const idle = setInterval(async () => {
    const open = (await registered().catch(() => [])).some((item) => item.state.status === "open");
    if (open) lastActive = Date.now();
    else if (Date.now() - lastActive > idleMinutes * 60_000) await stop();
  }, Math.min(30_000, idleMinutes * 60_000 / 2));
  idle.unref();

  let stopping = null;
  function stop() {
    stopping ||= new Promise((resolve) => {
      clearInterval(idle);
      for (const stream of streams) { clearInterval(stream.timer); stream.response.end(); }
      server.close(resolve);
      server.closeAllConnections();
    }).then(() => unlink(path.join(viewerDirectory(root), "server.json")).catch(() => {})).then(onIdle);
    return stopping;
  }

  await atomicWrite(path.join(viewerDirectory(root), "server.json"), JSON.stringify({ pid: process.pid, port: server.address().port, listen, version, secret }, null, 2) + "\n");
  return { server, port: server.address().port, version, stop };
}

function argumentsFor(argv) {
  const options = {};
  const fields = { "--root": "root", "--port": "port", "--listen": "listen", "--idle-minutes": "idleMinutes" };
  for (let i = 0; i < argv.length; i++) {
    if (fields[argv[i]] && argv[i + 1]) options[fields[argv[i]]] = argv[++i];
    else throw new Error(`Unknown or incomplete argument: ${argv[i]}`);
  }
  for (const name of ["root", "port", "listen"]) if (!options[name]) throw new Error(`Missing ${name}. See --help.`);
  return { ...options, port: Number(options.port), idleMinutes: Number(options.idleMinutes || 5) };
}

if (invokedDirectly(import.meta.url)) {
  if (process.argv.includes("--help")) {
    console.log("node server.mjs --root <artifact-root> --port <port> --listen <all|loopback|address> [--idle-minutes <minutes>]\nThe shared plan viewer. viewer.mjs open starts it; run it by hand only to debug.");
  } else {
    try {
      const options = argumentsFor(process.argv.slice(2));
      const { port } = await startServer({ ...options, onIdle: () => process.exit(0) });
      console.log(`${new Date().toISOString()} viewer listening on ${bindAddress(options.listen)}:${port} for ${options.root}`);
      for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => process.exit(0));
    } catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
