import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// chat-paste carries present-plan's page logic for attention and change marks, word for word.
// An installed copy of this skill has no present-plan beside it, so the check runs only in the repository.
const present = new URL("../../../engineering/present-plan/assets/", import.meta.url);
const sibling = await readFile(new URL("changes.js", present), "utf8").then(() => true, () => false);

for (const file of ["attention.js", "changes.js"]) {
  test(`${file} matches present-plan's copy`, { skip: !sibling && "present-plan is not beside this skill" }, async () => {
    assert.equal(await readFile(new URL(`../assets/${file}`, import.meta.url), "utf8"), await readFile(new URL(file, present), "utf8"));
  });
}
