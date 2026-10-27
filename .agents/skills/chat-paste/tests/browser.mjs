import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { serverFile } from "../scripts/common.mjs";
import { renderMessage } from "../scripts/render_message.mjs";
import { endMessage, openMessage, pollMessage, replyMessage } from "../scripts/viewer.mjs";

const execute = promisify(execFile);
const root = await mkdtemp(path.join(os.tmpdir(), "chat-paste-browser-"));
const browser = `chat-paste-${process.pid}`;
const artifactRoot = path.join(root, "messages");
let browserOpened = false;
let passed = false;
let session;
let port;

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const free = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return free;
}

async function playwright(args) {
  const result = await execute("playwright-cli", [`-s=${browser}`, ...args], { cwd: root, timeout: 180_000, maxBuffer: 2_097_152 });
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
  const { secret } = JSON.parse(await readFile(serverFile(artifactRoot, port), "utf8"));
  await new Promise((resolve, reject) => {
    const call = http.request({ host: "127.0.0.1", port, method: "POST", path: "/shutdown", headers: { "Content-Type": "application/json" } }, (response) => { response.resume(); response.on("end", resolve); });
    call.on("error", reject);
    call.end(JSON.stringify({ secret }));
  });
}

try {
  const original = await readFile(new URL("demo.md", import.meta.url), "utf8");
  const source = path.join(root, "message.md");
  await writeFile(source, original);
  port = await freePort();
  const options = { source, name: "browser-demo", artifactRoot, title: "Product update" };
  const message = await renderMessage(options);
  session = message.session;
  const open = await openMessage({ session, port, listen: "loopback", noOpen: true });
  assert.equal(open.server, "started");
  const url = open.urls[0].url;
  await playwright(["open", "about:blank"]);
  browserOpened = true;

  const poll = pollMessage({ session });
  const checks = await browserCode("browser_checks.js", { url });
  const feedback = await poll;
  assert.equal(feedback.event.type, "feedback");
  const comments = feedback.event.comments;
  assert.deepEqual(comments.map((comment) => comment.target.kind), ["word", "text", "general"]);
  assert.equal(comments[0].target.quote, "touches");
  // A bullet's context is its own text, never the bullets nested under it.
  assert.deepEqual([comments[0].target.prefix, comments[0].target.suffix], ["Small quality-of-life ", ":"]);
  assert.equal(comments[1].target.quote, "Finish testing the upload flow with the sample files.");
  assert.equal(comments[2].text, "Add what is next for tomorrow.");
  assert.ok(comments.every((comment) => comment.revision === 1));

  await writeFile(source, original.replace("with the sample files.", "with the sample and the large files.").replace("Busy day,", "* Write the release notes tomorrow.\n\nBusy day,"));
  const updated = await renderMessage({ ...options, session });
  assert.equal(updated.revision, 2);
  const reply = path.join(session, "reply.json");
  await writeFile(reply, JSON.stringify({
    batch: feedback.event.seq, message: "Updated the next steps.",
    answers: comments.map((comment, index) => ({ id: comment.id, outcome: index === 0 ? "kept" : "changed", text: index === 0 ? "The bullets under it name them." : "Added to revision 2." })),
  }));
  assert.deepEqual((await replyMessage({ session, replyFile: reply })).pending, []);

  const finished = pollMessage({ session });
  const finalChecks = await browserCode("browser_finish.js", { revision: 2 });
  const done = await finished;
  assert.equal(done.event.type, "done");
  assert.equal(done.done, true);
  assert.equal(done.event.sourceDigest, updated.sourceDigest);
  console.log(checks);
  console.log(finalChecks);
  console.log("PASS: real copy and paste for Slack, Teams and plain text, comments, answers on live reload, change marks, and Done.");
  passed = true;
} finally {
  if (browserOpened) await playwright(["close"]).catch((error) => console.error(`Browser cleanup: ${error.message}`));
  if (session) await endMessage({ session }).catch((error) => console.error(`Owned-session cleanup: ${error.message}`));
  if (port) await stopServer().catch((error) => console.error(`Server cleanup: ${error.message}`));
  if (passed) await rm(root, { recursive: true, force: true });
  else console.error(`Browser evidence retained at ${root}`);
}
