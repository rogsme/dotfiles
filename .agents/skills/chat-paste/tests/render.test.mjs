import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, stat, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { readJSON } from "../scripts/common.mjs";
import { renderMessage } from "../scripts/render_message.mjs";

const skill = fileURLToPath(new URL("..", import.meta.url));

async function workspace(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "chat-paste-render-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const artifactRoot = path.join(root, "artifacts");
  const source = path.join(root, "message.md");
  const render = async (text, options = {}) => {
    await writeFile(source, text);
    return renderMessage({ source, name: "eod-test", artifactRoot, ...options });
  };
  return { root, artifactRoot, source, render };
}

const dataOf = (html) => JSON.parse(html.match(/<script type="application\/json" id="chat-paste-data">(.*?)<\/script>/s)[1]);

test("the message is formatted on the server and its copy data travels with it", async (t) => {
  const { render } = await workspace(t);
  const result = await render("## Update\n* Ready 🙂\n  * Child");
  const html = await readFile(result.html, "utf8");
  assert.match(html, /<article aria-label="Formatted message"><p style="margin:0"><strong>Update<\/strong><\/p><ul><li>Ready 🙂<ul><li>Child<\/li><\/ul><\/li><\/ul><\/article>/);
  const data = dataOf(html);
  assert.equal(data.destination, "both");
  assert.equal(data.plain, "Update\n• Ready 🙂\n  • Child");
  assert.equal(data.delta.ops.at(-1).attributes.indent, 1);
  assert.doesNotMatch(html, /<script[^>]+src="https?:/);
  assert.equal((await stat(result.html)).mode & 0o777, 0o600);
  assert.equal((await stat(result.session)).mode & 0o777, 0o700);
});

test("content policy is not inferred: supplied notes and reminders stay", async (t) => {
  const { render } = await workspace(t);
  const body = "PLAIN CAPS\n\n## Internal notes\nINTENTIONAL_NOTES\n\nBefore you send:\nCheck the links.";
  const result = await render(body);
  assert.equal(await readFile(result.source, "utf8"), body);
  const data = dataOf(await readFile(result.html, "utf8"));
  assert.match(data.plain, /INTENTIONAL_NOTES/);
  assert.match(data.plain, /Before you send:\nCheck the links\./);
  assert.match(data.plain, /^PLAIN CAPS\n/);
});

test("titles and message text cannot break out of the page", async (t) => {
  const { render } = await workspace(t);
  const title = "</script><img src=x onerror=alert(1)>{{CONTENT}}";
  const result = await render("Ordinary `</script><b>` message", { title, destination: "teams" });
  const html = await readFile(result.html, "utf8");
  assert.equal(dataOf(html).title, title);
  assert.equal(dataOf(html).destination, "teams");
  assert.doesNotMatch(html, /<img src=x/);
  assert.doesNotMatch(html, /<b>/);
  assert.equal(html.match(/<\/script>/g).length, 5);
  assert.match(html, /<title>&lt;\/script&gt;&lt;img src=x onerror=alert\(1\)&gt;\{\{CONTENT\}\} \| Chat paste<\/title>/);
});

test("unsupported content fails before anything is written", async (t) => {
  const { render, artifactRoot } = await workspace(t);
  await assert.rejects(render("![image](https://example.com/image.png)"), /Unsupported/);
  await assert.rejects(render("<b>raw</b>"), /Unsupported/);
  await assert.rejects(stat(artifactRoot), { code: "ENOENT" });
  await assert.rejects(render("Message", { destination: "email" }), /Destination/);
  await assert.rejects(render("Message", { name: "" }), /short name/);
});

test("a revision follows only a change in the message", async (t) => {
  const { render } = await workspace(t);
  const first = await render("First message");
  assert.equal(first.revision, 1);
  const same = await render("First message", { session: first.session });
  assert.equal(same.revision, 1);
  const second = await render("Revised message", { session: first.session });
  assert.equal(second.revision, 2);
  assert.equal(second.session, first.session);
  assert.deepEqual((await readdir(first.session)).filter((name) => name.startsWith("revision-")).sort(), ["revision-0001.json", "revision-0001.md", "revision-0002.json", "revision-0002.md"]);
  assert.equal(await readFile(path.join(first.session, "revision-0001.md"), "utf8"), "First message");
  const manifest = await readJSON(path.join(first.session, "session.json"));
  assert.equal(manifest.token.length >= 32, true);
  assert.doesNotMatch(await readFile(path.join(first.session, "revision-0002.json"), "utf8"), /token/);
  await assert.rejects(render("Other", { session: first.session, name: "another-name" }), /name or artifact root changed/);
});

test("a modified message file stops the next render", async (t) => {
  const { render } = await workspace(t);
  const first = await render("First message");
  await writeFile(first.html, "edited by hand");
  await assert.rejects(render("Second", { session: first.session }), /modified outside the renderer/);
  assert.equal(await readFile(first.html, "utf8"), "edited by hand");
});

test("symlinks in the artifact path are refused", async (t) => {
  const { root, render } = await workspace(t);
  const real = path.join(root, "real");
  await mkdir(real);
  await symlink(real, path.join(root, "linked"), "dir");
  await assert.rejects(render("Message", { artifactRoot: path.join(root, "linked", "artifacts") }), /symlink/);
});

test("the skill runs from a copied folder with only its own files", async (t) => {
  const { root } = await workspace(t);
  const isolated = path.join(root, "chat-paste");
  for (const name of ["scripts", "assets"]) await cp(path.join(skill, name), path.join(isolated, name), { recursive: true });
  const source = path.join(root, "message.md");
  await writeFile(source, "## Internal notes\nKeep this supplied section.");
  const output = execFileSync(process.execPath, [path.join(isolated, "scripts", "render_message.mjs"), "--source", source, "--name", "isolated", "--artifacts", path.join(root, "artifacts")], { encoding: "utf8", env: { ...process.env, HOME: root } });
  const result = JSON.parse(output);
  assert.match(await readFile(result.html, "utf8"), /Keep this supplied section\./);
});
