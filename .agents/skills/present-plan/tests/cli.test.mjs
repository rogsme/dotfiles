import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const skill = fileURLToPath(new URL("..", import.meta.url));

test("both scripts run when the skill is installed through a symlink", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "present-plan-link-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const link = path.join(directory, "present-plan");
  await symlink(skill, link, "dir");
  for (const [script, usage] of [["lavish.mjs", /^node lavish\.mjs check /], ["render_plan.mjs", /^node render_plan\.mjs --source /]]) {
    assert.match(execFileSync(process.execPath, [path.join(link, "scripts", script), "--help"], { encoding: "utf8" }), usage);
  }
});
