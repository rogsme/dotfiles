import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const skill = fileURLToPath(new URL("..", import.meta.url));
const script = path.join(skill, "scripts", "sessions.mjs");
const cleanEnv = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_")));

function git(directory, ...args) {
  execFileSync("git", ["-C", directory, ...args], { stdio: "ignore", env: cleanEnv });
}

function slug(directory) {
  return directory.replace(/[^a-zA-Z0-9]/g, "-");
}

function setup(t) {
  const base = realpathSync(mkdtempSync(path.join(os.tmpdir(), "retro-test-")));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const main = path.join(base, "repo");
  mkdirSync(main);
  git(main, "init", "-q", "-b", "main");
  git(main, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-q", "--allow-empty", "-m", "start");
  const worktree = path.join(base, "worktrees", "ACM-1");
  git(main, "worktree", "add", "-q", "-b", "ACM-1", worktree);
  const bin = path.join(base, "bin");
  mkdirSync(bin);
  const fixture = { base, main, worktree, bin, config: path.join(base, "claude"), tmp: path.join(base, "tmp"), out: path.join(base, "opencode") };
  mkdirSync(fixture.tmp);
  mkdirSync(fixture.out);
  return fixture;
}

function claudeRecord(cwd, timestamp, type, content, extra = {}) {
  return { type, cwd, timestamp, gitBranch: "ACM-1", sessionId: "s", message: { role: type, content }, ...extra };
}

function writeTranscript(fixture, folderFor, name, records) {
  const folder = path.join(fixture.config, "projects", slug(folderFor));
  mkdirSync(folder, { recursive: true });
  writeFileSync(path.join(folder, `${name}.jsonl`), records.map((record) => JSON.stringify(record)).join("\n"));
}

function plainSession(cwd, timestamp, words) {
  return [claudeRecord(cwd, timestamp, "user", words), claudeRecord(cwd, timestamp, "assistant", [{ type: "text", text: `Answer to ${words}` }])];
}

// The stand-in serves canned JSON, so the tests run without OpenCode. Like the real CLI, it exits 0 after writing only part of its output to anything but a file.
function fakeOpencode(fixture, { list = [], exports = {}, fail = false }) {
  writeFileSync(path.join(fixture.out, "list.json"), JSON.stringify(list));
  for (const [id, data] of Object.entries(exports)) writeFileSync(path.join(fixture.out, `${id}.json`), JSON.stringify(data));
  const body = fail
    ? `process.stderr.write("service is down\\n"); process.exit(1);`
    : `const fs = require("fs"); const [command, id] = process.argv.slice(3); const data = fs.readFileSync(require("path").join(${JSON.stringify(fixture.out)}, command === "list" ? "list.json" : id + ".json")); fs.writeSync(1, fs.fstatSync(1).isFile() ? data : data.subarray(0, data.length / 2));`;
  const file = path.join(fixture.bin, "opencode");
  writeFileSync(file, `#!${process.execPath}\n${body}\n`);
  chmodSync(file, 0o755);
}

function run(fixture, directory) {
  const env = { ...cleanEnv, CLAUDE_CONFIG_DIR: fixture.config, TMPDIR: fixture.tmp, PATH: `${fixture.bin}:${path.dirname(execFileSync("which", ["git"], { encoding: "utf8" }).trim())}` };
  const result = spawnSync(process.execPath, [script, "--dir", directory], { encoding: "utf8", env });
  assert.equal(result.status, 0, result.stderr);
  const digests = result.stdout.match(/^Digests: (.+)$/m)[1];
  const files = readdirSync(digests).sort();
  return { stdout: result.stdout, digests, files, read: (index) => readFileSync(path.join(digests, files[index]), "utf8") };
}

test("sessions from both harnesses merge oldest first", (t) => {
  const fixture = setup(t);
  writeTranscript(fixture, fixture.worktree, "first", plainSession(fixture.worktree, "2026-01-01T10:00:00.000Z", "plan the ticket"));
  writeTranscript(fixture, fixture.worktree, "third", plainSession(fixture.worktree, "2026-01-03T10:00:00.000Z", "address the review"));
  fakeOpencode(fixture, {
    list: [{ id: "ses_a", directory: fixture.worktree, created: Date.parse("2026-01-02T10:00:00.000Z"), updated: Date.parse("2026-01-02T11:00:00.000Z") }],
    exports: { ses_a: { messages: [{ type: "user", text: "review the pull request" }, { type: "assistant", content: [{ type: "text", text: "Reviewed." }] }] } },
  });
  const { stdout, files } = run(fixture, fixture.worktree);
  assert.deepEqual(files, ["01-claude-code.md", "02-opencode.md", "03-claude-code.md"]);
  assert.match(stdout, /^Sessions: 3,/m);
  assert.ok(stdout.indexOf("plan the ticket") < stdout.indexOf("review the pull request"));
  assert.ok(stdout.indexOf("review the pull request") < stdout.indexOf("address the review"));
});

test("a session started in a subdirectory counts, and folders that only look alike do not", (t) => {
  const fixture = setup(t);
  writeTranscript(fixture, path.join(fixture.worktree, "backend"), "below", plainSession(path.join(fixture.worktree, "backend"), "2026-01-01T10:00:00.000Z", "started below the root"));
  writeTranscript(fixture, `${fixture.worktree}2`, "longer", plainSession(`${fixture.worktree}2`, "2026-01-01T10:00:00.000Z", "another ticket, ACM-12"));
  writeTranscript(fixture, `${fixture.worktree}-other`, "prefix", plainSession(`${fixture.worktree}-other`, "2026-01-01T10:00:00.000Z", "another ticket, same prefix"));
  // Two paths can share a folder name, because the encoding is lossy.
  writeTranscript(fixture, fixture.worktree, "collision", plainSession(path.join(path.dirname(fixture.worktree), "ACM/1"), "2026-01-01T10:00:00.000Z", "a colliding path"));
  fakeOpencode(fixture, { list: [{ id: "ses_b", directory: `${fixture.worktree}2`, created: 1, updated: 2 }] });
  const { stdout, files } = run(fixture, fixture.worktree);
  assert.deepEqual(files, ["01-claude-code.md"]);
  assert.match(stdout, /started below the root/);
  assert.doesNotMatch(stdout, /another ticket|colliding/);
});

test("a nested worktree keeps its own sessions", (t) => {
  const fixture = setup(t);
  const nested = path.join(fixture.main, "nested");
  git(fixture.main, "worktree", "add", "-q", "-b", "nested", nested);
  writeTranscript(fixture, fixture.main, "own", plainSession(fixture.main, "2026-01-01T10:00:00.000Z", "in the main checkout"));
  writeTranscript(fixture, nested, "theirs", plainSession(nested, "2026-01-01T10:00:00.000Z", "in the nested worktree"));
  const { stdout } = run(fixture, fixture.main);
  assert.match(stdout, /in the main checkout/);
  assert.doesNotMatch(stdout, /in the nested worktree/);
});

test("the scope tells a linked worktree, a main checkout and a plain directory apart", (t) => {
  const fixture = setup(t);
  const plain = path.join(fixture.base, "plain");
  mkdirSync(plain);
  mkdirSync(path.join(fixture.worktree, "backend"));
  assert.match(run(fixture, fixture.worktree).stdout, /^Scope: linked worktree$/m);
  assert.match(run(fixture, fixture.main).stdout, /^Scope: main checkout$/m);
  assert.match(run(fixture, plain).stdout, /^Scope: directory$/m);
  assert.ok(run(fixture, path.join(fixture.worktree, "backend")).stdout.includes(`Root: ${fixture.worktree}\n`));
});

test("the digest keeps the conversation, tool calls and failures, and drops the rest", (t) => {
  const fixture = setup(t);
  const cwd = fixture.worktree;
  const at = "2026-01-01T10:00:00.000Z";
  writeTranscript(fixture, cwd, "one", [
    claudeRecord(cwd, at, "user", "<command-name>/retro</command-name>\n<command-message>retro</command-message>\n<command-args>last 3</command-args>"),
    claudeRecord(cwd, at, "user", "the injected skill body", { isMeta: true }),
    claudeRecord(cwd, at, "user", "<system-reminder>a reminder</system-reminder>\nfix the bug"),
    claudeRecord(cwd, at, "assistant", [
      { type: "thinking", thinking: "a private thought" },
      { type: "text", text: "Looking into it." },
      { type: "tool_use", id: "t1", name: "Bash", input: { command: "just check" } },
      { type: "tool_use", id: "t2", name: "Read", input: { file_path: "missing.txt" } },
    ]),
    claudeRecord(cwd, at, "user", [
      { type: "tool_result", tool_use_id: "t1", content: "all checks passed" },
      { type: "tool_result", tool_use_id: "t2", is_error: true, content: "File does not exist" },
    ]),
    claudeRecord(cwd, at, "assistant", [{ type: "text", text: "A subagent's words" }], { isSidechain: true }),
    claudeRecord(cwd, at, "user", "a long summary of the session", { isCompactSummary: true }),
  ]);
  const digest = run(fixture, cwd).read(0);
  for (const kept of ["/retro last 3", "fix the bug", "Looking into it.", "- Bash: just check", "- Read FAILED: File does not exist", "(context compacted here)"]) assert.ok(digest.includes(kept), kept);
  for (const dropped of ["a private thought", "all checks passed", "injected skill body", "a reminder", "A subagent's words", "a long summary"]) assert.ok(!digest.includes(dropped), dropped);
});

test("the digest reads OpenCode failures and compactions", (t) => {
  const fixture = setup(t);
  fakeOpencode(fixture, {
    list: [{ id: "ses_c", directory: fixture.worktree, created: 1000, updated: 2000 }],
    exports: { ses_c: { messages: [
      { type: "user", text: "read the file" },
      { type: "assistant", content: [
        { type: "reasoning", text: "a private thought" },
        { type: "tool", name: "bash", state: { status: "completed", input: { command: "just check" }, content: [{ type: "text", text: "all checks passed" }] } },
        { type: "tool", name: "read", state: { status: "error", input: { path: "missing.txt" }, error: { message: "File not found" } } },
      ] },
      { type: "compaction", summary: "a long summary" },
      { type: "synthetic", text: "a background job finished" },
    ] } },
  });
  const digest = run(fixture, fixture.worktree).read(0);
  for (const kept of ["read the file", "- bash: just check", "- read FAILED: File not found", "(context compacted here)"]) assert.ok(digest.includes(kept), kept);
  for (const dropped of ["a private thought", "all checks passed", "a long summary", "a background job"]) assert.ok(!digest.includes(dropped), dropped);
});

test("a missing OpenCode is fine, and a failing one warns", (t) => {
  const fixture = setup(t);
  assert.doesNotMatch(run(fixture, fixture.worktree).stdout, /Warning/);
  fakeOpencode(fixture, { fail: true });
  assert.match(run(fixture, fixture.worktree).stdout, /^Warning: Could not list OpenCode sessions.*service is down/m);
});

test("one export that fails warns and keeps the others", (t) => {
  const fixture = setup(t);
  fakeOpencode(fixture, {
    list: [{ id: "ses_ok", directory: fixture.worktree, created: 1000, updated: 2000 }, { id: "ses_gone", directory: fixture.worktree, created: 3000, updated: 4000 }],
    exports: { ses_ok: { messages: [{ type: "user", text: "still here" }] } },
  });
  const { stdout, files } = run(fixture, fixture.worktree);
  assert.equal(files.length, 1);
  assert.match(stdout, /still here/);
  assert.match(stdout, /^Warning: Could not export OpenCode session ses_gone/m);
});

test("an unrecognized transcript warns, and an empty session does not", (t) => {
  const fixture = setup(t);
  writeTranscript(fixture, fixture.worktree, "strange", [{ kind: "turn", cwd: fixture.worktree, words: "a future format" }]);
  const unrecognized = run(fixture, fixture.worktree).stdout;
  assert.match(unrecognized, /^Warning: No messages recognized in .*strange\.jsonl/m);
  assert.match(unrecognized, /First message: \(none\)/);
  const quiet = setup(t);
  writeTranscript(quiet, quiet.worktree, "abandoned", [claudeRecord(quiet.worktree, "2026-01-01T10:00:00.000Z", "user", "injected", { isMeta: true })]);
  assert.doesNotMatch(run(quiet, quiet.worktree).stdout, /Warning/);
});

test("digests stay private to the user", (t) => {
  const fixture = setup(t);
  writeTranscript(fixture, fixture.worktree, "one", plainSession(fixture.worktree, "2026-01-01T10:00:00.000Z", "a secret"));
  const { digests, files } = run(fixture, fixture.worktree);
  assert.equal(statSync(digests).mode & 0o777, 0o700);
  assert.equal(statSync(path.join(digests, files[0])).mode & 0o777, 0o600);
});

test("the script runs through a symlink to the skill folder", (t) => {
  const fixture = setup(t);
  const link = path.join(fixture.base, "retro");
  symlinkSync(skill, link, "dir");
  assert.match(execFileSync(process.execPath, [path.join(link, "scripts", "sessions.mjs"), "--help"], { encoding: "utf8" }), /^node sessions\.mjs /);
});

test("a directory that does not exist stops with an error", (t) => {
  const fixture = setup(t);
  const result = spawnSync(process.execPath, [script, "--dir", path.join(fixture.base, "gone")], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /^Not a directory: /);
});

test("a shell call that exits nonzero keeps its exit code and bounded output, and a passing one keeps none", (t) => {
  const fixture = setup(t);
  fakeOpencode(fixture, {
    list: [{ id: "ses_exit", directory: fixture.worktree, created: 1000, updated: 2000 }],
    exports: { ses_exit: { messages: [{ type: "assistant", content: [
      { type: "tool", name: "shell", state: { status: "completed", input: { command: "pytest regression" }, metadata: { exit: 1 }, content: [{ type: "text", text: `expected red assertion\n${"x".repeat(900)}\nunbounded tail` }, { type: "image", data: "private-image-data" }] } },
      { type: "tool", name: "shell", state: { status: "completed", input: { command: "missing-binary" }, metadata: { exit: 127 }, content: [] } },
      { type: "tool", name: "shell", state: { status: "completed", input: { command: "pytest regression" }, metadata: { exit: 0 }, content: [{ type: "text", text: "successful output stays private" }] } },
    ] }] } },
  });
  const digest = run(fixture, fixture.worktree).read(0);
  assert.match(digest, /shell FAILED: exit 1: expected red assertion/);
  assert.match(digest, /shell FAILED: exit 127/);
  assert.doesNotMatch(digest, /unbounded tail|private-image-data|successful output stays private/);
  assert.ok(digest.split("\n").filter((line) => line.includes(" FAILED:")).every((line) => line.length < 650));
});
