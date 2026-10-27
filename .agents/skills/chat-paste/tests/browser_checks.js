async (page) => {
  // Runs in a fresh Chromium profile against the viewer. It never opens Slack or Teams or sends a message.
  const config = __CONFIG__;
  const failures = [];
  const checks = [];
  const errors = [];
  const external = [];
  const check = (condition, label) => { checks.push(label); if (!condition) failures.push(label); };
  page.on("pageerror", (error) => errors.push(error.message));
  await page.context().route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "127.0.0.1") return route.continue();
    external.push(url.href);
    return route.abort();
  });
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(config.url);
  await page.locator("article").waitFor();
  await page.waitForFunction(() => document.querySelector("#status").textContent === "Ready to copy.");
  check(!new URL(page.url()).search, "The token leaves the address bar once the cookie is set");
  check(await page.title() === "Product update | Chat paste", "The first load does not mark the title");
  check(await page.locator("#copy-slack").isEnabled() && await page.locator("#copy-teams").isEnabled(), "Both copy buttons are ready");
  check((await page.content()).includes("INTENTIONAL_NOTES_SENTINEL"), "Supplied Internal notes stay in the message");
  check(await page.locator("article ul ul ul").count() === 1, "Three list levels stay nested");
  check((await page.locator("article strong").allTextContents()).includes("PRODUCT UPDATE \u{1F6E0}️"), "The section heading is bold");
  check(await page.locator("#source, textarea#source, details").count() === 0, "There is no edit box");
  check(!(await page.locator("body.comment-mode").count()) && !(await page.locator("#cp-panel").isVisible()), "Comment mode is off by default");
  check(await page.locator("#cp-changes").isHidden(), "The first load shows no changes");

  // Theme: the toggle switches to dark, and the server keeps the choice.
  await page.locator("#cp-theme").click();
  check(await page.evaluate(() => document.documentElement.dataset.theme) === "dark", "The theme toggle switches to dark");
  await page.waitForFunction(() => fetch("api/state", { headers: { "X-Chat-Paste": "1" } }).then((response) => response.json()).then((state) => state.theme === "dark"));

  // Paste in a separate tab to inspect the real clipboard.
  const expected = await page.evaluate(() => JSON.parse(document.getElementById("chat-paste-data").textContent));
  async function receiverFor(context) {
    const receiver = await context.newPage();
    await receiver.goto(page.url());
    await receiver.evaluate(() => {
      const input = document.createElement("textarea");
      input.id = "receiver";
      input.addEventListener("paste", (event) => {
        event.preventDefault();
        window.received = Object.fromEntries([...event.clipboardData.types].map((type) => [type, event.clipboardData.getData(type)]));
      });
      document.body.prepend(input);
    });
    return receiver;
  }
  const receiver = await receiverFor(page.context());
  const sameStructure = (actual, wanted) => receiver.evaluate(([actual, wanted]) => {
    function signature(html) {
      const template = document.createElement("template"); template.innerHTML = html;
      function nodeSignature(node) {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent ? ["text", node.textContent] : null;
        if (node.nodeType !== Node.ELEMENT_NODE || ["META", "STYLE"].includes(node.tagName)) return null;
        return [node.tagName, node.getAttribute("href"), node.getAttribute("start"), [...node.childNodes].map(nodeSignature).filter(Boolean)];
      }
      return JSON.stringify([...template.content.childNodes].map(nodeSignature).filter(Boolean));
    }
    return signature(actual) === signature(wanted);
  }, [actual, wanted]);
  for (const target of ["slack", "teams", "plain"]) {
    await page.bringToFront();
    await page.locator(`#copy-${target}`).click();
    check((await page.locator("#status").innerText()).startsWith("Copied"), `${target} copy reports success`);
    await receiver.bringToFront();
    await receiver.locator("#receiver").click();
    await receiver.keyboard.press("Control+V");
    const received = await receiver.evaluate(() => window.received);
    check(received["text/plain"] === expected.plain, `${target} plain text reaches another tab exactly`);
    if (target !== "plain") check(await sameStructure(received["text/html"] || "", expected.html), `${target} HTML structure and text survive real copy and paste`);
    else check(!received["text/html"], "Plain copy carries no HTML");
    if (target === "slack") check(JSON.stringify(JSON.parse(received["slack/texty"] || "{}")) === JSON.stringify(expected.delta), "Native Slack Delta reaches another tab exactly");
    else check(!received["slack/texty"], `${target} copy clears earlier native Slack data`);
  }
  await receiver.close();

  await page.bringToFront();
  await page.evaluate(() => { window.originalExecCommand = document.execCommand; document.execCommand = () => false; });
  await page.locator("#copy-slack").click();
  check((await page.locator("#status").innerText()).startsWith("Copy failed."), "A failed copy never reports success");
  check((await page.locator("#status").innerText()).includes("No plain-text fallback"), "A failed rich copy never falls back silently");
  await page.evaluate(() => { document.execCommand = window.originalExecCommand; });

  // The HTML route with a Firefox-like user agent. This checks routing in Chromium; firefox.cjs tests real Firefox.
  const htmlContext = await page.context().browser().newContext({ userAgent: "Mozilla/5.0 Firefox/157.0" });
  try {
    const htmlPage = await htmlContext.newPage();
    await htmlPage.goto(config.url);
    await htmlPage.waitForFunction(() => document.querySelector("#status").textContent === "Ready to copy.");
    await htmlPage.locator("#copy-slack").click();
    check((await htmlPage.locator("#status").innerText()).startsWith("Copied for Slack"), "Firefox-like browsers copy rich HTML for Slack");
    const htmlReceiver = await htmlContext.newPage();
    await htmlReceiver.goto(htmlPage.url());
    await htmlReceiver.evaluate(() => {
      const input = document.createElement("textarea");
      input.id = "receiver";
      input.addEventListener("paste", (event) => {
        event.preventDefault();
        window.received = Object.fromEntries([...event.clipboardData.types].map((type) => [type, event.clipboardData.getData(type)]));
      });
      document.body.prepend(input);
    });
    await htmlReceiver.locator("#receiver").click();
    await htmlReceiver.keyboard.press("Control+V");
    const received = await htmlReceiver.evaluate(() => window.received);
    check(received["text/html"].includes("<ul><li>"), "Slack HTML lists reach another tab");
    check(received["text/plain"].includes("    • Returning"), "The HTML route keeps nested plain text");
    check(!received["slack/texty"], "The HTML route claims no Chromium-native Slack data");
  } finally {
    await htmlContext.close();
  }

  // Comments: a word, a selected range, and a general comment.
  await page.bringToFront();
  await page.keyboard.press("c");
  await page.locator("#cp-panel").waitFor({ state: "visible" });
  const comment = async (text) => {
    await page.locator(".cp-composer textarea").fill(text);
    await page.locator(".cp-composer button.primary").click();
  };
  const word = await page.locator("article").evaluate(() => {
    const walker = document.createTreeWalker(document.querySelector("article"), NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const at = node.data.indexOf("touches");
      if (at < 0) continue;
      const range = document.createRange();
      range.setStart(node, at + 2);
      range.setEnd(node, at + 3);
      const rect = range.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    }
    return null;
  });
  await page.mouse.click(word.x, word.y);
  await comment("Name one touch.");
  const item = page.locator("article li").filter({ hasText: "Finish testing the upload flow" });
  const box = await item.boundingBox();
  const end = await item.evaluate((node) => { const range = document.createRange(); range.selectNodeContents(node); const rects = range.getClientRects(); const last = rects[rects.length - 1]; return { x: last.right - 1, y: last.y + last.height / 2 }; });
  await page.mouse.move(box.x + 1, end.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await page.mouse.up();
  await comment("Name the large files too.");
  await page.getByRole("textbox", { name: "General comment" }).fill("Add what is next for tomorrow.");
  await page.getByRole("textbox", { name: "General comment" }).press("Control+Enter");
  check(await page.locator("#cp-drafts .cp-card").count() === 3, "Three drafts reach the panel");
  check(await page.locator("#cp-done").isDisabled(), "Done waits for unsent drafts");
  await page.locator("#cp-send").click();
  await page.locator(".cp-batch-note").filter({ hasText: "waiting for the agent" }).waitFor();
  check(await page.locator("#cp-done").isDisabled(), "Done waits while the agent revises");
  await page.keyboard.press("Escape");

  await page.setViewportSize({ width: 390, height: 844 });
  const geometry = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
  check(geometry.content <= geometry.width + 1, "The phone-width page has no horizontal scroll");
  await page.setViewportSize({ width: 1280, height: 1000 });
  check(errors.length === 0, "No browser JavaScript errors");
  check(external.length === 0, "No requests leave the viewer");
  // The reload onto revision 2 happens while this tab looks unfocused, as a background tab would.
  await page.addInitScript(() => { Document.prototype.hasFocus = () => false; });
  if (failures.length) throw new Error(JSON.stringify({ failures, errors, external }));
  return { passed: true, checks: checks.length };
}
