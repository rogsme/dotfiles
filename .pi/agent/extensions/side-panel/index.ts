import type { ExtensionAPI, ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";
import type { Component, OverlayHandle, TUI } from "@earendil-works/pi-tui";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { basename, isAbsolute, relative, resolve, sep } from "node:path";

export const PANEL_WIDTH = 42;
export const PANEL_MIN_TERMINAL_WIDTH = 120;

export type TodoStatus = "pending" | "in_progress" | "completed" | "deleted";

export interface PanelTodo {
	id: number;
	subject: string;
	status: TodoStatus;
	activeForm?: string;
	blockedBy?: number[];
	completedOrder?: number;
}

export type SubagentStatus = "queued" | "running" | "completed" | "failed" | "error" | "stopped" | "aborted";

export interface PanelSubagent {
	id: string;
	type: string;
	description: string;
	status: SubagentStatus;
	startedAt?: number;
	completedAt?: number;
	durationMs?: number;
	toolUses?: number;
	tokens?: number;
	compactionCount?: number;
}

export type SubagentEventName =
	| "subagents:created"
	| "subagents:started"
	| "subagents:completed"
	| "subagents:failed"
	| "subagents:steered"
	| "subagents:compacted";

export interface GitFile {
	path: string;
	status: string;
	added?: number;
	deleted?: number;
	binary?: boolean;
}

export interface GitState {
	isRepo: boolean;
	branch?: string;
	files: GitFile[];
}

export interface ActiveTool {
	id: string;
	name: string;
	description?: string;
}

export interface ContextSnapshot {
	tokens: number | null;
	contextWindow: number;
	percent: number | null;
}

export interface PanelSnapshot {
	sessionName: string;
	cwd: string;
	model: string;
	thinking: string;
	elapsedMs: number;
	context?: ContextSnapshot;
	cost: number;
	agentRunning: boolean;
	activeTools: ActiveTool[];
	todos: PanelTodo[];
	subagents: PanelSubagent[];
	git: GitState;
}

export interface PrioritizedLine {
	text: string;
	priority: number;
}

export interface PanelSection {
	lines: PrioritizedLine[];
}

type UnknownRecord = Record<string, unknown>;

const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const MUTATING_TOOLS = new Set(["edit", "write", "apply_patch", "bash"]);
const PANEL_STATE = Symbol.for("pi.side-panel.state");
const globals = globalThis as Record<PropertyKey, unknown>;
const processState = (globals[PANEL_STATE] ??= { enabled: true }) as { enabled: boolean };

export function updatePanelPreference(action: "show" | "hide" | "toggle"): boolean {
	return processState.enabled = action === "show" ? true : action === "hide" ? false : !processState.enabled;
}

const SUBAGENT_EVENTS: SubagentEventName[] = [
	"subagents:created",
	"subagents:started",
	"subagents:completed",
	"subagents:failed",
	"subagents:steered",
	"subagents:compacted",
];

function record(value: unknown): UnknownRecord | undefined {
	return value !== null && typeof value === "object" ? (value as UnknownRecord) : undefined;
}

function string(value: unknown): string | undefined {
	return typeof value === "string" ? value : undefined;
}

function number(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function baseToolName(name: string): string {
	return name.split(/[./:]/).at(-1) ?? name;
}

export function shortPath(path: string, home = process.env.HOME): string {
	if (!home) return path;
	const rel = relative(resolve(home), resolve(path));
	return rel === "" ? "~" : rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel) ? `~${sep}${rel}` : path;
}

export function compactNumber(value: number): string {
	const absolute = Math.abs(value);
	if (absolute < 1_000) return Math.round(value).toLocaleString("en-US");
	if (absolute < 1_000_000) return `${(value / 1_000).toFixed(absolute < 10_000 ? 1 : 0)}k`;
	return `${(value / 1_000_000).toFixed(absolute < 10_000_000 ? 1 : 0)}M`;
}

export function formatDuration(milliseconds: number): string {
	const seconds = Math.max(0, Math.floor(milliseconds / 1_000));
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
	const hours = Math.floor(minutes / 60);
	return `${hours}h ${minutes % 60}m`;
}

export function formatCost(cost: number): string {
	return `$${cost < 0.01 ? cost.toFixed(4) : cost.toFixed(2)}`;
}

export function describeTool(name: string, args: unknown): string | undefined {
	const input = record(args) ?? {};
	const tool = baseToolName(name);
	const path = string(input.path);
	switch (tool) {
		case "read":
		case "edit":
		case "write":
			return path ? basename(path) || path : undefined;
		case "grep":
			return string(input.pattern);
		case "find":
			return string(input.pattern) ?? string(input.glob);
		case "bash":
			return string(input.command)?.split("\n", 1)[0]?.trim();
		case "Agent":
		case "agent":
			return string(input.description) ?? string(input.subagent_type);
		case "todo":
			return string(input.activeForm) ?? string(input.subject) ?? string(input.action);
		default:
			return string(input.description) ?? path;
	}
}

function isTodoStatus(value: unknown): value is TodoStatus {
	return value === "pending" || value === "in_progress" || value === "completed" || value === "deleted";
}

function todoTasks(details: unknown): UnknownRecord[] | undefined {
	const value = record(details);
	return Array.isArray(value?.tasks) && number(value.nextId) !== undefined
		? value.tasks.map(record).filter((task): task is UnknownRecord => !!task)
		: undefined;
}

/** Apply one persisted todo snapshot while retaining completion recency. */
export function updateTodosFromDetails(details: unknown, previous: readonly PanelTodo[] = [], order = 1): PanelTodo[] {
	const tasks = todoTasks(details);
	if (!tasks) return [...previous];
	const before = new Map(previous.map((task) => [task.id, task]));
	const parsed: PanelTodo[] = [];
	for (const task of tasks) {
		const id = number(task.id);
		const subject = string(task.subject) ?? string(task.text);
		const status = task.done === true ? "completed" : task.done === false ? "pending" : task.status;
		if (id === undefined || !subject || !isTodoStatus(status)) continue;
		const prior = before.get(id);
		parsed.push({
			id,
			subject,
			status,
			...(string(task.activeForm) ? { activeForm: string(task.activeForm) } : {}),
			...(Array.isArray(task.blockedBy)
				? { blockedBy: task.blockedBy.filter((item): item is number => typeof item === "number") }
				: {}),
			...(status === "completed"
				? { completedOrder: prior?.status === "completed" ? prior.completedOrder : order }
				: {}),
		});
	}
	return sortTodos(parsed.filter((task) => task.status !== "deleted"));
}

export function sortTodos(todos: readonly PanelTodo[]): PanelTodo[] {
	const rank: Record<TodoStatus, number> = { in_progress: 0, pending: 1, completed: 2, deleted: 3 };
	return [...todos].sort((a, b) => {
		const status = rank[a.status] - rank[b.status];
		if (status !== 0) return status;
		if (a.status === "completed") return (b.completedOrder ?? 0) - (a.completedOrder ?? 0);
		return a.id - b.id;
	});
}

/** Reconstruct todo state from the latest valid snapshots on an active session branch. */
export function reconstructTodos(entries: Iterable<unknown>): PanelTodo[] {
	let todos: PanelTodo[] = [];
	let order = 0;
	for (const entryValue of entries) {
		const entry = record(entryValue);
		const message = record(entry?.message);
		if (entry?.type !== "message" || message?.role !== "toolResult" || baseToolName(string(message.toolName) ?? "") !== "todo") continue;
		if (!todoTasks(message.details)) continue;
		todos = updateTodosFromDetails(message.details, todos, ++order);
	}
	return todos;
}

function subagentStatus(value: unknown): SubagentStatus | undefined {
	return value === "queued" || value === "running" || value === "completed" || value === "failed" || value === "error" || value === "stopped" || value === "aborted"
		? value
		: undefined;
}

function terminalSubagent(status: SubagentStatus): boolean {
	return status === "completed" || status === "failed" || status === "error" || status === "stopped" || status === "aborted";
}

/** Pure, order-safe reducer for pi-subagents lifecycle events. */
export function reduceSubagentEvent(
	current: Readonly<Record<string, PanelSubagent>>,
	eventName: SubagentEventName,
	payload: unknown,
	now = Date.now(),
): Record<string, PanelSubagent> {
	const data = record(payload);
	const id = string(data?.id);
	if (!id) return { ...current };
	const nextCurrent = { ...current };
	const type = string(data?.type);
	const description = string(data?.description);
	const temporary = Object.values(nextCurrent).find((agent) => agent.id.startsWith("tool:")
		&& agent.status === "running" && (!type || agent.type === type) && (!description || agent.description === description));
	if (temporary) delete nextCurrent[temporary.id];
	const prior = nextCurrent[id];
	const created: PanelSubagent = prior ?? {
		id,
		type: string(data?.type) ?? "Agent",
		description: string(data?.description) ?? "Subagent",
		status: eventName === "subagents:started" ? "running" : "queued",
	};
	let next = { ...created };
	if (string(data?.type)) next.type = string(data?.type)!;
	if (string(data?.description)) next.description = string(data?.description)!;

	if (eventName === "subagents:started" && !terminalSubagent(next.status)) {
		next.status = "running";
		next.startedAt ??= now;
	} else if (eventName === "subagents:completed" || eventName === "subagents:failed") {
		next.status = eventName === "subagents:completed" ? "completed" : (subagentStatus(data?.status) ?? "failed");
		next.completedAt = now;
		next.durationMs = number(data?.durationMs) ?? (next.startedAt ? now - next.startedAt : undefined);
		next.toolUses = number(data?.toolUses) ?? next.toolUses;
		next.tokens = number(record(data?.tokens)?.total) ?? next.tokens;
	} else if (eventName === "subagents:compacted") {
		next.compactionCount = number(data?.compactionCount) ?? (next.compactionCount ?? 0) + 1;
	}
	return { ...nextCurrent, [id]: next };
}

export function startForegroundSubagent(
	current: Readonly<Record<string, PanelSubagent>>,
	toolCallId: string,
	toolName: string,
	args: unknown,
	now = Date.now(),
): Record<string, PanelSubagent> {
	const input = record(args);
	if (baseToolName(toolName).toLowerCase() !== "agent" || input?.run_in_background === true) return { ...current };
	const id = `tool:${toolCallId}`;
	return { ...current, [id]: {
		id,
		type: string(input?.subagent_type) ?? "Agent",
		description: string(input?.description) ?? "Subagent",
		status: "running",
		startedAt: now,
	} };
}

export function endForegroundSubagent(
	current: Readonly<Record<string, PanelSubagent>>,
	toolCallId: string,
	result: unknown,
	isError: boolean,
	now = Date.now(),
): Record<string, PanelSubagent> {
	const next = { ...current };
	const temporary = next[`tool:${toolCallId}`];
	delete next[`tool:${toolCallId}`];
	const details = record(record(result)?.details);
	const id = string(details?.agentId) ?? string(details?.id);
	if (temporary && id && !next[id]) next[id] = {
		...temporary,
		id,
		status: isError ? "failed" : "completed",
		completedAt: now,
		durationMs: number(details?.durationMs) ?? now - (temporary.startedAt ?? now),
		toolUses: number(details?.toolUses),
	};
	return next;
}

/** Merge NUL-delimited porcelain v1 status with NUL-delimited numstat output. */
export function parseGit(statusOutput: string, numstatOutput = ""): GitState {
	const statusFields = statusOutput.split("\0");
	const header = statusFields[0]?.startsWith("## ") ? statusFields.shift()!.slice(3) : "";
	let branch: string | undefined;
	if (header.startsWith("No commits yet on ")) branch = header.slice("No commits yet on ".length);
	else if (header.startsWith("Initial commit on ")) branch = header.slice("Initial commit on ".length);
	else if (header.startsWith("HEAD (no branch)")) branch = "detached";
	else branch = header.split("...", 1)[0]?.split(" ", 1)[0] || undefined;

	const stats = new Map<string, Pick<GitFile, "added" | "deleted" | "binary">>();
	const numstatFields = numstatOutput.split("\0");
	for (let index = 0; index < numstatFields.length; index++) {
		const field = numstatFields[index];
		const first = field.indexOf("\t");
		const second = first < 0 ? -1 : field.indexOf("\t", first + 1);
		if (first < 0 || second < 0) continue;
		const addedText = field.slice(0, first);
		const deletedText = field.slice(first + 1, second);
		const inlinePath = field.slice(second + 1);
		const path = inlinePath || numstatFields[index += 2];
		if (!path) continue;
		stats.set(path, addedText === "-" || deletedText === "-"
			? { binary: true }
			: { added: Number(addedText) || 0, deleted: Number(deletedText) || 0 });
	}

	const files: GitFile[] = [];
	for (let index = 0; index < statusFields.length; index++) {
		const field = statusFields[index];
		if (field.length < 4) continue;
		const status = field.slice(0, 2).trim() || "?";
		const path = field.slice(3);
		files.push({ path, status, ...stats.get(path) });
		if (/[RC]/.test(field.slice(0, 2))) index++;
	}
	return { isRepo: true, branch, files };
}

export function calculateSessionCost(entries: Iterable<unknown>): number {
	let total = 0;
	for (const value of entries) {
		const entry = record(value);
		const message = record(entry?.message);
		if (entry?.type !== "message" || message?.role !== "assistant") continue;
		total += assistantCost(message);
	}
	return total;
}

function assistantCost(message: unknown): number {
	const usage = record(record(message)?.usage);
	return number(record(usage?.cost)?.total) ?? 0;
}

export function addFinalizedAssistantCost(cost: number, message: unknown): number {
	return record(message)?.role === "assistant" ? cost + assistantCost(message) : cost;
}

/** Pick highest-priority rows while preserving their original visual order. */
export function selectPanelLines(sections: readonly PanelSection[], height: number, footer: readonly string[]): string[] {
	if (height <= 0) return [];
	const footerLines = footer.slice(-height);
	const budget = Math.max(0, height - footerLines.length);
	const candidates = sections.flatMap((section, sectionIndex) =>
		section.lines.map((line, lineIndex) => ({ ...line, sectionIndex, lineIndex })),
	);
	const selected = new Set(
		[...candidates]
			.sort((a, b) => b.priority - a.priority || a.sectionIndex - b.sectionIndex || a.lineIndex - b.lineIndex)
			.slice(0, budget)
			.map((line) => `${line.sectionIndex}:${line.lineIndex}`),
	);
	const body = candidates
		.filter((line) => selected.has(`${line.sectionIndex}:${line.lineIndex}`))
		.sort((a, b) => a.sectionIndex - b.sectionIndex || a.lineIndex - b.lineIndex)
		.map((line) => line.text);
	while (body.length < budget) body.push("");
	return [...body, ...footerLines];
}

function capped<T>(items: readonly T[], limit: number): Array<T | number> {
	return items.length <= limit ? [...items] : [...items.slice(0, Math.max(0, limit - 1)), items.length - limit + 1];
}

function sectionsFor(snapshot: PanelSnapshot, theme: Theme, spinnerFrame: number): PanelSection[] {
	const heading = (text: string) => theme.fg("accent", theme.bold(` ${text}`));
	const text = (value: string) => ` ${theme.fg("text", value)}`;
	const muted = (value: string) => ` ${theme.fg("muted", value)}`;
	const dim = (value: string) => ` ${theme.fg("dim", value)}`;
	const context = snapshot.context;
	const tokenText = context
		? `${context.tokens === null ? "?" : compactNumber(context.tokens)} / ${compactNumber(context.contextWindow)} tokens`
		: "Context unavailable";
	const percentText = context?.percent === null || context?.percent === undefined ? "?% used" : `${Math.round(context.percent)}% used`;

	const activity: PrioritizedLine[] = [{ text: heading("Activity"), priority: 10_000 }];
	if (snapshot.activeTools.length) {
		for (const item of capped(snapshot.activeTools, 4)) {
			if (typeof item === "number") activity.push({ text: dim(`+${item} more active`), priority: 9_850 });
			else activity.push({ text: text(`● ${baseToolName(item.name)}${item.description ? ` · ${item.description}` : ""}`), priority: 20_000 });
		}
	} else {
		activity.push({ text: muted(snapshot.agentRunning ? "● Agent running" : "○ Idle"), priority: 20_000 });
	}

	const visibleTodos = snapshot.todos.filter((todo) => todo.status !== "deleted");
	const completedTodos = visibleTodos.filter((todo) => todo.status === "completed").length;
	const todoLines: PrioritizedLine[] = [{ text: heading(`Todos  ${completedTodos}/${visibleTodos.length}`), priority: 700 }];
	for (const item of capped(visibleTodos, 5)) {
		if (typeof item === "number") todoLines.push({ text: dim(`+${item} more`), priority: 230 });
		else {
			const glyph = item.status === "in_progress" ? "◐" : item.status === "completed" ? "✓" : "○";
			const label = item.status === "in_progress" && item.activeForm ? item.activeForm : item.subject;
			todoLines.push({ text: item.status === "completed" ? dim(`${glyph} ${label}`) : text(`${glyph} ${label}`), priority: item.status === "completed" ? 240 : 690 });
		}
	}

	const agents = [...snapshot.subagents].sort((a, b) => {
		const rank = (status: SubagentStatus) => status === "running" ? 0 : status === "queued" ? 1 : 2;
		return rank(a.status) - rank(b.status) || (b.completedAt ?? b.startedAt ?? 0) - (a.completedAt ?? a.startedAt ?? 0);
	});
	const activeAgents = agents.filter((agent) => agent.status === "running" || agent.status === "queued");
	const recentAgents = agents.filter((agent) => terminalSubagent(agent.status)).slice(0, 2);
	const shownAgents = [...activeAgents, ...recentAgents];
	const agentLines: PrioritizedLine[] = [{ text: heading(`Agents${shownAgents.length ? `  ${activeAgents.length} active` : ""}`), priority: 800 }];
	for (const item of capped(shownAgents, 5)) {
		if (typeof item === "number") {
			agentLines.push({ text: dim(`+${item} more`), priority: 220 });
			continue;
		}
		const running = item.status === "running";
		const glyph = running ? SPINNER[spinnerFrame % SPINNER.length] : item.status === "queued" ? "◦" : item.status === "completed" ? "✓" : "✗";
		const elapsed = running && item.startedAt ? formatDuration(Date.now() - item.startedAt) : item.durationMs !== undefined ? formatDuration(item.durationMs) : "";
		const stats = [elapsed, item.toolUses !== undefined ? `${item.toolUses} tools` : "", item.tokens !== undefined ? compactNumber(item.tokens) : ""].filter(Boolean).join(" · ");
		agentLines.push({
			text: running || item.status === "queued" ? text(`${glyph} ${item.type} · ${item.description}${stats ? ` · ${stats}` : ""}`) : dim(`${glyph} ${item.type} · ${item.description}${stats ? ` · ${stats}` : ""}`),
			priority: running ? 790 : item.status === "queued" ? 650 : 250,
		});
	}

	const git = snapshot.git;
	const gitSummary = !git.isRepo ? "Not a git repository" : `${git.branch ?? "unknown"} · ${git.files.length ? `${git.files.length} changed` : "clean"}`;
	const gitLines: PrioritizedLine[] = [{ text: heading(`Git  ${gitSummary}`), priority: 600 }];
	for (const item of capped(git.files, 7)) {
		if (typeof item === "number") {
			gitLines.push({ text: dim(`+${item} more`), priority: 190 });
			continue;
		}
		const stats = item.status === "?" || item.status === "??"
			? "?"
			: item.binary
				? "binary"
				: [item.added ? `+${item.added}` : "", item.deleted ? `-${item.deleted}` : ""].filter(Boolean).join(" ") || item.status;
		gitLines.push({ text: muted(`${item.path}  ${stats}`), priority: 200 });
	}

	return [
		{ lines: [
			{ text: heading("Session"), priority: 10_000 },
			{ text: text(snapshot.sessionName), priority: 20_000 },
			{ text: muted(shortPath(snapshot.cwd)), priority: 9_200 },
			{ text: muted(`${snapshot.model} · ${snapshot.thinking}`), priority: 9_800 },
			{ text: dim(`Elapsed ${formatDuration(snapshot.elapsedMs)}`), priority: 9_100 },
		] },
		{ lines: [
			{ text: heading("Context"), priority: 10_000 },
			{ text: text(tokenText), priority: 20_000 },
			{ text: muted(percentText), priority: 9_800 },
			{ text: muted(`${formatCost(snapshot.cost)} spent`), priority: 9_800 },
		] },
		{ lines: activity },
		{ lines: todoLines },
		{ lines: agentLines },
		{ lines: gitLines },
	];
}

function opaqueRow(content: string, width: number, theme: Theme): string {
	if (width <= 0) return "";
	const border = theme.fg("borderMuted", "│");
	const line = border + truncateToWidth(content, Math.max(0, width - 1), "…");
	const padded = line + " ".repeat(Math.max(0, width - visibleWidth(line)));
	return theme.bg("customMessageBg", truncateToWidth(padded, width, ""));
}

export function renderPanel(snapshot: PanelSnapshot, width: number, height: number, theme: Theme, spinnerFrame = 0): string[] {
	const footer = [mutedFooter(shortPath(snapshot.cwd), theme), mutedFooter("• Pi side panel", theme)];
	return selectPanelLines(sectionsFor(snapshot, theme, spinnerFrame), height, footer).map((line) => opaqueRow(line, width, theme));
}

function mutedFooter(value: string, theme: Theme): string {
	return ` ${theme.fg("dim", value)}`;
}

class SidePanel implements Component {
	constructor(
		private readonly tui: TUI,
		private readonly theme: Theme,
		private readonly snapshot: () => PanelSnapshot,
		private readonly frame: () => number,
	) {}

	render(width: number): string[] {
		return renderPanel(this.snapshot(), width, this.tui.terminal.rows, this.theme, this.frame());
	}

	invalidate(): void {}
}

export default function sidePanelExtension(pi: ExtensionAPI): void {
	let ctx: ExtensionContext | undefined;
	let tui: TUI | undefined;
	let panel: SidePanel | undefined;
	let handle: OverlayHandle | undefined;
	let alive = false;
	let sessionStartedAt = Date.now();
	let cost = 0;
	let todos: PanelTodo[] = [];
	let todoOrder = 0;
	let subagents: Record<string, PanelSubagent> = {};
	let git: GitState = { isRepo: false, files: [] };
	let agentRunning = false;
	let activeTools = new Map<string, ActiveTool>();
	let frame = 0;
	let renderTimer: ReturnType<typeof setInterval> | undefined;
	let gitTimer: ReturnType<typeof setTimeout> | undefined;
	let gitAbort: AbortController | undefined;
	const eventUnsubscribers: Array<() => void> = [];

	const requestRender = () => tui?.requestRender();
	const snapshot = (): PanelSnapshot => ({
		sessionName: pi.getSessionName() ?? "New session",
		cwd: ctx?.cwd ?? process.cwd(),
		model: ctx?.model?.id ?? "No model",
		thinking: pi.getThinkingLevel(),
		elapsedMs: Date.now() - sessionStartedAt,
		context: ctx?.getContextUsage(),
		cost,
		agentRunning,
		activeTools: [...activeTools.values()],
		todos,
		subagents: Object.values(subagents),
		git,
	});

	function rebuildSessionState(current: ExtensionContext): void {
		ctx = current;
		const header = current.sessionManager.getHeader();
		const timestamp = Date.parse(header.timestamp);
		sessionStartedAt = Number.isFinite(timestamp) ? timestamp : Date.now();
		cost = calculateSessionCost(current.sessionManager.getEntries());
		todos = reconstructTodos(current.sessionManager.getBranch());
		todoOrder = current.sessionManager.getBranch().length;
		requestRender();
	}

	async function refreshGit(): Promise<void> {
		const current = ctx;
		if (!current || !alive) return;
		gitAbort?.abort();
		const controller = new AbortController();
		gitAbort = controller;
		const [status, numstat] = await Promise.all([
			pi.exec("git", ["status", "--porcelain=v1", "--branch", "-z"], { cwd: current.cwd, signal: controller.signal, timeout: 2_500 }),
			pi.exec("git", ["diff", "--numstat", "-z", "HEAD"], { cwd: current.cwd, signal: controller.signal, timeout: 2_500 }),
		]).catch(() => []);
		if (!alive || controller.signal.aborted || current !== ctx) return;
		gitAbort = undefined;
		git = status?.code === 0 ? parseGit(status.stdout, numstat?.code === 0 ? numstat.stdout : "") : { isRepo: false, files: [] };
		requestRender();
	}

	function scheduleGit(): void {
		if (gitTimer) clearTimeout(gitTimer);
		gitTimer = setTimeout(() => {
			gitTimer = undefined;
			void refreshGit();
		}, 180);
	}

	function mount(current: ExtensionContext): void {
		if (current.mode !== "tui" || handle) return;
		alive = true;
		void current.ui.custom<void>((nextTui, theme) => {
			tui = nextTui;
			panel = new SidePanel(nextTui, theme, snapshot, () => frame);
			return panel;
		}, {
			overlay: true,
			overlayOptions: {
				anchor: "top-right",
				width: PANEL_WIDTH,
				maxHeight: "100%",
				margin: 0,
				nonCapturing: true,
				visible: (terminalWidth) => processState.enabled && terminalWidth >= PANEL_MIN_TERMINAL_WIDTH,
			},
			onHandle: (nextHandle) => {
				if (!alive) nextHandle.hide();
				else handle = nextHandle;
			},
		}).catch(() => {});
		renderTimer = setInterval(() => {
			frame = (frame + 1) % SPINNER.length;
			requestRender();
		}, 1_000);
	}

	function cleanup(): void {
		alive = false;
		if (renderTimer) clearInterval(renderTimer);
		if (gitTimer) clearTimeout(gitTimer);
		gitAbort?.abort();
		renderTimer = undefined;
		gitTimer = undefined;
		gitAbort = undefined;
		handle?.hide();
		handle = undefined;
		panel = undefined;
		tui = undefined;
		ctx = undefined;
		activeTools.clear();
		while (eventUnsubscribers.length) eventUnsubscribers.pop()?.();
	}

	function setVisibility(action: "show" | "hide" | "toggle", current: ExtensionContext): void {
		updatePanelPreference(action);
		handle?.setHidden(!processState.enabled);
		requestRender();
		if (processState.enabled && tui && tui.terminal.columns < PANEL_MIN_TERMINAL_WIDTH) {
			current.ui.notify(`Panel enabled; it will appear at ${PANEL_MIN_TERMINAL_WIDTH}+ columns.`, "info");
		} else {
			current.ui.notify(`Panel ${processState.enabled ? "shown" : "hidden"}.`, "info");
		}
	}

	pi.registerCommand("panel", {
		description: "Show, hide, or toggle the side panel",
		getArgumentCompletions: (prefix) => ["show", "hide", "toggle"]
			.filter((value) => value.startsWith(prefix))
			.map((value) => ({ value, label: value })),
		handler: async (args, current) => {
			const action = (args.trim() || "toggle") as "show" | "hide" | "toggle";
			if (action !== "show" && action !== "hide" && action !== "toggle") {
				current.ui.notify("Usage: /panel [show|hide|toggle]", "warning");
				return;
			}
			setVisibility(action, current);
		},
	});

	pi.registerShortcut("ctrl+shift+b", {
		description: "Toggle side panel",
		handler: async (current) => setVisibility("toggle", current),
	});

	for (const eventName of SUBAGENT_EVENTS) {
		eventUnsubscribers.push(pi.events.on(eventName, (payload) => {
			subagents = reduceSubagentEvent(subagents, eventName, payload);
			requestRender();
		}));
	}

	pi.on("session_start", (_event, current) => {
		agentRunning = false;
		activeTools = new Map();
		subagents = {};
		git = { isRepo: false, files: [] };
		rebuildSessionState(current);
		mount(current);
		void refreshGit();
	});

	pi.on("session_info_changed", () => requestRender());
	pi.on("model_select", () => requestRender());
	pi.on("thinking_level_select", () => requestRender());
	pi.on("agent_start", () => {
		agentRunning = true;
		requestRender();
	});
	pi.on("agent_settled", () => {
		agentRunning = false;
		activeTools.clear();
		requestRender();
	});
	pi.on("tool_execution_start", (event) => {
		activeTools.set(event.toolCallId, {
			id: event.toolCallId,
			name: event.toolName,
			description: describeTool(event.toolName, event.args),
		});
		subagents = startForegroundSubagent(subagents, event.toolCallId, event.toolName, event.args);
		requestRender();
	});
	pi.on("tool_execution_update", () => requestRender());
	pi.on("tool_execution_end", (event) => {
		activeTools.delete(event.toolCallId);
		const tool = baseToolName(event.toolName);
		subagents = endForegroundSubagent(subagents, event.toolCallId, event.result, event.isError);
		if (tool === "todo") {
			todos = updateTodosFromDetails(record(event.result)?.details, todos, ++todoOrder);
		}
		if (!event.isError && MUTATING_TOOLS.has(tool)) scheduleGit();
		requestRender();
	});
	pi.on("message_end", (event) => {
		cost = addFinalizedAssistantCost(cost, event.message);
		requestRender();
	});
	pi.on("session_tree", (_event, current) => {
		rebuildSessionState(current);
		scheduleGit();
	});
	pi.on("session_compact", (_event, current) => rebuildSessionState(current));
	pi.on("session_shutdown", cleanup);
}
