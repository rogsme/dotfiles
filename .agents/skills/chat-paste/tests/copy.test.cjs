const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { format } = require("../assets/formatter.js");

// Run the real button handlers with a deterministic clipboard-event double.
// Real browser clipboard round-trips remain in browser_checks.js and firefox.cjs.
function page(userAgent, { rejectHTML = false, copyResult = true, destination = "both" } = {}) {
  const input = "## Update 🚀\n* Parent\n  * Child\n    * Grandchild\n\n[Notes](https://example.com/notes)";
  const expected = format(input);
  const elements = new Map();
  const listeners = new Map();
  const clipboard = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      textContent: "", className: "", disabled: true, hidden: false,
      addEventListener(type, fn) { this[type] = fn; },
      focus() {}, select() {}, remove() {},
      setAttribute() {}, style: {},
    });
    return elements.get(id);
  }
  element("chat-paste-data").textContent = JSON.stringify({ title: "Test", destination, plain: expected.plain, html: expected.html, delta: expected.delta });
  const document = {
    getElementById: element,
    createElement: () => element("helper"),
    body: { append() {} },
    addEventListener(type, fn) { listeners.set(type, fn); },
    removeEventListener(type) { listeners.delete(type); },
    execCommand() {
      if (!copyResult) return false;
      clipboard.clear();
      listeners.get("copy")({ preventDefault() {}, clipboardData: {
        setData(type, text) {
          if (type === "text/html" && rejectHTML) return;
          clipboard.set(type, text);
        },
        get types() { return [...clipboard.keys()]; },
      } });
      return true;
    },
  };
  vm.runInNewContext(fs.readFileSync(require.resolve("../assets/copy.js"), "utf8"), {
    document, navigator: { userAgent }, window: { getSelection: () => null },
    setTimeout: () => 0, clearTimeout() {},
  });
  return { element, clipboard, expected };
}

test("the buttons are ready as soon as the page loads", () => {
  const { element } = page("Mozilla/5.0 Firefox/157.0");
  for (const id of ["copy-slack", "copy-teams", "copy-plain"]) assert.equal(element(id).disabled, false, id);
  assert.equal(element("status").textContent, "Ready to copy.");
});

test("Firefox/Zen Slack copy writes rich HTML instead of refusing the browser", () => {
  const { element, clipboard, expected } = page("Mozilla/5.0 Firefox/157.0");
  element("copy-slack").click();
  assert.match(element("status").textContent, /^Copied for Slack/);
  assert.equal(element("toast").textContent, "Copied for Slack");
  assert.equal(element("toast").className, "show");
  assert.equal(clipboard.get("text/html"), expected.html);
  assert.equal(clipboard.get("text/plain"), expected.plain);
  assert(!clipboard.has("slack/texty"), "Do not claim Firefox's custom MIME is Chromium-native");
});

test("Chromium still copies Slack's native Delta with three list levels", () => {
  const { element, clipboard, expected } = page("Mozilla/5.0 Chrome/145.0");
  element("copy-slack").click();
  assert.match(element("status").textContent, /^Copied for Slack/);
  assert.deepEqual(JSON.parse(clipboard.get("slack/texty")), expected.delta);
  assert.equal(expected.delta.ops.filter((op) => op.attributes?.indent === 2).length, 1);
});

test("rich-copy failures never succeed with only plain text", () => {
  for (const options of [{ rejectHTML: true }, { copyResult: false }]) {
    const { element } = page("Mozilla/5.0 Firefox/157.0", options);
    element("copy-slack").click();
    assert.match(element("status").textContent, /^Copy failed\./);
    assert.match(element("status").textContent, /No plain-text fallback/);
    assert.equal(element("toast").className, "show error");
  }
});

test("an unknown browser can use Slack HTML without a user-agent allowlist", () => {
  const { element, clipboard, expected } = page("CustomBrowser/1.0");
  element("copy-slack").click();
  assert.match(element("status").textContent, /^Copied for Slack/);
  assert.equal(clipboard.get("text/html"), expected.html);
});

test("plain copy carries no HTML", () => {
  const { element, clipboard, expected } = page("Mozilla/5.0 Chrome/145.0");
  element("copy-plain").click();
  assert.deepEqual([...clipboard.keys()], ["text/plain"]);
  assert.equal(clipboard.get("text/plain"), expected.plain);
});

test("a message for one app shows that app's button and plain text only", () => {
  const teams = page("Firefox/157.0", { destination: "teams" });
  assert.deepEqual(["copy-slack", "copy-teams", "copy-plain"].map((id) => teams.element(id).hidden), [true, false, false]);
  teams.element("copy-teams").click();
  assert.equal(teams.element("toast").textContent, "Copied for Teams");
  const slack = page("Firefox/157.0", { destination: "slack" });
  assert.deepEqual(["copy-slack", "copy-teams", "copy-plain"].map((id) => slack.element(id).hidden), [false, true, false]);
  const both = page("Firefox/157.0");
  assert.deepEqual(["copy-slack", "copy-teams", "copy-plain"].map((id) => both.element(id).hidden), [false, false, false]);
});
