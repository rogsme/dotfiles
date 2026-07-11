import assert from "node:assert/strict";
import { serializeToolArguments, toolResultText } from "./viewer-tools.js";

assert.equal(serializeToolArguments({ path: "/tmp/a", offset: 3 }), '{"path":"/tmp/a","offset":3}');
const circular: Record<string, unknown> = {};
circular.self = circular;
assert.equal(serializeToolArguments(circular), "{…}");

const long = "x".repeat(600);
assert.equal(toolResultText(long, false).slice(0, 500), "x".repeat(500));
assert.match(toolResultText(long, false), /Space expand/);
assert.equal(toolResultText(long, true), long);
assert.equal(toolResultText("short", false), "short");
