import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

// The page script, run as the browser runs it, with no DOM.
const context = vm.createContext({});
vm.runInContext(await readFile(new URL("../assets/attention.js", import.meta.url), "utf8"), context);
const { decide } = context.PlanAttention;
const plain = (value) => JSON.parse(JSON.stringify(value));
const away = { revision: 3, focused: false, visibility: "hidden", permission: "granted" };

test("the first load stores the revision and alerts nothing", () => {
  assert.deepEqual(plain(decide({ ...away, seen: null })), { mark: false, notify: false, store: 3 });
  assert.deepEqual(plain(decide({ ...away, seen: Number.NaN })), { mark: false, notify: false, store: 3 });
});

test("a new revision in a hidden tab marks the title and notifies when allowed", () => {
  assert.deepEqual(plain(decide({ ...away, seen: 2 })), { mark: true, notify: true, store: null });
  assert.deepEqual(plain(decide({ ...away, seen: 2, permission: "default" })), { mark: true, notify: false, store: null });
  assert.deepEqual(plain(decide({ ...away, seen: 2, permission: "unsupported" })), { mark: true, notify: false, store: null });
});

test("a visible tab without focus gets the title mark only", () => {
  assert.deepEqual(plain(decide({ ...away, seen: 2, visibility: "visible" })), { mark: true, notify: false, store: null });
});

test("a focused tab acknowledges the new revision at once", () => {
  assert.deepEqual(plain(decide({ ...away, seen: 2, focused: true, visibility: "visible" })), { mark: false, notify: false, store: 3 });
});

test("a revision already seen alerts nothing and stores nothing", () => {
  assert.deepEqual(plain(decide({ ...away, seen: 3 })), { mark: false, notify: false, store: null });
  assert.deepEqual(plain(decide({ ...away, seen: 4 })), { mark: false, notify: false, store: null });
});
