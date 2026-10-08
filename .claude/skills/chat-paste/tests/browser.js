async page => {
  // Run in a fresh Chromium profile after generating demo.html and serving this
  // directory on localhost. The test does not open Slack/Teams or send messages.
  const failures = [];
  const checks = [];
  const errors = [];
  const requests = [];
  const check = (condition, label) => { checks.push(label); if (!condition) failures.push(label); };
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => requests.push(request.url()));
  await page.emulateMedia({ colorScheme: "dark" });
  await page.evaluate(() => localStorage.removeItem("chat-paste-theme"));
  await page.reload();
  await page.locator("#copy-slack").waitFor({ state: "visible" });
  check(await page.locator("#copy-slack").isEnabled(), "Initial draft can be copied");
  check((await page.content()).includes("INTENTIONAL_NOTES_SENTINEL"), "Generic Internal notes content is preserved in the complete page");
  check(await page.locator("#preview ul ul ul").count() === 1, "Three list levels remain nested in the preview");
  check((await page.locator("#preview strong").allTextContents()).includes("PRODUCT UPDATE 🛠️"), "Section heading is bold");

  check(await page.locator("#verify").count() === 0, "Clipboard verification is absent from the UI");
  check(!await page.locator("#source-panel").evaluate(el => el.open), "Source editor is collapsed by default");
  check(await page.locator("html").getAttribute("data-theme") === "light", "First visit defaults to light even with a dark system preference");
  await page.locator("#theme-toggle").click();
  check(await page.locator("html").getAttribute("data-theme") === "dark", "Theme toggle enables dark mode");
  await page.reload();
  check(await page.locator("html").getAttribute("data-theme") === "dark", "Theme survives a reload");
  await page.locator("#theme-toggle").click();
  check(await page.locator("html").getAttribute("data-theme") === "light", "Theme toggle returns to light mode");

  // Paste in a separate tab, with no state from the formatter, to inspect the
  // actual clipboard rather than calling the formatter's copy event directly.
  const receiver = await page.context().newPage();
  await receiver.goto(page.url());
  await receiver.evaluate(() => {
    const input = document.createElement("textarea");
    input.id = "receiver";
    input.addEventListener("paste", event => {
      event.preventDefault();
      window.received = Object.fromEntries([...event.clipboardData.types].map(type => [type, event.clipboardData.getData(type)]));
    });
    document.body.append(input);
  });
  async function roundTrip(sender, target, native = target === "slack") {
    const expected = await sender.evaluate(() => ChatPasteFormatter.format(document.getElementById("source").value));
    await sender.bringToFront();
    await sender.locator(`#copy-${target}`).click();
    check((await sender.locator("#status").innerText()).startsWith("Copied"), `${target} copy reports success`);
    await receiver.bringToFront();
    await receiver.locator("#receiver").click();
    await receiver.keyboard.press("Control+V");
    const received = await receiver.evaluate(() => window.received);
    check(received["text/plain"] === expected.plain, `${target} plain text reaches another tab exactly`);
    if (target !== "plain") {
      const matches = await receiver.evaluate(([actual, expected]) => {
        function signature(html) {
          const template = document.createElement("template"); template.innerHTML = html;
          function nodeSignature(node) {
            if (node.nodeType === Node.TEXT_NODE) return node.textContent ? ["text", node.textContent] : null;
            if (node.nodeType !== Node.ELEMENT_NODE || ["META", "STYLE"].includes(node.tagName)) return null;
            return [node.tagName, node.getAttribute("href"), node.getAttribute("start"), [...node.childNodes].map(nodeSignature).filter(Boolean)];
          }
          return JSON.stringify([...template.content.childNodes].map(nodeSignature).filter(Boolean));
        }
        return signature(actual) === signature(expected);
      }, [received["text/html"] || "", expected.html]);
      check(matches, `${target} complete HTML structure and text survive real copy/paste`);
    } else check(!received["text/html"], "Plain-text copy deliberately excludes HTML");
    if (native) check(JSON.stringify(JSON.parse(received["slack/texty"] || "{}")) === JSON.stringify(expected.delta), "Native Slack Delta reaches another tab exactly");
    else check(!received["slack/texty"], `${target} HTML/plain copy clears previous native Slack data`);
  }
  for (const target of ["slack", "teams", "plain"]) await roundTrip(page, target);
  await page.bringToFront();
  await page.locator("#source-panel").evaluate(el => { el.open = true; });

  await page.locator("#source").fill("Hey team!\n\nTODAY 🙂\n* Initial");
  await page.locator("#source").press("End");
  await page.keyboard.type(" extra words ");
  check((await page.locator("#source").inputValue()).endsWith(" extra words "), "Typing spaces does not trim or concatenate words");
  check((await page.locator("#edited").innerText()).includes("not saved"), "Browser edits are clearly marked as unsaved");

  await page.locator("#source").fill("Good afternoon :slightly_smiling_face:\n\n## SHIPPED\n• [Fix](https://example.com/fix) is ready\n\n## NEEDS A DECISION @Roger\n• Please review");
  check((await page.locator("#preview").innerText()).includes("🙂"), "Emoji shortcode renders as Unicode");
  check(await page.locator("#preview a").getAttribute("href") === "https://example.com/fix", "Link remains clickable");
  check((await page.locator("#warning").innerText()).includes("@mentions"), "Real-mention limitation is visible");

  await page.locator("#source").fill("# Weekly Recap (Oct 1 to Oct 5) 🎯\n\nHey team! Good week.\n\n## Your spreadsheets\nImporting is finished.\n\n## Vibes & Reflection 😄\nReady for next week.");
  check(await page.locator("#preview strong").count() === 3, "Explicit title and both theme headers are bold");
  await roundTrip(page, "teams", false);
  await page.bringToFront();

  await page.locator("#source").fill("Public text\n\n## Internal notes\nINTENTIONAL_BROWSER_NOTES\n\nBefore you send:\nReview this checklist.");
  check((await page.locator("#source").inputValue()).includes("INTENTIONAL_BROWSER_NOTES"), "Pasted Internal notes are retained by the generic editor");
  check((await page.locator("#preview").innerText()).includes("Review this checklist."), "Review labels remain legitimate generic content");

  await page.locator("#source").fill("<img src=x onerror=alert(1)>");
  check(await page.locator("#copy-slack").isDisabled(), "Raw HTML disables copying");
  check(await page.locator("#preview img").count() === 0, "Raw HTML never enters the preview DOM");
  await page.locator("#source").fill("[bad](javascript:alert%281%29)");
  check(await page.locator("#copy-teams").isDisabled(), "Unsafe links disable copying");
  await page.locator("#source").fill("* Parent\n  * Child\n\n  * Second child");
  check(await page.locator("#copy-slack").isDisabled(), "Unsafe nested-list spacing fails closed");

  await page.locator("#source").fill("Valid message");
  await page.evaluate(() => { window.originalExecCommand = document.execCommand; document.execCommand = () => false; });
  await page.locator("#copy-slack").click();
  check((await page.locator("#status").innerText()).startsWith("Copy failed."), "A failed copy never reports success");
  check((await page.locator("#status").innerText()).includes("No plain-text fallback"), "A failed rich copy never silently falls back");
  await page.evaluate(() => { document.execCommand = window.originalExecCommand; });

  // Exercise the HTML route with a Firefox-like UA in a separate context.
  // This checks routing in Chromium; firefox.cjs tests actual Firefox too.
  const htmlContext = await page.context().browser().newContext({ userAgent: "Mozilla/5.0 Firefox/157.0" });
  try {
    const htmlPage = await htmlContext.newPage();
    await htmlPage.goto(page.url());
    check((await htmlPage.locator("#warning").innerText()) === "", "Firefox-like browsers have no protocol warning");
    await htmlPage.locator("#copy-slack").click();
    check((await htmlPage.locator("#status").innerText()).startsWith("Copied for Slack"), "Firefox-like browsers are allowed to copy rich HTML for Slack");
    const htmlReceiver = await htmlContext.newPage();
    await htmlReceiver.goto(page.url());
    await htmlReceiver.evaluate(() => {
      const input = document.createElement("textarea");
      input.id = "receiver";
      input.addEventListener("paste", event => {
        event.preventDefault();
        window.received = Object.fromEntries([...event.clipboardData.types].map(type => [type, event.clipboardData.getData(type)]));
      });
      document.body.append(input);
    });
    await htmlReceiver.locator("#receiver").click();
    await htmlReceiver.keyboard.press("Control+V");
    const received = await htmlReceiver.evaluate(() => window.received);
    check(received["text/html"].includes("<ul><li>"), "Slack HTML lists reach another tab");
    check(received["text/plain"].includes("    • Returning"), "Slack HTML route preserves nested plain text too");
    check(!received["slack/texty"], "HTML route does not claim to supply Chromium-native Slack data");
  } finally {
    await htmlContext.close();
  }
  await receiver.close();

  // Restore the original sample for the screenshot and manual acceptance check.
  await page.reload();
  await page.setViewportSize({ width: 480, height: 850 });
  check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "Mobile-width preview has no horizontal page overflow");
  await page.setViewportSize({ width: 1280, height: 1000 });
  check(errors.length === 0, "No browser JavaScript errors");
  check(requests.every(url => url.startsWith(new URL(page.url()).origin)), "No requests to external origins");
  if (failures.length) throw new Error(JSON.stringify({ failures, errors }));
  return { passed: checks.length, checks, errors, externalRequests: requests.filter(url => !url.startsWith(new URL(page.url()).origin)) };
}
