async (page) => {
  const config = __CONFIG__;
  const external = [];
  page.__presentPlanExternal = external;
  // The page may load only the viewer and the pinned CDN files.
  await page.context().route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "127.0.0.1" || url.hostname === "cdn.jsdelivr.net") return route.continue();
    external.push(url.href);
    return route.abort();
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(config.url);
  await page.getByRole("heading", { name: "ACM-123: Pagination", exact: true }).waitFor();
  if (new URL(page.url()).search) throw new Error("The token stayed in the address bar after the cookie was set.");
  const overview = page.locator("#panel-overview");
  const full = page.locator("#panel-full");
  if (await full.isVisible()) throw new Error("The Full plan tab is not hidden by default.");
  if (await page.locator("body.comment-mode").count() || await page.locator("#pp-panel").isVisible()) throw new Error("Comment mode is on by default.");
  await overview.locator(".review-warning").filter({ hasText: "Not reviewed:" }).waitFor();
  if (await page.locator("article script").count()) throw new Error("The plan executed source HTML.");
  if (await page.locator("article img").count()) throw new Error("Remote image was not rendered as a reference.");
  await overview.locator(".badge.sev-blocker").filter({ hasText: "blocker" }).waitFor();
  const node = overview.locator(".diagram svg g.node").filter({ hasText: "API" });
  await node.waitFor({ timeout: 30_000 });
  if (await page.locator("#pp-approve").textContent() !== "Approve") throw new Error("A ticket plan shows no Approve button.");

  // Theme: the toggle switches to dark, and the server keeps the choice.
  await page.locator("#pp-theme").click();
  if (await page.evaluate(() => document.documentElement.dataset.theme) !== "dark") throw new Error("The theme toggle did not switch to dark.");
  const paper = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  if (paper !== "rgb(32, 33, 36)") throw new Error(`Dark mode paints ${paper}.`);
  await page.waitForFunction(() => fetch("api/state", { headers: { "X-Plan-Review": "1" } }).then((response) => response.json()).then((state) => state.theme === "dark"));

  // Comment mode: a word, a diagram box, a whole diagram, and a selected range.
  await page.keyboard.press("c");
  await page.locator("#pp-panel").waitFor({ state: "visible" });
  const comment = async (text) => {
    await page.locator(".pp-composer textarea").fill(text);
    await page.locator(".pp-composer button.primary").click();
  };
  const sentence = overview.getByText("Preserve the current response format.", { exact: true });
  const line = await sentence.boundingBox();
  await page.mouse.click(line.x + 4, line.y + line.height / 2);
  await comment("Name the format.");
  await node.click();
  await comment("Split the API box into read and write paths.");
  const svg = await overview.locator("figure[data-diagram] svg").first().boundingBox();
  await page.mouse.click(svg.x + svg.width - 4, svg.y + 4);
  await comment("Show the cache too.");
  const cell = overview.getByRole("cell", { name: "Empty page test" });
  const box = await cell.boundingBox();
  await page.mouse.move(box.x + 10, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 10, box.y + box.height / 2, { steps: 6 });
  await page.mouse.up();
  await comment("Name the test file.");
  if (await page.locator("#pp-drafts .pp-card").count() !== 4) throw new Error("Four drafts did not reach the panel.");
  if (!(await page.locator("#pp-approve").isDisabled())) throw new Error("Approve stayed enabled with unsent drafts.");

  // A link does not navigate in comment mode, and tabs still switch.
  await page.getByRole("tab", { name: "Full plan" }).click();
  await full.getByRole("heading", { name: "Implementation", exact: true }).waitFor();
  await full.getByText(/This diagram needs local-only source/).waitFor();
  await full.locator(".diagram svg g.node").filter({ hasText: "Cursor" }).waitFor({ timeout: 30_000 });
  await page.getByRole("tab", { name: "Overview" }).click();

  await page.locator("#pp-send").click();
  await page.locator("#pp-sent .pp-card").first().waitFor();
  await page.locator(".pp-batch-note").filter({ hasText: "waiting for the agent" }).waitFor();
  if (!(await page.locator("#pp-approve").isDisabled())) throw new Error("Approve stayed enabled while the agent revises.");

  await page.setViewportSize({ width: 390, height: 844 });
  const geometry = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
  if (geometry.content > geometry.width + 1) throw new Error(`Mobile page overflows: ${JSON.stringify(geometry)}`);
  await page.setViewportSize({ width: 1440, height: 1000 });
  if (external.length) throw new Error(`External requests: ${external.join(", ")}`);
  return { passed: true, comments: 4, theme: "dark", mobile: geometry };
}
