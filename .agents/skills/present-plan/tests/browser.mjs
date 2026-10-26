import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { viewerDirectory } from "../scripts/common.mjs";
import { renderPlan } from "../scripts/render_plan.mjs";
import { endReview, health, openReview, pollReview, replyReview } from "../scripts/viewer.mjs";

const execute = promisify(execFile);
const root = await mkdtemp(path.join(os.tmpdir(), "present-plan-browser-"));
const browser = `present-plan-${process.pid}`;
const opened = [];
let browserOpened = false;
let passed = false;
let port;
const artifactRoot = path.join(root, "plans");

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const free = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return free;
}

async function playwright(args) {
  const result = await execute("playwright-cli", [`-s=${browser}`, ...args], { cwd: root, timeout: 120_000, maxBuffer: 2_097_152 });
  if (/^### Error\b/m.test(result.stdout)) throw new Error(result.stdout);
  return result.stdout;
}

async function browserCode(template, config) {
  const source = (await readFile(new URL(template, import.meta.url), "utf8")).replace("__CONFIG__", JSON.stringify(config));
  const file = path.join(root, template);
  await writeFile(file, source);
  const output = await playwright(["run-code", `--filename=${file}`]);
  const result = output.match(/### Result\n([^\n]+)/)?.[1];
  if (!result) throw new Error(output);
  const checks = JSON.parse(result);
  if (checks.passed !== true) throw new Error(output);
  return checks;
}

// The viewer outlives this script by design, so the test stops its own server through the owner's secret.
async function stopServer() {
  const { secret } = JSON.parse(await readFile(path.join(viewerDirectory(artifactRoot), "server.json"), "utf8"));
  await new Promise((resolve, reject) => {
    const call = http.request({ host: "127.0.0.1", port, method: "POST", path: "/shutdown", headers: { "Content-Type": "application/json" } }, (response) => { response.resume(); response.on("end", resolve); });
    call.on("error", reject);
    call.end(JSON.stringify({ secret }));
  });
}

try {
  const repository = path.join(root, "Acme");
  await mkdir(repository);
  execFileSync("git", ["init", "-q", "--initial-branch=ACM-123"], { cwd: repository });
  const source = path.join(root, "plan.md");
  const original = "# ACM-123: Pagination\n\n## Overview\nPreserve the current response format.\n\n" +
    "```mermaid\nflowchart LR\n  api[API] --> store[(Store)]\n```\n\n" +
    "Not reviewed: this is a synthetic browser fixture, not a real model review.\n\n" +
    "## Implementation\n1. Validate the cursor.\n2. Read one page, as [the guide](https://example.com/guide) says.\n\n" +
    "## Data flow\n```mermaid\nflowchart LR\n  cursor[Cursor] --> page[Page]\n```\n\n" +
    "## Plan review\n| # | Severity | Finding | Decision |\n|---|---|---|---|\n| 1 | blocker | Empty page test | Accept |\n\n" +
    "## Safety fixture\n<script>globalThis.presenterPwned = true</script>\n\n![remote](https://example.com/private.png)\n" +
    '\n## Network diagram fixture\n```mermaid\nflowchart LR\n  api@{ img: "https://example.com/tracker.png" }\n```\n';
  await writeFile(source, original);
  const otherSource = path.join(root, "other.md");
  await writeFile(otherSource, "# ACM-124: Export\n\n## Overview\nExport one page.\n");
  port = await freePort();
  const options = { source, repository, worktree: repository, artifactRoot, ticket: "ACM-123" };
  const plan = await renderPlan(options);
  opened.push(plan.session);
  const open = await openReview({ session: plan.session, port, listen: "loopback", noOpen: true });
  assert.equal(open.server, "started");
  const url = open.urls[0].url;
  const another = await renderPlan({ ...options, source: otherSource, ticket: "ACM-124" });
  opened.push(another.session);
  const second = await openReview({ session: another.session, port, listen: "loopback", noOpen: true });
  assert.equal(second.server, "reused");
  await playwright(["open", "about:blank"]);
  browserOpened = true;

  const poll = pollReview({ session: plan.session });
  const checks = await browserCode("browser_checks.js", { url });
  const feedback = await poll;
  assert.equal(feedback.event.type, "feedback");
  assert.equal(feedback.approval, false);
  const comments = feedback.event.comments;
  assert.deepEqual(comments.map((comment) => comment.target.kind), ["word", "box", "diagram", "text", "general"]);
  assert.equal(comments[1].target.label, "API");
  assert.equal(comments[3].target.quote.includes("Empty page test"), true);
  assert.ok(comments.slice(0, 4).every((comment) => comment.revision === 1 && comment.tab === "overview"));
  assert.equal(comments[4].text, "Say how this ships.");
  assert.equal(comments[4].tab, null);
  assert.deepEqual(comments[4].headings, []);
  assert.deepEqual(comments[3].headings, ["ACM-123: Pagination", "Plan review"]);

  const reply = path.join(plan.session, "reply.json");
  await writeFile(reply, JSON.stringify({
    batch: feedback.event.seq, message: "Updated the overview.",
    answers: comments.map((comment, index) => ({ id: comment.id, outcome: index % 2 ? "kept" : "changed", text: index % 2 ? "The plan already covers it." : "Added to revision 2." })),
  }));
  await writeFile(source, original.replace("format.", "format and its headers.").replace("cursor[Cursor] --> page[Page]", "cursor[Cursor] --> page[Page] --> next[Next cursor]") +
    "\n## Revision check\nThe second revision preserves the response contract.\n");
  const updated = await renderPlan({ ...options, session: plan.session });
  assert.equal(updated.revision, 2);
  assert.deepEqual((await replyReview({ session: plan.session, replyFile: reply })).pending, []);

  const approval = pollReview({ session: plan.session });
  const finalChecks = await browserCode("browser_finish.js", { revision: 2, otherUrl: second.urls[0].url });
  const approved = await approval;
  assert.equal(approved.event.type, "approval");
  assert.equal(approved.approval, true);
  assert.equal(approved.event.revision, 2);
  assert.equal(approved.event.sourceDigest, updated.sourceDigest);

  await endReview({ session: plan.session });
  assert.equal((await health({ port, listen: "loopback" })).openSessions, 1, "Ending one review closed the other.");
  assert.equal(execFileSync("git", ["status", "--porcelain"], { cwd: repository, encoding: "utf8" }), "");
  console.log(checks);
  console.log(finalChecks);
  console.log("PASS: comment targets, batch send, answers on live reload, theme memory across reviews, Approve, and a second review kept open.");
  passed = true;
} finally {
  if (browserOpened) await playwright(["close"]).catch((error) => console.error(`Browser cleanup: ${error.message}`));
  for (const session of opened) await endReview({ session }).catch((error) => console.error(`Owned-session cleanup: ${error.message}`));
  if (port) await stopServer().catch((error) => console.error(`Server cleanup: ${error.message}`));
  if (passed) await rm(root, { recursive: true, force: true });
  else console.error(`Browser evidence retained at ${root}`);
}
