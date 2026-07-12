import assert from "node:assert/strict";
import { visibleWidth } from "@earendil-works/pi-tui";
import type { Theme } from "@earendil-works/pi-coding-agent";
import {
	addFinalizedAssistantCost,
	endForegroundSubagent,
	parseGit,
	reconstructTodos,
	reduceSubagentEvent,
	renderPanel,
	selectPanelLines,
	startForegroundSubagent,
	updatePanelPreference,
	type PanelSnapshot,
} from "./index.ts";

const plainTheme = {
	fg: (_color: string, text: string) => text,
	bg: (_color: string, text: string) => text,
	bold: (text: string) => text,
} as Theme;
const ansiTheme = {
	fg: (_color: string, text: string) => `\x1b[31m${text}\x1b[0m`,
	bg: (_color: string, text: string) => `\x1b[44m${text}\x1b[0m`,
	bold: (text: string) => `\x1b[1m${text}\x1b[22m`,
} as Theme;
const snapshot = (overrides: Partial<PanelSnapshot> = {}): PanelSnapshot => ({
	sessionName: "Session",
	cwd: "/tmp",
	model: "model",
	thinking: "low",
	elapsedMs: 0,
	cost: 0,
	agentRunning: false,
	activeTools: [],
	todos: [],
	subagents: [],
	git: { isRepo: false, files: [] },
	...overrides,
});
const entry = (tasks: unknown[], nextId = 1) => ({
	type: "message",
	message: { role: "toolResult", toolName: "functions.todo", details: { tasks, nextId } },
});

// The latest valid todo snapshot wins; malformed snapshots lacking finite nextId do not replace it.
assert.deepEqual(reconstructTodos([
	entry([
		{ id: 1, subject: "old", status: "pending" },
		{ id: 2, subject: "done first", status: "completed" },
	], 3),
	{ type: "message", message: { role: "toolResult", toolName: "todo", details: { tasks: [], nextId: Infinity } } },
	entry([
		{ id: 1, subject: "working", status: "in_progress" },
		{ id: 2, subject: "done first", status: "completed" },
		{ id: 3, subject: "next", status: "pending" },
		{ id: 4, subject: "gone", status: "deleted" },
		{ id: 5, subject: "done latest", status: "completed" },
	], 6),
]).map(({ id, subject, status }) => ({ id, subject, status })), [
	{ id: 1, subject: "working", status: "in_progress" },
	{ id: 3, subject: "next", status: "pending" },
	{ id: 5, subject: "done latest", status: "completed" },
	{ id: 2, subject: "done first", status: "completed" },
]);

// A delayed start event must not resurrect a terminal subagent.
let agents = reduceSubagentEvent({}, "subagents:completed", { id: "a", description: "job", durationMs: 9 }, 20);
agents = reduceSubagentEvent(agents, "subagents:started", { id: "a" }, 30);
assert.equal(agents.a.status, "completed");
assert.equal(agents.a.completedAt, 20);
assert.equal(agents.a.startedAt, undefined);

// Foreground Agent calls appear immediately, reconcile to their real ID, and do not duplicate lifecycle events.
agents = startForegroundSubagent({}, "call-1", "functions.Agent", { subagent_type: "Explore", description: "inspect" }, 10);
assert.deepEqual(Object.keys(agents), ["tool:call-1"]);
agents = reduceSubagentEvent(agents, "subagents:started", { id: "agent-1", type: "Explore", description: "inspect" }, 11);
assert.deepEqual(Object.keys(agents), ["agent-1"]);
agents = endForegroundSubagent(agents, "call-1", { details: { agentId: "agent-1", durationMs: 5 } }, false, 15);
assert.deepEqual(Object.keys(agents), ["agent-1"]);
const reconciled = endForegroundSubagent(
	startForegroundSubagent({}, "call-2", "Agent", { subagent_type: "Plan", description: "plan" }, 20),
	"call-2",
	{ details: { agentId: "agent-2", durationMs: 7, toolUses: 2 } },
	false,
	27,
);
assert.equal(reconciled["agent-2"].status, "completed");
assert.equal(reconciled["agent-2"].toolUses, 2);
assert.deepEqual(startForegroundSubagent({}, "bg", "Agent", { run_in_background: true }), {});

// message_end supplies finalized usage before sessionManager persistence; rebuilding later replaces, not adds to, this cache.
assert.equal(addFinalizedAssistantCost(1, { role: "assistant", usage: { cost: { total: 0.25 } } }), 1.25);
assert.equal(addFinalizedAssistantCost(1, { role: "user" }), 1);

const status = [
	"## main...origin/main",
	"R  new name => literal\tfile",
	"old name -> literal\tfile",
	" M space -> arrow.txt",
	"?? loose => name.txt",
	" M image.png",
	"",
].join("\0");
const numstat = [
	"2\t1\t", "old name -> literal\tfile", "new name => literal\tfile",
	"4\t3\tspace -> arrow.txt",
	"-\t-\timage.png",
	"",
].join("\0");
assert.deepEqual(parseGit(status, numstat), {
	isRepo: true,
	branch: "main",
	files: [
		{ path: "new name => literal\tfile", status: "R", added: 2, deleted: 1 },
		{ path: "space -> arrow.txt", status: "M", added: 4, deleted: 3 },
		{ path: "loose => name.txt", status: "??" },
		{ path: "image.png", status: "M", binary: true },
	],
});
assert.equal(parseGit("## HEAD (no branch)\0").branch, "detached");
assert.equal(parseGit("## No commits yet on topic branch\0").branch, "topic branch");

// Symbol.for-backed preference survives this module's extension instances in-process.
assert.equal(updatePanelPreference("hide"), false);
assert.equal(updatePanelPreference("toggle"), true);
assert.equal(updatePanelPreference("show"), true);

assert.ok(renderPanel(snapshot(), 42, 30, plainTheme).some((line) => line.includes("Not a git repository")));

const narrow = renderPanel(snapshot({ sessionName: "漢字🙂 e\u0301 ".repeat(12) }), 42, 30, ansiTheme);
assert.equal(narrow.length, 30);
assert.ok(narrow.every((line) => visibleWidth(line) === 42));
assert.ok(narrow.some((line) => line.includes("\x1b[")));

assert.deepEqual(selectPanelLines([
	{ lines: [{ text: "keep", priority: 2 }, { text: "drop", priority: 1 }] },
], 3, ["cwd", "brand"]), ["keep", "cwd", "brand"]);
assert.deepEqual(renderPanel(snapshot(), 42, 2, plainTheme), [
	"│ /tmp".padEnd(42),
	"│ • Pi side panel".padEnd(42),
]);

const constrained = renderPanel(snapshot({
	context: { tokens: 12_345, contextWindow: 100_000, percent: 12.345 },
	agentRunning: true,
	activeTools: [{ id: "tool", name: "read", description: "important.ts" }],
}), 42, 8, plainTheme);
assert.equal(constrained.length, 8);
assert.ok(constrained.every((line) => visibleWidth(line) === 42));
assert.deepEqual(constrained.map((line) => line.trimEnd()), [
	"│ Session",
	"│ Session",
	"│ Context",
	"│ 12k / 100k tokens",
	"│ Activity",
	"│ ● read · important.ts",
	"│ /tmp",
	"│ • Pi side panel",
]);

const overflow = renderPanel(snapshot({
	activeTools: Array.from({ length: 6 }, (_, id) => ({ id: `${id}`, name: "read" })),
	todos: Array.from({ length: 7 }, (_, id) => ({ id, subject: `todo ${id}`, status: "pending" as const })),
	git: { isRepo: true, branch: "main", files: Array.from({ length: 9 }, (_, id) => ({ path: `f${id}`, status: "M" })) },
}), 42, 50, plainTheme);
assert.equal(overflow.length, 50);
assert.ok(overflow.every((line) => visibleWidth(line) === 42));
const overflowText = overflow.join("\n");
assert.match(overflowText, /\+3 more active/);
assert.equal(overflowText.match(/\+3 more/g)?.length, 3);

console.log("side-panel tests passed");
