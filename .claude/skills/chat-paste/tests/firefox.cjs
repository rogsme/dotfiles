// Real Firefox smoke test via WebDriver BiDi, without an installed automation
// package. Requires Node 22+ and Firefox. Uses only a fresh headless profile.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { spawn } = require("node:child_process");
const { once } = require("node:events");

async function main() {
  const profile = await fs.mkdtemp("/tmp/opencode/chat-paste-firefox-");
  let child, socket;
  let id = 0;
  const pending = new Map();
  const checks = [];
  const check = (condition, label) => { assert(condition, label); checks.push(label); };
  function command(method, params = {}) {
    return new Promise((resolve, reject) => {
      const request = ++id;
      const timer = setTimeout(() => { pending.delete(request); reject(new Error(`Timed out: ${method}`)); }, 15000);
      pending.set(request, {
        resolve(value) { clearTimeout(timer); resolve(value); },
        reject(error) { clearTimeout(timer); reject(error); },
      });
      socket.send(JSON.stringify({ id: request, method, params }));
    });
  }
  async function evaluate(context, expression, userActivation = false) {
    const value = await command("script.evaluate", { expression, target: { context }, awaitPromise: true, userActivation });
    if (value.type === "exception") throw new Error(value.exceptionDetails.text);
    return value.result.value;
  }
  async function paste(context, selector) {
    await command("browsingContext.activate", { context });
    await evaluate(context, `document.querySelector(${JSON.stringify(selector)}).focus()`);
    await command("input.performActions", { context, actions: [{ type: "key", id: "keyboard", actions: [
      { type: "keyDown", value: "\uE009" }, { type: "keyDown", value: "v" },
      { type: "keyUp", value: "v" }, { type: "keyUp", value: "\uE009" },
    ] }] });
  }
  try {
    child = spawn(process.env.FIREFOX_BINARY || "firefox", ["--headless", "--no-remote", "--profile", profile,
      "--remote-debugging-port", "0", "about:blank"], {
      env: { ...process.env, MOZ_DISABLE_NONLOCAL_CONNECTIONS: "1" }, stdio: ["ignore", "pipe", "pipe"],
    });
    const endpoint = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Firefox BiDi startup timed out")), 20000);
      let log = "";
      function received(data) {
        log += data;
        const match = log.match(/WebDriver BiDi listening on (ws:\/\/[^\s]+)/);
        if (match) { clearTimeout(timeout); resolve(match[1]); }
      }
      child.stderr.on("data", received);
      child.stdout.on("data", received);
      child.once("error", error => { clearTimeout(timeout); reject(error); });
      child.once("exit", code => { clearTimeout(timeout); reject(new Error(`Firefox exited (${code}): ${log.slice(-1500)}`)); });
    });
    socket = new WebSocket(endpoint.replace(/\/$/, "") + "/session");
    await once(socket, "open");
    socket.addEventListener("message", event => {
      const response = JSON.parse(event.data);
      const request = pending.get(response.id);
      if (!request) return;
      pending.delete(response.id);
      if (response.type === "error") request.reject(new Error(`${response.error}: ${response.message}`));
      else request.resolve(response.result);
    });
    await command("session.new", { capabilities: { alwaysMatch: { acceptInsecureCerts: false } } });
    const sender = (await command("browsingContext.create", { type: "tab" })).context;
    const url = pathToFileURL(path.join(__dirname, "demo.html")).href;
    await command("browsingContext.navigate", { context: sender, url, wait: "complete" });
    check((await evaluate(sender, "navigator.userAgent")).includes("Firefox/"), "Running actual Firefox, not a spoofed Chromium UA");
    check(await evaluate(sender, "document.querySelector('#preview ul ul ul') !== null"), "Firefox renders all three list levels");
    check((await evaluate(sender, "document.querySelector('#warning').textContent")) === "", "No browser-protocol warning is shown");
    check(await evaluate(sender, "document.querySelector('#verify') === null"), "Verification section is absent");
    check(await evaluate(sender, "!document.querySelector('#source-panel').open"), "Source editor is collapsed by default");
    await evaluate(sender, "document.querySelector('#theme-toggle').click()");
    const theme = await evaluate(sender, "document.documentElement.dataset.theme");
    check(["dark", "light"].includes(theme), "Theme toggle sets an explicit appearance");
    await command("browsingContext.reload", { context: sender, wait: "complete" });
    check(await evaluate(sender, "document.documentElement.dataset.theme") === theme, "Firefox remembers the theme after reload");
    const secondFile = path.join(profile, "another-preview.html");
    await fs.copyFile(path.join(__dirname, "demo.html"), secondFile);
    const second = (await command("browsingContext.create", { type: "tab" })).context;
    await command("browsingContext.navigate", { context: second, url: pathToFileURL(secondFile).href, wait: "complete" });
    check(await evaluate(second, "document.documentElement.dataset.theme") === theme, "Firefox remembers the theme across different local preview files");
    check(await evaluate(sender, "localStorage.length") === 1, "Only the theme preference is stored, never message content");
    const receiver = (await command("browsingContext.create", { type: "tab" })).context;
    await command("browsingContext.navigate", { context: receiver, url, wait: "complete" });
    await evaluate(receiver, `(() => {
      const input = document.createElement('textarea'); input.id = 'receiver';
      input.addEventListener('paste', event => {
        event.preventDefault();
        window.received = Object.fromEntries([...event.clipboardData.types].map(type => [type, event.clipboardData.getData(type)]));
      }); document.body.append(input);
    })()`);
    const signature = `html => {
      const template = document.createElement('template'); template.innerHTML = html;
      function nodeSignature(node) {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent ? ['text', node.textContent] : null;
        if (node.nodeType !== Node.ELEMENT_NODE || ['META', 'STYLE'].includes(node.tagName)) return null;
        return [node.tagName, node.getAttribute('href'), node.getAttribute('start'), [...node.childNodes].map(nodeSignature).filter(Boolean)];
      }
      return [...template.content.childNodes].map(nodeSignature).filter(Boolean);
    }`;
    for (const target of ["slack", "teams", "plain"]) {
      await command("browsingContext.activate", { context: sender });
      await evaluate(sender, `document.querySelector('#copy-${target}').click()`, true);
      check((await evaluate(sender, "document.querySelector('#status').textContent")).startsWith("Copied"), `${target} copies in Firefox`);
      await paste(receiver, "#receiver");
      const received = JSON.parse(await evaluate(receiver, "JSON.stringify(window.received)"));
      const expected = JSON.parse(await evaluate(sender, "JSON.stringify(ChatPasteFormatter.format(document.querySelector('#source').value))"));
      check(received['text/plain'] === expected.plain, `${target} exact plain text reaches a separate Firefox tab`);
      check(!received['slack/texty'], `${target} Firefox path does not leave Chromium-native data`);
      if (target !== 'plain') {
        const structure = await evaluate(receiver, `JSON.stringify((${signature})(window.received['text/html']))`);
        const expectedHTML = await evaluate(sender, `JSON.stringify((${signature})(ChatPasteFormatter.format(document.querySelector('#source').value).html))`);
        check(structure === expectedHTML, `${target} complete HTML structure and text survive Firefox's actual clipboard`);
      } else check(!received['text/html'], "Plain copy clears rich HTML");
    }
    console.log(JSON.stringify({ passed: checks.length, checks }));
  } finally {
    for (const request of pending.values()) request.reject(new Error("Firefox test closing"));
    pending.clear();
    if (socket) socket.close();
    if (child && child.exitCode === null) {
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      const timer = setTimeout(() => child.kill("SIGKILL"), 3000);
      await exited;
      clearTimeout(timer);
    }
    // Remove only the disposable profile created by this test, never a user's.
    await fs.rm(profile, { recursive: true });
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
