const { test } = require("node:test");
const assert = require("node:assert/strict");
const { format, publicText } = require("../assets/formatter.js");

test("daily headers, blank lines, and nested bullets share one lossless model", () => {
  const result = format("Hey team!\n\nTODAY 🛠️\n* Parent\n  * Child\n    * Grandchild\n* Other\n\nTOMORROW 🎯\n* Keep going\n\nGood day!");
  assert.equal(result.plain, "Hey team!\n\nTODAY 🛠️\n• Parent\n  • Child\n    • Grandchild\n• Other\n\nTOMORROW 🎯\n• Keep going\n\nGood day!");
  assert.match(result.html, /<strong>TODAY 🛠️<\/strong>/);
  assert.match(result.html, /<ul><li>Parent<ul><li>Child<ul><li>Grandchild<\/li><\/ul><\/li><\/ul><\/li><li>Other<\/li><\/ul>/);
  const listOps = result.delta.ops.filter(op => op.attributes?.list);
  assert.deepEqual(listOps.map(op => op.attributes.indent || 0), [0, 1, 2, 0, 0]);
  assert(listOps.every(op => op.insert === "\n"));
  assert.equal(result.delta.ops.map(op => op.insert).join(""), result.lines.map(l => l.runs.map(r => r.text).join("")).join("\n") + "\n");
});

test("internal Unicode bullets and known Slack emoji shortcodes", () => {
  const result = format("Good afternoon 🙂 :sweat_smile:\n\nSHIPPED\n• ACME-140 works (https://example.com/pr/140)\n\nNEEDS A DECISION @Roger\n• Please review", { mode: "internal" });
  assert.match(result.plain, /🙂 😅/);
  assert.match(result.html, /<a href="https:\/\/example.com\/pr\/140">/);
  assert(result.warnings[0].includes("@mentions"));
  assert(!JSON.stringify(result.delta).includes('"mention"'));
});

test("weekly themes become bold, while opening and reflection prose remain plain", () => {
  const result = format("Weekly Recap (Oct 1 to Oct 5) 🎯\n\nHey team! This was a short week.\n\nYour spreadsheets\nWe finished the import.\n\nVibes & Reflection 😄\nHappy with the result.", { mode: "weekly" });
  const headings = result.lines.filter(l => l.kind === "heading").map(l => l.runs.map(r => r.text).join(""));
  assert.deepEqual(headings, ["Weekly Recap (Oct 1 to Oct 5) 🎯", "Your spreadsheets", "Vibes & Reflection 😄"]);
  assert(!result.html.includes("<strong>Hey team!"));
});

test("private notes are removed case-insensitively with CRLF and before normalization", () => {
  const source = "Public update\r\n\r\n## INTERNAL NOTES\r\nPRIVATE_SENTINEL <script>alert(1)</script>\r\n";
  assert.equal(publicText(source), "Public update");
  const result = format(source);
  assert(!JSON.stringify(result).includes("PRIVATE_SENTINEL"));
});

test("every blank line is retained, including within paragraphs", () => {
  const result = format("First line\nSecond line\n\n\nThird paragraph");
  assert.equal(result.plain, "First line\nSecond line\n\n\nThird paragraph");
});

test("Markdown inline styles can be nested without loss", () => {
  const result = format("***Both*** [**link**](https://example.com?a=1&b=2) ~~gone~~ `x < y`", { mode: "markdown" });
  assert(result.delta.ops.some(op => op.insert === "Both" && op.attributes.bold && op.attributes.italic));
  assert.match(result.html, /href="https:\/\/example.com\?a=1&amp;b=2"/);
  assert.match(result.html, /<s>gone<\/s>/);
  assert.match(result.html, /<code>x &lt; y<\/code>/);
});

test("HTML-sensitive text is escaped; safe entities render once", () => {
  const result = format("A & B, 2 < 3, &lt;safe&gt;, &#x1f642;");
  assert.equal(result.plain, "A & B, 2 < 3, <safe>, 🙂");
  assert(!result.html.includes("<safe>"));
});

test("blockquotes and multiline code retain their block attributes", () => {
  const result = format("> First\n> Second\n\n```js\nconst a = 1;\nconst b = 2;\n```", { mode: "markdown" });
  assert.equal(result.delta.ops.filter(op => op.attributes?.blockquote).length, 2);
  assert.equal(result.delta.ops.filter(op => op.attributes?.["code-block"]).length, 2);
  assert.match(result.html, /<pre><code>const a = 1;\nconst b = 2;<\/code><\/pre>/);
});

test("ordered lists and mixed nested lists have real HTML nesting", () => {
  const result = format("1. First\n   * Child\n2. Second", { mode: "markdown" });
  assert.match(result.html, /<ol><li>First<ul><li>Child<\/li><\/ul><\/li><li>Second<\/li><\/ol>/);
  assert.deepEqual(result.delta.ops.filter(op => op.attributes?.list).map(op => op.attributes.list), ["ordered", "bullet", "ordered"]);
});

test("blank lines between root bullet items remain blank lines", () => {
  const result = format("* First\n\n* Second");
  assert.equal(result.plain, "• First\n\n• Second");
});

test("email addresses do not produce false mention warnings", () => {
  assert.deepEqual(format("Contact roger@example.com").warnings, []);
});

test("Markdown mode keeps plain capitalized lines plain", () => {
  assert(!format("PLAIN TEXT", { mode: "markdown" }).html.includes("<strong>"));
});

test("blank lines within a quote retain the quote structure", () => {
  const result = format("> First\n>\n> Second", { mode: "markdown" });
  assert.equal(result.lines.length, 3);
  assert(result.lines.every(line => line.kind === "quote"));
});

const rejected = [
  ["| A | B |\n|---|---|\n| 1 | 2 |", /table/],
  ["![image](https://example.com/a.png)", /image/],
  ["<script>alert(1)</script>", /html/],
  ["<img src=x onerror=alert(1)>", /html/],
  ["[bad](javascript:alert%281%29)", /Unsupported link/],
  ["[bad](data:text/html,hello)", /Unsupported link/],
  ["[relative](/path)", /Unsupported link/],
  ["* [x] Done", /checkboxes/],
  ["3. First", /start at 1/],
  ["1. First\n2. Second\n  * Under-indented child", /indentation/],
  ["1. First\n\n2. Second", /numbering/],
  ["> * Nested list", /inside blockquotes/],
  ["* One\n  continuation", /Line breaks/],
  ["* One\n\n  Second paragraph", /Multiple paragraphs/],
  ["* Root\n  * Child\n\n  * Second child", /Blank lines/],
  ["Some :custom_company_emoji:", /Unicode emoji/],
  ["Body\n\nBefore you send:\nPrivate flags", /review flags/],
  ["Body\n\n📝 Friday reminder: say weekly", /review flags/],
  ["", /empty/],
  ["x".repeat(100001), /100,000/],
];
for (const [source, expected] of rejected) test(`fail closed: ${source.slice(0, 60)}`, () => assert.throws(() => format(source), expected));
