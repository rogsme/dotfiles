async (page) => {
  const config = __CONFIG__;
  // The open tab reloads itself on the new revision and shows the agent's answers.
  await page.waitForFunction((revision) => document.documentElement.dataset.planRevision === String(revision), config.revision, { timeout: 30_000 });
  // The revision is in the HTML before the deferred viewer.js runs; the theme button's icon shows it has.
  await page.waitForFunction(() => document.querySelector("#pp-theme").textContent, null, { timeout: 30_000 });
  await page.getByRole("heading", { name: "Revision check", exact: true, includeHidden: true }).waitFor({ state: "attached" });
  if (await page.evaluate(() => document.documentElement.dataset.theme) !== "dark") throw new Error("The reloaded page lost the dark theme.");
  // This browser saw revision 1 and the tab has no focus, so revision 2 marks the title until it gets focus.
  const seen = () => page.evaluate(() => ({ title: document.title, seen: localStorage.getItem(`present-plan:${location.pathname}:seen`) }));
  const arrived = await seen();
  if (arrived.title !== "(new) ACM-123 | Plan review" || arrived.seen !== String(config.revision - 1)) throw new Error(`Revision ${config.revision} did not mark the title: ${JSON.stringify(arrived)}`);
  await page.evaluate(() => dispatchEvent(new Event("focus")));
  const acknowledged = await seen();
  if (acknowledged.title.startsWith("(new) ") || acknowledged.seen !== String(config.revision)) throw new Error(`Focus did not acknowledge the revision: ${JSON.stringify(acknowledged)}`);

  // Revision 2 against revision 1: a changed sentence, a changed diagram, and a new heading and paragraph.
  const marks = () => page.evaluate(() => ({
    button: document.querySelector("#pp-changes").hidden ? null : document.querySelector("#pp-changes").textContent,
    pressed: document.querySelector("#pp-changes").getAttribute("aria-pressed"),
    words: [...(CSS.highlights.get("pp-changed") || [])].map((range) => range.toString()),
    blocks: [...document.querySelectorAll(".pp-changed-block")].map((item) => item.matches("figure") ? `diagram ${item.dataset.diagram}` : item.textContent.trim()),
  }));
  const expected = JSON.stringify({ button: "Changes (4)", pressed: "true", words: ["and its headers"], blocks: ["diagram 2", "Revision check", "The second revision preserves the response contract."] });
  const changes = await marks();
  if (JSON.stringify(changes) !== expected) throw new Error(`The changes since revision 1 are wrong: ${JSON.stringify(changes)}`);
  await page.locator("#pp-changes").click();
  const hidden = await marks();
  if (hidden.pressed !== "false" || hidden.words.length || hidden.blocks.length) throw new Error(`The Changes toggle did not hide the marks: ${JSON.stringify(hidden)}`);
  await page.reload();
  await page.waitForFunction(() => document.querySelector("#pp-changes").getAttribute("aria-pressed") === "false" && !document.querySelector("#pp-changes").hidden);
  await page.locator("#pp-changes").click();
  await page.reload();
  await page.waitForFunction(() => !document.querySelector("#pp-changes").hidden);
  if (JSON.stringify(await marks()) !== expected) throw new Error(`A reload lost the changes: ${JSON.stringify(await marks())}`);

  await page.keyboard.press("c");
  await page.locator(".pp-answer").filter({ hasText: "Changed" }).first().waitFor();
  await page.locator(".pp-answer").filter({ hasText: "Kept" }).first().waitFor();
  await page.keyboard.press("Escape");

  // Another review on the same server opens in the saved theme.
  const other = await page.context().newPage();
  await other.goto(config.otherUrl);
  await other.getByRole("heading", { name: "ACM-124: Export", exact: true }).waitFor();
  if (await other.evaluate(() => document.documentElement.dataset.theme) !== "dark") throw new Error("The second review did not open in the saved theme.");
  await other.close();

  const approve = page.locator("#pp-approve");
  await page.waitForFunction(() => !document.querySelector("#pp-approve").disabled, null, { timeout: 15_000 });
  await approve.click();
  await page.getByRole("dialog").getByText(`Approve revision ${config.revision} and start work-ticket?`).waitFor();
  await page.getByRole("dialog").getByRole("button", { name: "Approve" }).click();
  await page.locator("#pp-banner.approved").waitFor();
  if (!(await page.locator("#pp-comment").isDisabled())) throw new Error("Comments stayed open after approval.");
  const external = page.__presentPlanExternal || [];
  if (external.length) throw new Error(`External requests: ${external.join(", ")}`);
  return { passed: true, revision: config.revision, approved: true, attention: { arrived, acknowledged }, changes };
}
