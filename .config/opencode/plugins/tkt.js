// tkt's OpenCode plugin. tkt hook tmp --install wrote it, and writes it
// again each time it runs; change tkt, not this file. In a ticket's
// worktree it gives each shell the ticket's own TMPDIR, moves the new /tmp
// paths an agent types into that directory, and tells the agent so. tkt
// hook tmp decides each call; elsewhere it does nothing.
import { spawnSync } from "node:child_process"

const tkt = "/home/roger/.local/bin/tkt"

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
	},
}
