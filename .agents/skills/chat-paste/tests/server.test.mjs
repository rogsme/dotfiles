import assert from "node:assert/strict";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { APP, readJSON, serverFile } from "../scripts/common.mjs";
import { renderMessage } from "../scripts/render_message.mjs";
import { startServer } from "../scripts/server.mjs";
import { endMessage, ensureServer, messageURLs, pollMessage, registerSession, replyMessage, startViewer } from "../scripts/viewer.mjs";

// One artifact root, one in-process server, and as many rendered messages as a test needs.
async function viewer(t, { idleMinutes = 5, abandonMinutes = 30, onIdle } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "chat-paste-server-"));
  const artifactRoot = path.join(root, "artifacts");
  const running = await startServer({ root: artifactRoot, port: 0, listen: "loopback", idleMinutes, abandonMinutes, onIdle });
  t.after(async () => { await running.stop(); await rm(root, { recursive: true, force: true }); });
  const origin = `http://127.0.0.1:${running.port}`;
  async function message(name = "eod-test", text = "## Today\n* Shipped the page.\n") {
    const source = path.join(root, `${name}.md`);
    await writeFile(source, text);
    const options = { source, name, artifactRoot };
    const result = await renderMessage(options);
    const manifest = await readJSON(path.join(result.session, "session.json"));
    await registerSession(manifest, { port: running.port, listen: "loopback" });
    const login = await fetch(`${origin}/r/${manifest.id}/?t=${manifest.token}`, { redirect: "manual" });
    const cookie = login.headers.get("set-cookie").split(";")[0];
    const call = (route, body, headers = {}) => fetch(`${origin}/r/${manifest.id}/${route}`, body === undefined
      ? { headers: { Cookie: cookie, ...headers } }
      : { method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json", "X-Chat-Paste": "1", ...headers }, body: JSON.stringify(body) });
    return { ...result, manifest, options, login, cookie, call };
  }
  return { artifactRoot, origin, running, message };
}

const comment = (id, revision = 1) => ({ id, text: `Comment ${id}`, revision, target: { kind: "word", quote: "page", prefix: "Shipped the ", suffix: "." } });
const general = (id) => ({ id, text: `General ${id}`, revision: 1, target: { kind: "general" } });

test("a message link needs its own token, then works from a cookie", async (t) => {
  const { origin, message } = await viewer(t);
  const a = await message("eod-a");
  const b = await message("eod-b");
  assert.equal(a.login.status, 303);
  assert.equal(a.login.headers.get("location"), `/r/${a.manifest.id}/`);
  assert.match(a.login.headers.get("set-cookie"), /HttpOnly; SameSite=Strict/);
  assert.equal((await fetch(`${origin}/r/${a.manifest.id}/`)).status, 403);
  assert.equal((await fetch(`${origin}/r/${a.manifest.id}/?t=wrong`, { redirect: "manual" })).status, 403);
  assert.equal((await fetch(`${origin}/r/${a.manifest.id}/?t=${b.manifest.token}`, { redirect: "manual" })).status, 403);
  assert.equal((await fetch(`${origin}/r/${a.manifest.id}/`, { headers: { Cookie: b.cookie } })).status, 403);
  const page = await a.call("");
  assert.equal(page.status, 200);
  const policy = page.headers.get("content-security-policy");
  assert.match(policy, /script-src 'self';/);
  assert.match(policy, /connect-src 'self'/);
  assert.match(policy, /frame-ancestors 'none'/);
  assert.doesNotMatch(policy, /https:/);
  assert.match(await page.text(), /Shipped the page\./);
  assert.equal(await (await a.call("source")).text(), "## Today\n* Shipped the page.\n");
});

test("serves only its own assets and known routes", async (t) => {
  const { origin, message } = await viewer(t);
  const a = await message();
  for (const asset of ["viewer.js", "viewer.css", "copy.js", "attention.js", "changes.js"]) assert.equal((await fetch(`${origin}/assets/${asset}`)).status, 200, asset);
  for (const route of ["/assets/formatter.js", "/assets/server.mjs", "/assets/../scripts/common.mjs", "/assets/%2e%2e/scripts/common.mjs", "/r/0123/", `/r/${"0".repeat(32)}/`, "/"]) {
    assert.equal((await fetch(origin + route)).status, 404, route);
  }
  assert.equal((await a.call("api/feedback", { comments: [comment("c1")] }, { "X-Chat-Paste": "" })).status, 404);
  assert.equal((await a.call("api/feedback", { comments: [comment("c1")] }, { "Content-Type": "text/plain" })).status, 415);
  assert.equal((await a.call("api/feedback", { comments: [{ text: "No target" }] })).status, 400);
  assert.equal((await a.call("api/approve", { revision: 1 })).status, 404);
  const health = await (await fetch(`${origin}/health`)).json();
  assert.equal(health.app, APP);
  assert.equal(health.openSessions, 1);
});

test("feedback travels as files: poll delivers it once, and reply answers every comment", async (t) => {
  const { message } = await viewer(t);
  const a = await message();
  assert.deepEqual(await (await a.call("api/feedback", { comments: [comment("c1"), comment("c2")] })).json(), { seq: 1 });
  const state = await (await a.call("api/state")).json();
  assert.equal(state.pending, true);
  assert.equal(state.batches[0].comments.length, 2);
  const printed = [];
  const delivered = await pollMessage({ session: a.session, write: (value) => printed.push(value) });
  assert.equal(printed.length, 1);
  assert.equal(delivered.event.type, "feedback");
  assert.equal(delivered.staleComments, 0);
  assert.equal(delivered.done, false);
  assert.deepEqual(delivered.event.comments[0].target, { kind: "word", quote: "page", prefix: "Shipped the ", suffix: "." });
  assert.deepEqual(await readdir(path.join(a.session, "events")), []);
  assert.deepEqual(await readdir(path.join(a.session, "delivered")), ["0001-feedback.json"]);
  const reply = path.join(a.session, "reply.json");
  await writeFile(reply, JSON.stringify({ batch: 1, answers: [{ id: "c1", outcome: "changed", text: "Done." }] }));
  await assert.rejects(replyMessage({ session: a.session, replyFile: reply }), /missing: c2/);
  await writeFile(reply, JSON.stringify({ batch: 1, answers: [{ id: "c1", outcome: "changed", text: "Done." }, { id: "c9", outcome: "kept", text: "No." }] }));
  await assert.rejects(replyMessage({ session: a.session, replyFile: reply }), /no comment c9/);
  await writeFile(reply, JSON.stringify({ batch: 1, answers: [{ id: "c1", outcome: "changed", text: "Done." }, { id: "c2", outcome: "kept", text: "Already covered." }] }));
  assert.deepEqual((await replyMessage({ session: a.session, replyFile: reply })).pending, []);
  await assert.rejects(replyMessage({ session: a.session, replyFile: reply }), /already has a reply/);
  const after = await (await a.call("api/state")).json();
  assert.equal(after.pending, false);
  assert.equal(after.batches[0].reply.answers[1].outcome, "kept");
  await assert.rejects(replyMessage({ session: a.session, replyFile: path.join(os.tmpdir(), "reply.json") }), /session directory/);
});

test("a general comment needs only its text, and a batch may hold nothing else", async (t) => {
  const { message } = await viewer(t);
  const a = await message();
  assert.deepEqual(await (await a.call("api/feedback", { comments: [general("g1"), general("g2")] })).json(), { seq: 1 });
  const delivered = await pollMessage({ session: a.session });
  assert.deepEqual(delivered.event.comments.map((item) => item.target), [
    { kind: "general", quote: "", prefix: "", suffix: "" },
    { kind: "general", quote: "", prefix: "", suffix: "" },
  ]);
  const refused = await a.call("api/feedback", { comments: [{ ...general("g3"), target: { kind: "general", quote: "page" } }] });
  assert.equal(refused.status, 400);
  assert.match((await refused.json()).error, /general comment has no quote/);
  for (const kind of ["box", "diagram", "paragraph"]) assert.equal((await a.call("api/feedback", { comments: [{ ...general("g4"), target: { kind } }] })).status, 400, kind);
  assert.equal((await a.call("api/feedback", { comments: [{ ...general("g5"), text: " " }] })).status, 400);
  assert.equal((await a.call("api/feedback", { comments: [general("g6"), comment("c1")] })).status, 200);
});

test("Done needs the current revision and no batch waiting on the agent", async (t) => {
  const { message } = await viewer(t);
  const a = await message();
  const current = { revision: a.revision, sourceDigest: a.sourceDigest };
  await a.call("api/feedback", { comments: [comment("c1")] });
  assert.deepEqual(await (await a.call("api/done", current)).json(), { error: "The agent is revising." });
  await pollMessage({ session: a.session });
  await writeFile(a.options.source, "## Today\n* Shipped the page and its tests.\n");
  const second = await renderMessage({ ...a.options, session: a.session });
  const reply = path.join(a.session, "reply.json");
  await writeFile(reply, JSON.stringify({ batch: 1, answers: [{ id: "c1", outcome: "changed", text: "Revised." }] }));
  await replyMessage({ session: a.session, replyFile: reply });
  const stale = await a.call("api/done", current);
  assert.equal(stale.status, 409);
  assert.deepEqual(await stale.json(), { error: "Reload: revision 2 exists." });
  assert.equal((await a.call("api/done", { revision: 2, sourceDigest: second.sourceDigest })).status, 200);
  assert.deepEqual(await (await a.call("api/done", { revision: 2, sourceDigest: second.sourceDigest })).json(), { error: "This message is closed." });
  assert.equal((await a.call("api/feedback", { comments: [comment("c2", 2)] })).status, 409);
  const done = await pollMessage({ session: a.session });
  assert.equal(done.event.type, "done");
  assert.equal(done.done, true);
  assert.equal(done.event.sourceDigest, second.sourceDigest);
  assert.equal((await readJSON(path.join(a.session, "state.json"))).status, "done");
  // The page and its copy buttons stay reachable after Done.
  assert.equal((await a.call("")).status, 200);
});

test("a comment on an older revision is counted as stale", async (t) => {
  const { message } = await viewer(t);
  const a = await message();
  await writeFile(a.options.source, "## Today\n* Changed.\n");
  await renderMessage({ ...a.options, session: a.session });
  await a.call("api/feedback", { comments: [comment("c1", 1)] });
  assert.equal((await pollMessage({ session: a.session })).staleComments, 1);
});

test("the saved theme reaches every message on the server", async (t) => {
  const { message } = await viewer(t);
  const a = await message("eod-a");
  const b = await message("eod-b");
  assert.doesNotMatch(await (await b.call("")).text(), /data-theme=/);
  assert.equal((await a.call("api/theme", { theme: "purple" })).status, 400);
  assert.equal((await a.call("api/theme", { theme: "dark" })).status, 200);
  assert.match(await (await b.call("")).text(), /<html data-theme="dark" lang="en"/);
  assert.equal((await (await b.call("api/state")).json()).theme, "dark");
});

test("poll returns when the agent ends the message", async (t) => {
  const { message, origin } = await viewer(t);
  const a = await message();
  const waiting = pollMessage({ session: a.session });
  await endMessage({ session: a.session });
  const ended = await waiting;
  assert.equal(ended.event.type, "ended");
  assert.equal(ended.event.reason, "agent");
  assert.equal((await fetch(`${origin}/r/${a.manifest.id}/`, { headers: { Cookie: a.cookie } })).status, 404);
});

test("a message no page has open ends itself, and its poll returns", async (t) => {
  const { message } = await viewer(t, { abandonMinutes: 0.01 });
  const a = await message();
  const ended = await pollMessage({ session: a.session });
  assert.equal(ended.event.type, "ended");
  assert.equal(ended.event.reason, "abandoned");
});

test("an open page keeps its message from ending", async (t) => {
  // The stream marks the page every second, so the window must be longer than that.
  const { message, origin } = await viewer(t, { abandonMinutes: 0.03 });
  const a = await message();
  const controller = new AbortController();
  t.after(() => controller.abort());
  const stream = await fetch(`${origin}/r/${a.manifest.id}/events`, { headers: { Cookie: a.cookie }, signal: controller.signal });
  assert.equal(stream.status, 200);
  await new Promise((resolve) => setTimeout(resolve, 3500));
  assert.equal((await readJSON(path.join(a.session, "state.json"))).status, "open");
  controller.abort();
});

test("the server stops itself once no message is open", async (t) => {
  let idle = false;
  const { message } = await viewer(t, { idleMinutes: 0.005, onIdle: () => { idle = true; } });
  const a = await message();
  await new Promise((resolve) => setTimeout(resolve, 600));
  assert.equal(idle, false, "It stopped with a message open.");
  await endMessage({ session: a.session });
  for (let i = 0; i < 40 && !idle; i++) await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(idle, true);
});

async function fakeService(t, body) {
  const server = http.createServer((request, response) => {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(typeof body === "string" ? body : JSON.stringify(body));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return server.address().port;
}

test("open never stops a viewer with open messages or another service", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "chat-paste-other-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const older = await fakeService(t, { app: APP, version: "0000000000000000", root, listen: "loopback", openSessions: 2 });
  await assert.rejects(ensureServer({ root, port: older, listen: "loopback" }), /still has 2 open message\(s\); it was left running/);
  const elsewhere = await fakeService(t, { app: APP, version: "0000000000000000", root: "/srv/other", listen: "loopback", openSessions: 0 });
  await assert.rejects(ensureServer({ root, port: elsewhere, listen: "loopback" }), /serves the artifact root \/srv\/other/);
  const plans = await fakeService(t, { app: "present-plan-viewer", version: "0000000000000000", root, listen: "loopback", openSessions: 0 });
  await assert.rejects(ensureServer({ root, port: plans, listen: "loopback" }), /another service/);
  const unrelated = await fakeService(t, "<html>not a viewer</html>");
  await assert.rejects(ensureServer({ root, port: unrelated, listen: "loopback" }), /another service/);
});

test("open moves to the next port when the configured one is held", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "chat-paste-ports-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const held = await fakeService(t, "<html>not a viewer</html>");
  const running = await startViewer({ root, port: held, listen: "loopback" });
  try {
    assert.equal(running.started, true);
    assert.ok(running.port > held);
    assert.equal(running.skippedPorts[0].port, held);
    assert.match(running.skippedPorts[0].reason, /another service; it was left running/);
    const again = await startViewer({ root, port: held, listen: "loopback" });
    assert.deepEqual([again.started, again.port], [false, running.port]);
  } finally {
    const { secret } = await readJSON(serverFile(root, running.port));
    await fetch(`http://127.0.0.1:${running.port}/shutdown`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ secret }) });
  }
});

test("message links list local, Tailscale and network addresses", () => {
  const manifest = { id: "a".repeat(32), token: "token" };
  assert.deepEqual(messageURLs(manifest, { port: 4410, listen: "loopback" }), [{ label: "Local", url: `http://127.0.0.1:4410/r/${manifest.id}/?t=token` }]);
  assert.deepEqual(messageURLs(manifest, { port: 4410, listen: "100.101.102.103" }), [{ label: "Tailscale", url: `http://100.101.102.103:4410/r/${manifest.id}/?t=token` }]);
  assert.equal(messageURLs(manifest, { port: 4410, listen: "all" })[0].label, "Local");
});
