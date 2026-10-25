import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFile, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { APP, PINS, readJSON } from "../scripts/common.mjs";
import { loadMarked, renderPlan } from "../scripts/render_plan.mjs";
import { startServer } from "../scripts/server.mjs";
import { endReview, ensureServer, pollReview, registerSession, replyReview, reviewURLs } from "../scripts/viewer.mjs";

const sharedRoot = path.join(os.tmpdir(), "present-plan-test-cache");
await loadMarked(sharedRoot);
const cachedMarked = path.join(sharedRoot, "cache", PINS.marked.file.replace(/[/@]/g, "_"));

// One artifact root, one in-process server, and as many rendered reviews as a test needs.
async function viewer(t, { idleMinutes = 5, onIdle } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "present-plan-server-"));
  const artifactRoot = path.join(root, "artifacts");
  await mkdir(path.join(artifactRoot, "cache"), { recursive: true, mode: 0o700 });
  await copyFile(cachedMarked, path.join(artifactRoot, "cache", path.basename(cachedMarked)));
  const running = await startServer({ root: artifactRoot, port: 0, listen: "loopback", idleMinutes, onIdle });
  t.after(async () => { await running.stop(); await rm(root, { recursive: true, force: true }); });
  const origin = `http://127.0.0.1:${running.port}`;
  async function review(ticket = "ACM-123", { standalone = false, markdown = `# ${ticket}: Pagination\n\n## Overview\nOne page at a time.\n` } = {}) {
    const repository = path.join(root, ticket);
    await mkdir(repository);
    execFileSync("git", ["init", "-q", `--initial-branch=${ticket}`], { cwd: repository });
    const source = path.join(root, `${ticket}.md`);
    await writeFile(source, markdown);
    const options = { source, repository, worktree: repository, artifactRoot, ticket, standalone };
    const result = await renderPlan(options);
    const manifest = await readJSON(path.join(result.session, "session.json"));
    await registerSession(manifest, { port: running.port, listen: "loopback" });
    const login = await fetch(`${origin}/r/${manifest.id}/?t=${manifest.token}`, { redirect: "manual" });
    const cookie = login.headers.get("set-cookie").split(";")[0];
    const call = (route, body, headers = {}) => fetch(`${origin}/r/${manifest.id}/${route}`, body === undefined
      ? { headers: { Cookie: cookie, ...headers } }
      : { method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json", "X-Plan-Review": "1", ...headers }, body: JSON.stringify(body) });
    return { ...result, manifest, options, login, cookie, call };
  }
  return { artifactRoot, origin, running, review };
}

const comment = (id, revision = 1) => ({ id, text: `Comment ${id}`, tab: "overview", headings: ["Overview"], revision, target: { kind: "word", quote: "page" } });

test("a review link needs its own token, then works from a cookie", async (t) => {
  const { origin, review } = await viewer(t);
  const a = await review("ACM-123");
  const b = await review("ACM-124");
  assert.equal(a.login.status, 303);
  assert.equal(a.login.headers.get("location"), `/r/${a.manifest.id}/`);
  assert.match(a.login.headers.get("set-cookie"), /HttpOnly; SameSite=Strict/);
  assert.equal((await fetch(`${origin}/r/${a.manifest.id}/`)).status, 403);
  assert.equal((await fetch(`${origin}/r/${a.manifest.id}/?t=wrong`, { redirect: "manual" })).status, 403);
  assert.equal((await fetch(`${origin}/r/${a.manifest.id}/?t=${b.manifest.token}`, { redirect: "manual" })).status, 403);
  assert.equal((await fetch(`${origin}/r/${a.manifest.id}/`, { headers: { Cookie: b.cookie } })).status, 403);
  const page = await a.call("");
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-security-policy"), /script-src 'self' https:\/\/cdn\.jsdelivr\.net/);
  assert.match(page.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.match(await page.text(), /ACM-123: Pagination/);
  assert.match(await (await a.call("source")).text(), /One page at a time/);
});

test("serves only its own assets and known routes", async (t) => {
  const { origin, review } = await viewer(t);
  const a = await review();
  assert.equal((await fetch(`${origin}/assets/viewer.js`)).status, 200);
  for (const route of ["/assets/server.mjs", "/assets/../scripts/common.mjs", "/assets/%2e%2e/scripts/common.mjs", "/r/0123/", `/r/${"0".repeat(32)}/`, "/"]) {
    assert.equal((await fetch(origin + route)).status, 404, route);
  }
  assert.equal((await a.call("api/feedback", { comments: [comment("c1")] }, { "X-Plan-Review": "" })).status, 404);
  assert.equal((await a.call("api/feedback", { comments: [comment("c1")] }, { "Content-Type": "text/plain" })).status, 415);
  assert.equal((await a.call("api/feedback", { comments: [{ text: "No target" }] })).status, 400);
  const health = await (await fetch(`${origin}/health`)).json();
  assert.equal(health.app, APP);
  assert.equal(health.openSessions, 1);
});

test("feedback travels as files: poll delivers it once, and reply answers every comment", async (t) => {
  const { review } = await viewer(t);
  const a = await review();
  assert.deepEqual(await (await a.call("api/feedback", { comments: [comment("c1"), comment("c2")] })).json(), { seq: 1 });
  const state = await (await a.call("api/state")).json();
  assert.equal(state.pending, true);
  assert.equal(state.batches[0].comments.length, 2);
  const printed = [];
  const delivered = await pollReview({ session: a.session, write: (value) => printed.push(value) });
  assert.equal(printed.length, 1);
  assert.equal(delivered.event.type, "feedback");
  assert.equal(delivered.staleComments, 0);
  assert.equal(delivered.approval, false);
  assert.deepEqual(await readdir(path.join(a.session, "events")), []);
  assert.deepEqual(await readdir(path.join(a.session, "delivered")), ["0001-feedback.json"]);
  const reply = path.join(a.session, "reply.json");
  await writeFile(reply, JSON.stringify({ batch: 1, answers: [{ id: "c1", outcome: "changed", text: "Done." }] }));
  await assert.rejects(replyReview({ session: a.session, replyFile: reply }), /missing: c2/);
  await writeFile(reply, JSON.stringify({ batch: 1, answers: [{ id: "c1", outcome: "changed", text: "Done." }, { id: "c9", outcome: "kept", text: "No." }] }));
  await assert.rejects(replyReview({ session: a.session, replyFile: reply }), /no comment c9/);
  await writeFile(reply, JSON.stringify({ batch: 1, answers: [{ id: "c1", outcome: "changed", text: "Done." }, { id: "c2", outcome: "kept", text: "Already covered." }] }));
  assert.deepEqual((await replyReview({ session: a.session, replyFile: reply })).pending, []);
  await assert.rejects(replyReview({ session: a.session, replyFile: reply }), /already has a reply/);
  const after = await (await a.call("api/state")).json();
  assert.equal(after.pending, false);
  assert.equal(after.batches[0].reply.answers[1].outcome, "kept");
  await assert.rejects(replyReview({ session: a.session, replyFile: path.join(os.tmpdir(), "reply.json") }), /session directory/);
});

test("Approve needs the current revision and no batch waiting on the agent", async (t) => {
  const { review } = await viewer(t);
  const a = await review();
  const current = { revision: a.revision, sourceDigest: a.sourceDigest };
  await a.call("api/feedback", { comments: [comment("c1")] });
  assert.deepEqual(await (await a.call("api/approve", current)).json(), { error: "The agent is revising." });
  await pollReview({ session: a.session });
  await writeFile(a.options.source, "# ACM-123: Pagination\n\n## Overview\nTwo pages at a time.\n");
  const second = await renderPlan({ ...a.options, session: a.session });
  const reply = path.join(a.session, "reply.json");
  await writeFile(reply, JSON.stringify({ batch: 1, answers: [{ id: "c1", outcome: "changed", text: "Revised." }] }));
  await replyReview({ session: a.session, replyFile: reply });
  const stale = await a.call("api/approve", current);
  assert.equal(stale.status, 409);
  assert.deepEqual(await stale.json(), { error: "Reload: revision 2 exists." });
  assert.equal((await a.call("api/done", { revision: 2, sourceDigest: second.sourceDigest })).status, 400);
  assert.equal((await a.call("api/approve", { revision: 2, sourceDigest: second.sourceDigest })).status, 200);
  assert.deepEqual(await (await a.call("api/approve", { revision: 2, sourceDigest: second.sourceDigest })).json(), { error: "This review is closed." });
  assert.equal((await a.call("api/feedback", { comments: [comment("c2", 2)] })).status, 409);
  const approval = await pollReview({ session: a.session });
  assert.equal(approval.event.type, "approval");
  assert.equal(approval.approval, true);
  assert.equal(approval.event.sourceDigest, second.sourceDigest);
  assert.equal((await readJSON(path.join(a.session, "state.json"))).status, "approved");
});

test("a standalone document finishes with Done, never Approve", async (t) => {
  const { review } = await viewer(t);
  const notes = await review("pagination-notes", { standalone: true });
  const current = { revision: notes.revision, sourceDigest: notes.sourceDigest };
  assert.equal((await notes.call("api/approve", current)).status, 400);
  assert.equal((await notes.call("api/done", current)).status, 200);
  const done = await pollReview({ session: notes.session });
  assert.equal(done.done, true);
  assert.equal(done.approval, false);
});

test("a comment on an older revision is counted as stale", async (t) => {
  const { review } = await viewer(t);
  const a = await review();
  await writeFile(a.options.source, "# ACM-123: Pagination\n\n## Overview\nChanged.\n");
  await renderPlan({ ...a.options, session: a.session });
  await a.call("api/feedback", { comments: [comment("c1", 1)] });
  assert.equal((await pollReview({ session: a.session })).staleComments, 1);
});

test("the saved theme reaches every review on the server", async (t) => {
  const { review } = await viewer(t);
  const a = await review("ACM-123");
  const b = await review("ACM-124");
  assert.doesNotMatch(await (await b.call("")).text(), /data-theme=/);
  assert.equal((await a.call("api/theme", { theme: "purple" })).status, 400);
  assert.equal((await a.call("api/theme", { theme: "dark" })).status, 200);
  assert.match(await (await b.call("")).text(), /<html data-theme="dark" lang="en"/);
  assert.equal((await (await b.call("api/state")).json()).theme, "dark");
});

test("poll returns when the agent ends the review", async (t) => {
  const { review, origin } = await viewer(t);
  const a = await review();
  const waiting = pollReview({ session: a.session });
  await endReview({ session: a.session });
  assert.equal((await waiting).event.type, "ended");
  assert.equal((await fetch(`${origin}/r/${a.manifest.id}/`, { headers: { Cookie: a.cookie } })).status, 404);
});

test("the server stops itself once no review is open", async (t) => {
  let idle = false;
  const { review } = await viewer(t, { idleMinutes: 0.005, onIdle: () => { idle = true; } });
  const a = await review();
  await new Promise((resolve) => setTimeout(resolve, 600));
  assert.equal(idle, false, "It stopped with a review open.");
  await endReview({ session: a.session });
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

test("open never stops a viewer with open reviews or another service", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "present-plan-other-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const older = await fakeService(t, { app: APP, version: "0000000000000000", root, listen: "loopback", openSessions: 2 });
  await assert.rejects(ensureServer({ root, port: older, listen: "loopback" }), /still has 2 open review\(s\); it was left running/);
  const elsewhere = await fakeService(t, { app: APP, version: "0000000000000000", root: "/srv/other", listen: "loopback", openSessions: 0 });
  await assert.rejects(ensureServer({ root, port: elsewhere, listen: "loopback" }), /serves the artifact root \/srv\/other/);
  const unrelated = await fakeService(t, "<html>not a viewer</html>");
  await assert.rejects(ensureServer({ root, port: unrelated, listen: "loopback" }), /another service/);
});

test("review links list local, Tailscale and network addresses", () => {
  const manifest = { id: "a".repeat(32), token: "token" };
  assert.deepEqual(reviewURLs(manifest, { port: 4388, listen: "loopback" }), [{ label: "Local", url: `http://127.0.0.1:4388/r/${manifest.id}/?t=token` }]);
  assert.deepEqual(reviewURLs(manifest, { port: 4388, listen: "100.101.102.103" }), [{ label: "Tailscale", url: `http://100.101.102.103:4388/r/${manifest.id}/?t=token` }]);
  assert.equal(reviewURLs(manifest, { port: 4388, listen: "all" })[0].label, "Local");
});
