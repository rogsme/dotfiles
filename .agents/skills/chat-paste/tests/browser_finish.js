async (page) => {
  const config = __CONFIG__;
  const failures = [];
  const checks = [];
  const check = (condition, label) => { checks.push(label); if (!condition) failures.push(label); };
  // The open tab reloads itself onto the new revision and shows the agent's answers.
  await page.waitForFunction((revision) => document.documentElement.dataset.messageRevision === String(revision), config.revision, { timeout: 30_000 });
  await page.waitForFunction(() => document.querySelector("#cp-theme").textContent && document.querySelector("#status").textContent === "Ready to copy.", null, { timeout: 30_000 });
  check(await page.evaluate(() => document.documentElement.dataset.theme) === "dark", "The reloaded page keeps the dark theme");
  check((await page.locator("article").innerText()).includes("Write the release notes tomorrow."), "Revision 2 is on screen");

  // This browser saw revision 1 and the tab has no focus, so revision 2 marks the title until it gets focus.
  const seen = () => page.evaluate(() => ({ title: document.title, seen: localStorage.getItem(`chat-paste:${location.pathname}:seen`) }));
  const arrived = await seen();
  check(arrived.title === "(new) Product update | Chat paste" && arrived.seen === String(config.revision - 1), `Revision ${config.revision} marks the title: ${JSON.stringify(arrived)}`);
  await page.evaluate(() => dispatchEvent(new Event("focus")));
  const acknowledged = await seen();
  check(!acknowledged.title.startsWith("(new) ") && acknowledged.seen === String(config.revision), "Focus acknowledges the revision");

  const marks = () => page.evaluate(() => ({
    button: document.querySelector("#cp-changes").hidden ? null : document.querySelector("#cp-changes").textContent,
    words: [...(CSS.highlights.get("cp-changed") || [])].map((range) => range.toString()),
    blocks: [...document.querySelectorAll(".cp-changed-block")].map((item) => item.textContent.trim()),
  }));
  const changes = await marks();
  check(JSON.stringify(changes) === JSON.stringify({ button: "Changes (2)", words: ["and the large"], blocks: ["Write the release notes tomorrow."] }), `The changes since revision 1 are marked: ${JSON.stringify(changes)}`);
  await page.locator("#cp-changes").click();
  const hidden = await marks();
  check(!hidden.words.length && !hidden.blocks.length, "The Changes toggle hides the marks");
  await page.locator("#cp-changes").click();

  await page.keyboard.press("c");
  await page.locator(".cp-answer").filter({ hasText: "Changed" }).first().waitFor();
  await page.locator(".cp-answer").filter({ hasText: "Kept" }).first().waitFor();
  await page.keyboard.press("Escape");

  const expected = await page.evaluate(() => JSON.parse(document.getElementById("chat-paste-data").textContent));
  check(expected.plain.includes("with the sample and the large files."), "The copy data is revision 2's");
  await page.locator("#copy-teams").click();
  check((await page.locator("#status").innerText()).startsWith("Copied for Teams"), "Revision 2 copies");

  await page.waitForFunction(() => !document.querySelector("#cp-done").disabled, null, { timeout: 15_000 });
  await page.locator("#cp-done").click();
  await page.getByRole("dialog").getByText("Finish this message?").waitFor();
  await page.getByRole("dialog").getByRole("button", { name: "Done" }).click();
  await page.locator("#cp-banner.closed").waitFor();
  check(await page.locator("#cp-comment").isDisabled(), "Comments close after Done");
  check(await page.locator("#copy-slack").isEnabled(), "The copy buttons still work after Done");
  if (failures.length) throw new Error(JSON.stringify({ failures, changes }));
  return { passed: true, checks: checks.length, attention: { arrived, acknowledged }, changes };
}
