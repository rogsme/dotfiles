import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { renderPlan } from "../scripts/render_plan.mjs";
import { checkServer, runLavish } from "../scripts/lavish.mjs";

const execute = promisify(execFile);
const runtime = process.env.PRESENT_PLAN_RUNTIME;
if (!runtime) throw new Error("Set PRESENT_PLAN_RUNTIME to the private prepared runtime.");
const root = await mkdtemp(path.join(os.tmpdir(), "present-plan-browser-"));
const browser = `present-plan-${process.pid}`;
const opened = [];
let browserOpened = false;
let passed = false;

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function playwright(args) {
  const result = await execute("playwright-cli", [`-s=${browser}`, ...args], { cwd: root, timeout: 90_000, maxBuffer: 2_097_152 });
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

try {
  const repository = path.join(root, "Acme");
  await mkdir(repository);
  execFileSync("git", ["init", "-q", "--initial-branch=ACM-123"], { cwd: repository });
  const source = path.join(root, "plan.md");
  const original = "# ACM-123: Pagination\n\n## Overview\nPreserve the current response format.\n\n" +
    "```mermaid\nflowchart LR\n  api[API] --> store[(Store)]\n```\n\n" +
    "Not reviewed: this is a synthetic browser fixture, not a real model review.\n\n" +
    "## Implementation\n1. Validate the cursor.\n2. Read one page.\n\n" +
    "## Data flow\n```mermaid\nflowchart LR\n  cursor[Cursor] --> page[Page]\n```\n\n" +
    "## Plan review\n| # | Severity | Finding | Decision |\n|---|---|---|---|\n| 1 | blocker | Empty page test | Accept |\n\n" +
    "## Safety fixture\n<script>globalThis.presenterPwned = true</script>\n\n![remote](https://example.com/private.png)\n";
  const networkDiagram = '\n## Network diagram fixture\n```mermaid\nflowchart LR\n  api@{ img: "https://example.com/tracker.png" }\n```\n';
  await writeFile(source, original + networkDiagram);
  const options = { source, repository, worktree: repository, runtime, artifactRoot: path.join(root, "plans"), stateDir: path.join(root, "state"), port: await freePort(), ticket: "ACM-123" };
  const plan = await renderPlan(options);
  opened.push(plan.session);
  const open = await runLavish("open", { session: plan.session, noOpen: true });
  assert.equal(open.complete, true);
  const raw = await readFile(open.raw, "utf8");
  const url = raw.match(/http:\/\/127\.0\.0\.1:\d+\/session\/[^\s"<>]+/)?.[0];
  assert.ok(url, `Open did not return a session URL: ${raw}`);
  const another = await renderPlan({ ...options, ticket: "ACM-124" });
  opened.push(another.session);
  assert.equal((await runLavish("open", { session: another.session, noOpen: true })).complete, true);
  await playwright(["open", "about:blank"]);
  browserOpened = true;
  const poll = runLavish("poll", { session: plan.session });
  const checks = await browserCode("browser_checks.js", { url });
  const feedback = await poll;
  assert.equal(feedback.complete, true);
  assert.equal(feedback.approval, false);
  const feedbackText = await readFile(feedback.raw, "utf8");
  assert.match(feedbackText, /Keep the response format stable/);
  assert.match(feedbackText, /Split the API box/);
  assert.match(feedbackText, /mermaid-node/);
  const reply = path.join(plan.session, "reply.md");
  await writeFile(reply, "Recorded the compatibility constraint and diagram feedback. Waiting for approval in the conversation.\n");
  assert.equal((await runLavish("reply", { session: plan.session, replyFile: reply })).complete, true);
  await writeFile(source, original + networkDiagram + "\n## Revision check\nThe second revision preserves the response contract.\n");
  const updated = await renderPlan({ ...options, session: plan.session });
  assert.equal(updated.revision, 2);
  const finalPoll = runLavish("poll", { session: plan.session });
  const finalChecks = await browserCode("browser_finish.js", { revision: 2 });
  const ended = await finalPoll;
  assert.equal(ended.complete, true);
  assert.equal(ended.approval, false);
  assert.match(await readFile(ended.raw, "utf8"), /session_ended: true/);
  assert.ok(await checkServer(options), "Ending one review stopped the other review's server.");
  assert.equal(execFileSync("git", ["status", "--porcelain"], { cwd: repository, encoding: "utf8" }), "");
  console.log(checks);
  console.log(finalChecks);
  console.log("PASS: real Lavish annotation, Overview and Full plan tabs, diagram box note, local assets, responsive layout, revision reload, and non-approval end; another session stayed available.");
  passed = true;
} finally {
  if (browserOpened) await playwright(["close"]).catch((error) => console.error(`Browser cleanup: ${error.message}`));
  for (const session of opened) await runLavish("end", { session }).catch((error) => console.error(`Owned-session cleanup: ${error.message}`));
  if (passed) await rm(root, { recursive: true, force: true });
  else console.error(`Browser evidence retained at ${root}`);
}
