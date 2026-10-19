async (page) => {
  const config = __CONFIG__;
  const frame = page.frameLocator("#artifact");
  await frame.getByRole("heading", { name: "Revision check", exact: true, includeHidden: true }).waitFor({ state: "attached", timeout: 30_000 });
  const artifact = page.frames().find((candidate) => candidate.url().includes("/artifact/"));
  const revision = await artifact.evaluate(() => document.documentElement.dataset.planRevision);
  if (revision !== String(config.revision)) throw new Error(`Expected revision ${config.revision}, got ${revision}`);
  await page.locator("#layoutGateOverlay").waitFor({ state: "hidden", timeout: 30_000 });
  await page.locator("#chatInput").fill("The review is finished. Approval remains in the conversation.");
  await page.locator("#sendAndEnd").click();
  await page.locator("#endedOverlay").waitFor({ state: "visible", timeout: 15_000 });
  const external = page.__presentPlanExternal || [];
  if (external.length) throw new Error(`External requests: ${external.join(", ")}`);
  return { passed: true, revision, endedWithoutApproval: true };
}
