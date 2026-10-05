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
  await page.reload();
  await page.locator("#copy-slack").waitFor({ state: "visible" });
  check(await page.locator("#copy-slack").isEnabled(), "Initial draft can be copied");
  check(!(await page.content()).includes("PRIVATE_DEMO_SENTINEL"), "Private notes are absent from the complete page");
  check(await page.locator("#preview ul ul ul").count() === 1, "Three list levels remain nested in the preview");
  check((await page.locator("#preview strong").allTextContents()).includes("PRODUCT UPDATE 🛠️"), "Section heading is bold");

  await page.locator("details").evaluate(element => { element.open = true; });
  for (const target of ["slack", "teams", "plain"]) {
    await page.locator(`#copy-${target}`).click();
    check((await page.locator("#status").innerText()).startsWith("Copied"), `${target} copy reports success`);
    await page.locator("#verify").click();
    await page.keyboard.press("Control+V");
    check((await page.locator("#verification").innerText()).startsWith("Clipboard verified:"), `${target} real clipboard round-trip is exact`);
  }

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
  for (const target of ["slack", "teams"]) {
    await page.bringToFront();
    await page.locator(`#copy-${target}`).click();
    await receiver.bringToFront();
    await receiver.locator("#receiver").click();
    await receiver.keyboard.press("Control+V");
    const received = await receiver.evaluate(() => window.received);
    check(Boolean(received["text/html"]), `${target} rich HTML reaches another tab`);
    check(received["text/plain"].includes("    • Returning"), `${target} nested plain text reaches another tab`);
    if (target === "slack") {
      const delta = JSON.parse(received["slack/texty"] || "{}");
      check(delta.ops?.some(op => op.attributes?.indent === 2), "Native Slack nesting reaches another tab");
    } else check(!received["slack/texty"], "Teams copy clears the previous Slack custom clipboard data");
  }
  await receiver.close();
  await page.bringToFront();

  await page.locator("#source").fill("Hey team!\n\nTODAY 🙂\n* Initial");
  await page.locator("#source").press("End");
  await page.keyboard.type(" extra words ");
  check((await page.locator("#source").inputValue()).endsWith(" extra words "), "Typing spaces does not trim or concatenate words");
  check((await page.locator("#edited").innerText()).includes("not saved"), "Browser edits are clearly marked as unsaved");

  await page.locator("#mode").selectOption("internal");
  await page.locator("#source").fill("Good afternoon :slightly_smiling_face:\n\nSHIPPED\n• [Fix](https://example.com/fix) is ready\n\nNEEDS A DECISION @Roger\n• Please review");
  check((await page.locator("#preview").innerText()).includes("🙂"), "Internal emoji shortcode renders as Unicode");
  check(await page.locator("#preview a").getAttribute("href") === "https://example.com/fix", "Internal link remains clickable");
  check((await page.locator("#warning").innerText()).includes("@mentions"), "Real-mention limitation is visible");

  await page.locator("#mode").selectOption("weekly");
  await page.locator("#source").fill("Weekly Recap (Oct 1 to Oct 5) 🎯\n\nHey team! Good week.\n\nYour spreadsheets\nImporting is finished.\n\nVibes & Reflection 😄\nReady for next week.");
  check(await page.locator("#preview strong").count() === 3, "Weekly title and both theme headers are bold");
  await page.locator("#copy-teams").click();
  await page.locator("#verify").click();
  await page.keyboard.press("Control+V");
  check((await page.locator("#verification").innerText()).startsWith("Clipboard verified:"), "Weekly Teams clipboard verifies");

  await page.locator("#source").fill("Public only\n\n## Internal notes\nBROWSER_PRIVATE_SENTINEL");
  check(!(await page.locator("#source").inputValue()).includes("BROWSER_PRIVATE_SENTINEL"), "Pasted private notes are removed from the source editor");

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

  await page.evaluate(() => { Object.defineProperty(navigator, "userAgent", { configurable: true, value: "Mozilla/5.0 Firefox/145.0" }); });
  await page.locator("#copy-slack").click();
  check((await page.locator("#status").innerText()).includes("requires a Chromium-based browser"), "Non-Chromium browsers cannot report a successful native Slack copy");
  await page.evaluate(() => { delete navigator.userAgent; });

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
