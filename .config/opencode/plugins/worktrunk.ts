// V2 branch activity markers for `wt list`.
import { spawn } from "node:child_process"
import { Plugin } from "@opencode/plugin"

export default Plugin.define({
  id: "worktrunk",
  async setup(ctx) {
    const vcs = await ctx.vcs.get().catch((error) => {
      console.warn("[worktrunk] Repository lookup failed:", error)
      return null
    })
    if (vcs?.data.provider !== "git") return
    const controller = new AbortController()
    const sessions = new Map<string, boolean>()
    let previous: string | undefined
    let missingBinary = false

    async function update() {
      const marker = [...sessions.values()].some(Boolean) ? "🤖" : sessions.size ? "💬" : ""
      if (marker === previous || missingBinary) return
      const args = ["config", "state", "marker", ...(marker ? ["set", marker] : ["clear"])]
      await new Promise<void>((resolve) => {
        const child = spawn("wt", args, {
          cwd: ctx.location.directory,
          stdio: "ignore",
          signal: controller.signal,
          timeout: 2000,
        })
        child.once("error", (error: NodeJS.ErrnoException) => {
          if (controller.signal.aborted) return resolve()
          missingBinary = error.code === "ENOENT"
          console.warn("[worktrunk] Cannot update activity marker:", error.message)
          resolve()
        })
        child.once("close", (code) => {
          if (code === 0) previous = marker
          else if (!controller.signal.aborted && !missingBinary) console.warn(`[worktrunk] Marker update exited with ${code}`)
          resolve()
        })
      })
    }

    async function consume() {
      for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
        if (controller.signal.aborted) break
        if (!["session.status", "session.idle", "session.deleted", "session.moved", "session.execution.started", "session.execution.succeeded", "session.execution.failed", "session.execution.interrupted"].includes(event.type)) continue
        const data = event.data as { sessionID: string; status?: { type: string }; location?: { directory: string } }
        const sessionID = data.sessionID
        if (event.type === "session.deleted" || (event.type === "session.moved" && data.location?.directory !== ctx.location.directory)) {
          if (sessions.delete(sessionID)) await update()
          continue
        }
        if (!sessions.has(sessionID)) {
          const info = await ctx.session.get({ sessionID }).catch(() => null)
          if (!info || info.parentID || info.location.directory !== ctx.location.directory) continue
        }
        if (event.type !== "session.moved") {
          sessions.set(sessionID, event.type === "session.execution.started" || (event.type === "session.status" && data.status?.type !== "idle"))
        }
        await update()
      }
    }
    void consume().catch((error) => {
      if (!controller.signal.aborted) console.warn("[worktrunk] Event subscription failed:", error)
    })
    return () => {
      controller.abort()
      sessions.clear()
    }
  },
})
