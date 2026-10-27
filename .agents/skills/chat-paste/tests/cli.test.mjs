import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const skill = fileURLToPath(new URL("..", import.meta.url));

test("every script runs when the skill is installed through a symlink", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "chat-paste-link-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const link = path.join(directory, "chat-paste");
  await symlink(skill, link, "dir");
  for (const [script, usage] of [["viewer.mjs", /^node viewer\.mjs check /], ["render_message.mjs", /^node render_message\.mjs --source /], ["server.mjs", /^node server\.mjs --root /]]) {
    assert.match(execFileSync(process.execPath, [path.join(link, "scripts", script), "--help"], { encoding: "utf8" }), usage);
  }
});
