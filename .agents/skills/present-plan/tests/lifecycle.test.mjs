import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { PINS } from "../scripts/common.mjs";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const start = await readFile(path.join(root, "lifecycle/start-ticket/SKILL.md"), "utf8");
const preflight = start.match(/```sh\n(sh -c '[\s\S]*?')\n```/)[1];

async function configuration(t, { review = false, presentation, heading = true } = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "presentation-config-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  execFileSync("git", ["init", "-q"], { cwd: directory });
  await mkdir(path.join(directory, "docs/agents"), { recursive: true });
  const documents = {
    "issue-tracker": "## Tracker\n## Operating rules\n## Operations\n### resolve\n### load\n### list-in-flight\n### comment\n### transition\n## States\n",
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
  const names = ["create-ticket", "suggest-tickets", "start-ticket", "work-ticket", "review-pr", "address-pr-review", "verify-pr", "finish-ticket"];
  const helpers = await Promise.all(names.map(async (name) => {
    const text = await readFile(path.join(root, `lifecycle/${name}/SKILL.md`), "utf8");
    const begin = text.indexOf("need() {");
    return text.slice(begin, text.indexOf("\nneed ", begin));
  }));
  for (const helper of helpers) assert.equal(helper, helpers[0]);
});

test("review-pr and finish-ticket define a clean merge of the base in the same words", async () => {
  const definition = async (name) => {
    const text = await readFile(path.join(root, `lifecycle/${name}/SKILL.md`), "utf8");
    const start = text.indexOf("a merge commit whose second parent is an ancestor of the base");
    const end = text.indexOf("through each merge's second parent.");
    assert.ok(start >= 0 && end > start, `${name} no longer defines a clean merge`);
    return text.slice(start, end).replace("; check each one yourself", "");
  };
  assert.equal(await definition("finish-ticket"), await definition("review-pr"));
});

test("each skill moves a ticket as soon as its new state is true", async () => {
  const read = (name) => readFile(path.join(root, `lifecycle/${name}/SKILL.md`), "utf8");
  const [work, finish] = await Promise.all([read("work-ticket"), read("finish-ticket")]);
  const before = (text, first, then) => {
    const a = text.indexOf(first), b = text.indexOf(then);
    assert.ok(a >= 0 && b > a, `"${first}" must come before "${then}"`);
  };
  before(start.slice(start.indexOf("## 2. ")), "to `in-progress`", "## 3. ");
  before(work, "`transition` every member from `in-progress` to `in-review`", "Post the handoff");
  before(finish, "`transition` every member from `in-review` to `done`", "wait with `post-merge-ci`");
});

test("start-ticket, work-ticket and address-pr-review share the blocked tickets section", async () => {
  const section = async (name) => {
    const text = await readFile(path.join(root, `lifecycle/${name}/SKILL.md`), "utf8");
    const begin = text.indexOf("\n## Blocked tickets\n");
    assert.ok(begin >= 0, `${name} has no blocked tickets section`);
    const end = text.indexOf("\n## ", begin + 1);
    return text.slice(begin, end < 0 ? undefined : end);
  };
  const [first, ...rest] = await Promise.all(["start-ticket", "work-ticket", "address-pr-review"].map(section));
  for (const other of rest) assert.equal(other, first);
});

test("every skill a runner starts follows workflow.md's autonomous runs section", async () => {
  for (const name of ["start-ticket", "work-ticket", "review-pr", "address-pr-review", "verify-pr", "finish-ticket"]) {
    const text = await readFile(path.join(root, `lifecycle/${name}/SKILL.md`), "utf8");
    assert.match(text, /^on "Autonomous runs" && has workflow\.md "## Autonomous runs"$/m, `${name} does not check the section`);
    const begin = text.indexOf("\n## Autonomous runs\n");
    assert.ok(begin >= 0, `${name} has no autonomous runs section`);
    assert.match(text.slice(begin), /whose request says "This run is autonomous"\. Follow `## Autonomous runs` in `workflow\.md`/, name);
  }
});

test("lifecycle keeps review before presentation and approves only the current revision", async () => {
  const work = await readFile(path.join(root, "lifecycle/work-ticket/SKILL.md"), "utf8");
  assert.ok(start.indexOf('Skill tool with "review-plan"') < start.indexOf('Skill tool with "present-plan"'));
  assert.ok(start.indexOf('Skill tool with "asd-ste100"') < start.indexOf("## 5. Review the plan"));
  assert.match(start, /`Today ~~~ After`/);
  assert.match(start, /one round per human-requested candidate/);
  assert.match(start, /Not presented: <reason>/);
  assert.match(start, /Status: AWAITING_APPROVAL/);
  assert.match(start, /print `Status: PLAN_APPROVED` on a line of its own before the work phase begins/);
  assert.match(start, /approval event with `"approval": true` for that exact revision and digest/);
  assert.match(work, /approval event with `"approval": true` for that revision and digest/);
  assert.match(work, /an approval of another revision are not approval/);
  assert.match(work, /Post the approved content.*never a temporary local link/);
});

test("the Approve dialog says what the lifecycle promises", async () => {
  const viewer = await readFile(new URL("../assets/viewer.js", import.meta.url), "utf8");
  assert.ok(viewer.includes("`Approve revision ${revision} and start work-ticket?`"));
  for (const text of [start, await readFile(new URL("../SKILL.md", import.meta.url), "utf8")]) assert.ok(text.includes('"Approve revision N and start work-ticket?"'));
});

test("the reference points at the pins, and every pin carries a SHA-384 hash", async () => {
  const reference = await readFile(new URL("../references/viewer.md", import.meta.url), "utf8");
  assert.match(reference, /`PINS` in `scripts\/common\.mjs`/);
  for (const pin of [PINS.marked, PINS.mermaid, ...PINS.fonts]) assert.match(pin.integrity, /^sha384-[A-Za-z0-9+/]{64}$/);
});
