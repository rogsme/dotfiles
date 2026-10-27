import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

// The page script, run as the browser runs it, with no DOM.
const context = vm.createContext({});
vm.runInContext(await readFile(new URL("../assets/changes.js", import.meta.url), "utf8"), context);
const { align, wordDiff } = context.PlanChanges;
const plain = (value) => JSON.parse(JSON.stringify(value));
const blocks = (tab, ...texts) => texts.map((text) => ({ tab, tag: "p", text }));
const statuses = (oldBlocks, newBlocks) => plain(align(oldBlocks, newBlocks)).map((item) => item.status);
const spans = (before, after) => plain(wordDiff(before, after)).map(([start, end]) => after.slice(start, end));

test("unchanged blocks match themselves", () => {
  const page = blocks("full", "Validate the cursor.", "Read one page.");
  assert.deepEqual(plain(align(page, page)), [{ status: "same", from: 0 }, { status: "same", from: 1 }]);
});

test("a new block between matched ones is added", () => {
  const before = blocks("full", "Validate the cursor.", "Read one page.");
  const after = blocks("full", "Validate the cursor.", "Reject an expired cursor with HTTP 410.", "Read one page.");
  assert.deepEqual(plain(align(before, after)), [{ status: "same", from: 0 }, { status: "added", from: null }, { status: "same", from: 1 }]);
});

test("a similar block in the same gap is changed, a dissimilar one is added", () => {
  const before = blocks("full", "Intro.", "Read one page of fifty rows from the store.", "Outro.");
  const after = blocks("full", "Intro.", "Read one page of one hundred rows from the store.", "Write the audit log entry.", "Outro.");
  assert.deepEqual(plain(align(before, after)), [
    { status: "same", from: 0 }, { status: "changed", from: 1 }, { status: "added", from: null }, { status: "same", from: 2 },
  ]);
});

test("a block similar to one in another gap is not paired with it", () => {
  const before = blocks("full", "Read one page of fifty rows.", "Anchor.", "Tail.");
  const after = blocks("full", "Anchor.", "Read one page of sixty rows.", "Tail.");
  assert.deepEqual(statuses(before, after), ["same", "added", "same"]);
});

test("a block that moves within its tab is moved, not added", () => {
  const before = blocks("full", "One.", "Two.", "Three.", "Four.");
  const after = blocks("full", "One.", "Three.", "Four.", "Two.");
  assert.deepEqual(plain(align(before, after)), [
    { status: "same", from: 0 }, { status: "same", from: 2 }, { status: "same", from: 3 }, { status: "moved", from: 1 },
  ]);
});

test("each tab aligns on its own", () => {
  const before = [...blocks("overview", "Keep the cursor."), ...blocks("full", "Ship on Friday.")];
  const after = [...blocks("overview", "Ship on Friday."), ...blocks("full", "Keep the cursor.")];
  assert.deepEqual(statuses(before, after), ["added", "added"]);
  const untitled = [{ tag: "h1", text: "ACM-123: Pagination" }];
  assert.deepEqual(statuses(untitled, [{ tab: null, tag: "h1", text: "ACM-123: Pagination" }]), ["same"]);
});

test("a word diff marks only the new words, joining neighbors", () => {
  assert.deepEqual(spans("Read one page of fifty rows.", "Read one page of one hundred rows."), ["one hundred"]);
  assert.deepEqual(spans("Keep the format.", "Keep the JSON format, and the headers."), ["JSON", ", and the headers"]);
  assert.deepEqual(spans("Same text.", "Same text."), []);
  assert.deepEqual(spans("Drop this word here.", "Drop this here."), []);
  assert.deepEqual(spans("", "All new."), ["All new."]);
});
