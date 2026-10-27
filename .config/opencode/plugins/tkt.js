// tkt's OpenCode plugin. tkt hook tmp --install wrote it, and writes it
// again each time it runs; change tkt, not this file. In a ticket's
// worktree it gives each shell the ticket's own TMPDIR, moves the new /tmp
// paths an agent types into that directory, and tells the agent so. tkt
// hook tmp decides each call; elsewhere it does nothing. It also tells tkt
// hook event about each new prompt, each status line and each skill started
// in a session, in order, so tkt need not read a long session back.
import { spawn, spawnSync } from "node:child_process"

const tkt = "/home/roger/.local/bin/tkt"

// tell hands tkt hook event one event, after the ones before it, without
// holding up the service while tkt runs.
let told = Promise.resolve()
function tell(ev) {
	told = told.then(() => new Promise((resolve) => {
		try {
			const p = spawn(tkt, ["hook", "event", "--json"], { stdio: ["pipe", "ignore", "ignore"], timeout: 5000 })
			p.on("error", resolve)
			p.on("close", resolve)
			p.stdin.end(JSON.stringify(ev))
		} catch {
			resolve()
		}
	}))
}

function ask(req) {
	try {
		const r = spawnSync(tkt, ["hook", "tmp", "--json"], { input: JSON.stringify(req), encoding: "utf8", timeout: 5000 })
		if (r.status !== 0 || !r.stdout) return undefined
		const env = JSON.parse(r.stdout)
		return env.ok ? env.result : undefined
	} catch {
		return undefined
	}
}

export default {
	id: "tkt",
	async setup(ctx) {
		// A session's directory, the worktree it works in. Unknown, it is
		// none: a guess could move another session's paths.
		const sessions = new Map()
		async function dirOf(sessionID) {
			if (!sessionID || !ctx.session?.get) return undefined
			if (!sessions.has(sessionID)) {
				const info = await ctx.session.get({ sessionID }).catch(() => undefined)
				sessions.set(sessionID, info?.location?.directory)
			}
			return sessions.get(sessionID)
		}
		if (ctx.tool?.hook) {
			await ctx.tool.hook("execute.before", async (event) => {
				if (!event.input || typeof event.input !== "object") return
				const dir = await dirOf(event.sessionID)
				if (!dir) return
				// A skill's start, such as work-ticket's after the plan viewer's
				// approval, tells tkt the stage moved on.
				if (event.tool === "skill" && typeof event.input.name === "string") {
					tell({ directories: [dir], session: event.sessionID, skill: event.input.name })
				}
				const r = ask({ directories: [dir], tool: event.tool, input: event.input })
				// In place, as OpenCode may hold on to the object it passed.
				if (r?.input) Object.assign(event.input, r.input)
			})
		}
		if (ctx.shell?.hook) {
			await ctx.shell.hook("create.before", (event) => {
				const r = ask({ directories: [event.cwd], tmpdir: event.env?.TMPDIR, command: event.command })
				if (r?.tmpdir && event.env) event.env.TMPDIR = r.tmpdir
				if (r?.command) event.command = r.command
			})
		}
		if (ctx.session?.hook) {
			await ctx.session.hook("context", async (event) => {
				const dir = await dirOf(event.sessionID)
				if (!dir) return
				const r = ask({ directories: [dir] })
				if (r?.system && Array.isArray(event.system)) event.system.push({ type: "text", text: r.system })
			})
		}
		if (!ctx.event?.subscribe) return
		const controller = new AbortController()
		void (async () => {
			for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
				const data = event.data ?? {}
				let ev
				if (event.type === "session.inbox.delivered") ev = { turn: "new" }
				else if (event.type === "session.text.ended") {
					const statuses = [...String(data.text ?? "").matchAll(/Status: ([A-Z_]+)/g)].map((m) => m[1])
					if (statuses.length > 0) ev = { statuses }
				}
				if (!ev || !data.sessionID) continue
				const dir = await dirOf(data.sessionID)
				if (dir) tell({ directories: [dir], session: data.sessionID, ...ev })
			}
		})().catch(() => {})
		return () => controller.abort()
	},
}
