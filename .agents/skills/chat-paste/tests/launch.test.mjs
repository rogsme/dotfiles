import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { displayEnv, launch } from "../scripts/launch.mjs";

const url = "http://127.0.0.1:1/r/id/";

// A stand-in for xdg-open, so no test opens a browser.
async function opener(t, script) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "launch-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, "opener");
  await writeFile(file, `#!/bin/sh\n${script}\n`, { mode: 0o700 });
  return { command: file, args: [url], directory };
}

test("an opener that exits 0 opened the browser", async (t) => {
  assert.deepEqual(await launch(url, await opener(t, "exit 0")), { opened: true });
});

test("an opener that fails reports its exit code", async (t) => {
  const result = await launch(url, await opener(t, "exit 3"));
  assert.equal(result.opened, false);
  assert.match(result.reason, /exited with code 3$/);
});

test("a missing opener reports why", async () => {
  const result = await launch(url, { command: "/nonexistent/opener", args: [url] });
  assert.equal(result.opened, false);
  assert.match(result.reason, /ENOENT/);
});

test("an opener still running after the wait counts as launched", async (t) => {
  const started = Date.now();
  assert.deepEqual(await launch(url, { ...(await opener(t, "sleep 2")), wait: 50 }), { opened: true });
  assert.ok(Date.now() - started < 1500, "launch did not wait for the opener to finish");
});

test("the opener gets the session's display when the environment has none", async (t) => {
  const stub = await opener(t, 'printf "%s|%s" "$DISPLAY" "$XAUTHORITY" > "$(dirname "$0")/seen"');
  const result = await launch(url, { ...stub, env: { PATH: process.env.PATH }, platform: "linux", readSession: async () => "DISPLAY=:0\nXAUTHORITY=/home/acme/.Xauthority\nLANG=C\n" });
  assert.deepEqual(result, { opened: true });
  assert.equal(await readFile(path.join(stub.directory, "seen"), "utf8"), ":0|/home/acme/.Xauthority");
});

test("displayEnv copies only the display variables", async () => {
  const env = await displayEnv({ PATH: "/bin" }, { platform: "linux", readSession: async () => "DISPLAY=:0\nWAYLAND_DISPLAY=wayland-1\nSECRET=x\n" });
  assert.deepEqual(env, { PATH: "/bin", DISPLAY: ":0", WAYLAND_DISPLAY: "wayland-1" });
});

test("displayEnv leaves a session that has a display alone", async () => {
  const session = async () => { throw new Error("read the session"); };
  const x11 = { DISPLAY: ":1" };
  const wayland = { WAYLAND_DISPLAY: "wayland-1" };
  assert.equal(await displayEnv(x11, { platform: "linux", readSession: session }), x11);
  assert.equal(await displayEnv(wayland, { platform: "linux", readSession: session }), wayland);
});

test("displayEnv reads the session only on Linux", async () => {
  const env = { PATH: "/bin" };
  assert.equal(await displayEnv(env, { platform: "darwin", readSession: async () => "DISPLAY=:0\n" }), env);
});

test("displayEnv keeps the environment when the session cannot be read", async () => {
  const env = { PATH: "/bin" };
  assert.deepEqual(await displayEnv(env, { platform: "linux", readSession: async () => { throw new Error("no systemd"); } }), env);
});
