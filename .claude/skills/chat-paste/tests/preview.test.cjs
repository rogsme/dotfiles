const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { format } = require("../assets/formatter.js");

// Run the real button handlers with a deterministic clipboard-event double.
// Real browser clipboard round-trips remain in browser.js and firefox.cjs.
function preview(userAgent, { rejectHTML = false, copyResult = true, savedTheme, storageFails = false, systemDark = false, destination = "both" } = {}) {
  const input = "## Update 🚀\n* Parent\n  * Child\n    * Grandchild\n\n[Notes](https://example.com/notes)";
  const elements = new Map();
  const listeners = new Map();
  const clipboard = new Map();
  const storage = new Map(savedTheme ? [["chat-paste-theme", savedTheme]] : []);
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      value: "", textContent: "", disabled: true,
      addEventListener(type, fn) { this[type] = fn; },
      replaceChildren() { this.innerHTML = ""; },
      focus() {}, select() {}, remove() {},
      setAttribute() {}, style: {},
    });
    return elements.get(id);
  }
  element("chat-paste-data").textContent = JSON.stringify({ text: input, title: "Test", destination });
  const document = {
    documentElement: { dataset: {} },
    getElementById: element,
    querySelectorAll: () => [element("copy-slack"), element("copy-teams"), element("copy-plain")],
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
  vm.runInNewContext(fs.readFileSync(require.resolve("../assets/preview.js"), "utf8"), {
    document, navigator: { userAgent }, window: { getSelection: () => null, matchMedia: () => ({ matches: systemDark }) },
    setTimeout: () => 0, clearTimeout() {},
    localStorage: {
      getItem(key) { if (storageFails) throw new Error("Storage disabled"); return storage.get(key); },
      setItem(key, value) { if (storageFails) throw new Error("Storage disabled"); storage.set(key, value); },
    },
    ChatPasteFormatter: { format },
  });
  return { element, clipboard, expected: format(input), document, storage };
}

test("Firefox/Zen Slack copy writes rich HTML instead of refusing the browser", () => {
  const { element, clipboard, expected } = preview("Mozilla/5.0 Firefox/157.0");
  element("copy-slack").click();
  assert.match(element("status").textContent, /^Copied for Slack/);
  assert.equal(element("toast").textContent, "Copied for Slack");
  assert.equal(element("toast").className, "show");
  assert.equal(element("warning").textContent, "");
  assert.equal(clipboard.get("text/html"), expected.html);
  assert.equal(clipboard.get("text/plain"), expected.plain);
  assert(!clipboard.has("slack/texty"), "Do not claim Firefox's custom MIME is Chromium-native");
});

test("Chromium still copies Slack's native Delta with three list levels", () => {
  const { element, clipboard, expected } = preview("Mozilla/5.0 Chrome/145.0");
  element("copy-slack").click();
  assert.match(element("status").textContent, /^Copied for Slack/);
  assert.deepEqual(JSON.parse(clipboard.get("slack/texty")), expected.delta);
});

test("Firefox rich-copy failures never succeed with only plain text", () => {
  for (const options of [{ rejectHTML: true }, { copyResult: false }]) {
    const { element } = preview("Mozilla/5.0 Firefox/157.0", options);
    element("copy-slack").click();
    assert.match(element("status").textContent, /^Copy failed\./);
    assert.match(element("status").textContent, /No plain-text fallback/);
    assert.equal(element("toast").className, "show error");
  }
});

test("an unknown browser can use Slack HTML without a user-agent allowlist", () => {
  const { element, clipboard, expected } = preview("CustomBrowser/1.0");
  element("copy-slack").click();
  assert.match(element("status").textContent, /^Copied for Slack/);
  assert.equal(clipboard.get("text/html"), expected.html);
});

test("theme preference is restored and the toggle stores only appearance", () => {
  const { element, document, storage } = preview("Firefox/157.0", { savedTheme: "dark" });
  assert.equal(document.documentElement.dataset.theme, "dark");
  element("theme-toggle").click();
  assert.equal(document.documentElement.dataset.theme, "light");
  assert.deepEqual([...storage], [["chat-paste-theme", "light"]]);
});

test("blocked storage does not break copying or theme changes", () => {
  const { element, document, clipboard } = preview("Firefox/157.0", { storageFails: true });
  element("theme-toggle").click();
  assert.equal(document.documentElement.dataset.theme, "dark");
  element("copy-slack").click();
  assert(clipboard.has("text/html"));
});

test("first visit defaults to light even when the system prefers dark", () => {
  const { document } = preview("Firefox/157.0", { systemDark: true });
  assert.equal(document.documentElement.dataset.theme, "light");
});

test("Teams copy shows a toast and the destination button has no recommendation suffix", () => {
  const { element } = preview("Firefox/157.0", { destination: "teams" });
  element("copy-teams").click();
  assert.equal(element("toast").textContent, "Copied for Teams");
  assert(!element("copy-teams").textContent.includes("recommended"));
});
