import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { VERSIONS } from "../scripts/common.mjs";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const start = await readFile(path.join(root, "lifecycle/start-ticket/SKILL.md"), "utf8");
const preflight = start.match(/```sh\n(sh -c '[\s\S]*?')\n```/)[1];

async function configuration(t, { review = false, presentation, heading = true } = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "presentation-config-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  execFileSync("git", ["init", "-q"], { cwd: directory });
  await mkdir(path.join(directory, "docs/agents"), { recursive: true });
  const documents = {
    "issue-tracker": "## Tracker\n## Operating rules\n## Operations\n### resolve\n### load\n### list-in-flight\n## States\n",
    forge: "## Forge\n",
    domain: "## Glossary\n## ADRs\n## Consumer rules\n## Recording decisions\n",
    workflow: "## Features\n| Feature | State |\n|---|---|\n" +
      `| Plan review | ${review ? "on" : "off"} |\n` +
      (presentation === undefined ? "" : `| Plan presentation | ${presentation ? "on" : "off"} |\n`) +
      "## Worktrees\n## Verification\n## Project rules\n" +
      (review ? "## Plan review\n" : "") +
      (presentation && heading ? "## Plan presentation\n" : ""),
  };
  for (const [id, content] of Object.entries(documents)) await writeFile(path.join(directory, `docs/agents/${id}.md`), `<!-- rogs-skills config v1: ${id} -->\n${content}`);
  return execFileSync("sh", ["-c", preflight], { cwd: directory, encoding: "utf8" });
}

test("an older v1 configuration without the feature still passes", async (t) => {
  assert.equal(await configuration(t), "");
});

for (const review of [false, true]) for (const presentation of [false, true]) {
  test(`preflight: review=${review}, presentation=${presentation}`, async (t) => {
    assert.equal(await configuration(t, { review, presentation }), "");
  });
}

test("only enabled presentation requires its heading", async (t) => {
  assert.match(await configuration(t, { presentation: true, heading: false }), /workflow\.md: ## Plan presentation/);
  assert.equal(await configuration(t, { presentation: false, heading: false }), "");
});

test("preflight helper functions remain identical across the lifecycle", async () => {
  const names = ["create-ticket", "start-ticket", "work-ticket", "review-pr", "address-pr-review", "finish-ticket"];
  const helpers = await Promise.all(names.map(async (name) => {
    const text = await readFile(path.join(root, `lifecycle/${name}/SKILL.md`), "utf8");
    return text.slice(text.indexOf("need() {"), text.indexOf("need issue-tracker.md"));
  }));
  for (const helper of helpers) assert.equal(helper, helpers[0]);
});

test("lifecycle keeps review before presentation and approval outside browser state", async () => {
  const work = await readFile(path.join(root, "lifecycle/work-ticket/SKILL.md"), "utf8");
  assert.ok(start.indexOf('Skill tool with "review-plan"') < start.indexOf('Skill tool with "present-plan"'));
  assert.match(start, /one round per human-requested candidate/);
  assert.match(start, /Not presented: <reason>/);
  assert.match(start, /Status: AWAITING_APPROVAL/);
  assert.match(work, /delivery receipts are not approval/);
  assert.match(work, /Post the approved content.*never a temporary local link/);
});

test("recipes pin npx Lavish separately from the renderer packages", async () => {
  const reference = await readFile(new URL("../references/lavish.md", import.meta.url), "utf8");
  for (const [name, version] of Object.entries(VERSIONS)) assert.ok(reference.includes(`${name}@${version}`));
  const install = reference.match(/^npm install .+$/m)?.[0];
  assert.ok(install?.includes(`marked@${VERSIONS.marked}`));
  assert.doesNotMatch(install, /lavish-axi/);
  assert.match(reference, /npx --yes --ignore-scripts --package=lavish-axi@0\.1\.89 -- lavish-axi/);
});
