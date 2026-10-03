// Locally maintained V2 integration. The Moshi installer can overwrite this file.
import { createConnection } from "node:net"
import { homedir } from "node:os"
import { basename, join } from "node:path"
import { Plugin } from "@opencode/plugin"

type SessionID = Parameters<Plugin.Context["session"]["get"]>[0]["sessionID"]
type Message = Awaited<ReturnType<Plugin.Context["session"]["context"]>>[number]
type Event = ReturnType<Plugin.Context["event"]["subscribe"]> extends AsyncIterable<infer T> ? T : never
type Envelope = Record<string, unknown>
type DaemonResponse = { type?: string; decision?: string }

function socketPath() {
  if (process.env.MOSHI_SOCKET_PATH) return process.env.MOSHI_SOCKET_PATH
  if (process.platform === "darwin") return join(homedir(), "Library", "Application Support", "Moshi", "moshi-hook.sock")
  if (process.platform === "win32") return "\\\\.\\pipe\\moshi-hook"
  return join(process.env.XDG_RUNTIME_DIR || "/tmp", "moshi-hook.sock")
}

function send(envelope: Envelope, signal: AbortSignal, wait = false): Promise<DaemonResponse | null> {
  if (signal.aborted) return Promise.resolve(null)
  return new Promise((resolve) => {
    const socket = createConnection({ path: socketPath() })
    const timer = setTimeout(() => finish(null), wait ? 305_000 : 1000)
    timer.unref()
    let settled = false
    let text = ""
    function finish(response: DaemonResponse | null) {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal.removeEventListener("abort", abort)
      socket.destroy()
      resolve(response)
    }
    function abort() { finish(null) }
    signal.addEventListener("abort", abort, { once: true })
    socket.once("error", abort)
    socket.once("connect", () => {
      socket.write(JSON.stringify(envelope) + "\n")
      if (!wait) socket.end()
    })
    function parse() {
      try { finish(JSON.parse(text.split("\n")[0])) } catch { finish(null) }
    }
    socket.on("data", (chunk) => {
      text += chunk.toString("utf8")
      if (text.length > 65_536) finish(null)
      else if (text.includes("\n")) parse()
    })
    socket.once("end", parse)
    socket.once("close", parse)
  })
}

function transcriptMessage(message: Message, sessionID: SessionID) {
  if (message.type !== "user" && message.type !== "assistant") return null
  const parts = message.type === "user"
    ? [
        ...(message.text ? [{ type: "text", text: message.text }] : []),
        ...(message.files || []).map((file) => ({ type: "file", mime: file.mime, filename: file.name, url: `data:${file.mime};base64,${file.data}` })),
      ]
    : message.content.map((part) => {
        if (part.type !== "tool") return part
        const state = part.state
        const content = "content" in state ? state.content || [] : []
        return {
          type: "tool", callID: part.id, tool: part.name,
          state: {
            ...state,
            status: state.status === "streaming" ? "pending" : state.status,
            output: content.flatMap((item) => item.type === "text" ? [item.text] : []).join("\n"),
            attachments: content.flatMap((item) => item.type === "file" ? [{ type: "file", mime: item.mime, filename: item.name, url: item.uri }] : []),
            error: "error" in state ? state.error : undefined,
            time: part.time,
          },
        }
      })
  // Keep content exclusively in parts so Moshi's part redaction remains effective.
  const { content, text, files, ...info } = message as Message & { content?: unknown; text?: unknown; files?: unknown }
  const model = message.type === "assistant" ? message.model : undefined
  return { info: { ...info, role: message.type, sessionID, modelID: model?.id, providerID: model?.providerID }, parts }
}

export default Plugin.define({
  id: "moshi-hooks",
  async setup(ctx) {
    const directory = ctx.location.directory
    const controller = new AbortController()
    const streams = new Set<ReadableStreamDefaultController<Uint8Array>>()
    const encoder = new TextEncoder()
    const owned = new Set<SessionID>()
    const running = new Set<SessionID>()
    const prompts = new Map<SessionID, string>()
    const sequence = new Map<SessionID, number>()
    const modelNames = new Map<SessionID, string>()
    const contextRemaining = new Map<SessionID, number>()
    const limits = new Map<string, number>()
    const pending = new Map<string, { sessionID: SessionID; controller: AbortController }>()

    // The TUI companion supplies pane identity; a shared server's terminal
    // environment belongs to whichever terminal first started the service.
    function envelope(sessionID: SessionID, eventName: string, fields: Envelope = {}): Envelope {
      return {
        source: "opencode", sessionId: sessionID, eventName, cwd: directory,
        projectName: basename(directory), serverUrl: `http://127.0.0.1:${relay.port}`,
        requestedAt: new Date().toISOString(),
        ...(modelNames.has(sessionID) ? { modelName: modelNames.get(sessionID) } : {}),
        ...(contextRemaining.has(sessionID) ? { contextRemaining: contextRemaining.get(sessionID) } : {}),
        ...fields,
      }
    }

    function notify(sessionID: SessionID, eventName: string, fields: Envelope = {}) {
      void send(envelope(sessionID, eventName, { type: "session.update", ...fields }), controller.signal)
    }

    async function owns(sessionID: SessionID) {
      const info = await ctx.session.get({ sessionID }).catch(() => null)
      if (!info || info.parentID || info.location.directory !== directory) return false
      owned.add(sessionID)
      if (info.model) modelNames.set(sessionID, info.model.id)
      return true
    }

    async function refreshLimits() {
      const models = await ctx.model.list()
      limits.clear()
      for (const model of models.data) limits.set(`${model.providerID}/${model.id}`, model.limit.context)
    }
    await refreshLimits().catch((error) => console.warn("[moshi] Model limits unavailable:", error))

    const relay = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      idleTimeout: 0,
      async fetch(req) {
        const url = new URL(req.url)
        if (req.method !== "GET") return new Response("forbidden", { status: 403 })
        if (url.pathname === "/global/health") return Response.json({ healthy: true })
        if (url.pathname === "/event") {
          let subscriber: ReadableStreamDefaultController<Uint8Array>
          return new Response(new ReadableStream<Uint8Array>({
            start(stream) { subscriber = stream; streams.add(stream); stream.enqueue(encoder.encode(": connected\n\n")) },
            cancel() { streams.delete(subscriber) },
          }), { headers: { "Content-Type": "text/event-stream" } })
        }
        const match = /^\/session\/([^/]+)\/message(?:\/([^/]+))?$/.exec(url.pathname)
        if (!match) return new Response("not found", { status: 404 })
        const sessionID = match[1] as SessionID
        if (!await owns(sessionID)) return new Response("not found", { status: 404 })
        try {
          const messages = await ctx.session.context({ sessionID })
          const rows = messages.map((message) => transcriptMessage(message, sessionID)).filter((row) => row !== null)
          if (!match[2]) return Response.json(rows)
          const row = rows.find((row) => row.info.id === match[2])
          return row ? Response.json(row) : new Response("not found", { status: 404 })
        } catch {
          return new Response("OpenCode transcript unavailable", { status: 502 })
        }
      },
    })

    function cancelPermission(requestID: string) {
      pending.get(requestID)?.controller.abort()
      pending.delete(requestID)
    }

    function cancelSessionPermissions(sessionID: SessionID) {
      for (const [id, request] of pending) if (request.sessionID === sessionID) cancelPermission(id)
    }

    function forget(sessionID: SessionID) {
      cancelSessionPermissions(sessionID)
      owned.delete(sessionID)
      running.delete(sessionID)
      prompts.delete(sessionID)
      sequence.delete(sessionID)
      modelNames.delete(sessionID)
      contextRemaining.delete(sessionID)
    }

    function finish(sessionID: SessionID, eventName: string, title: string) {
      cancelSessionPermissions(sessionID)
      if (!running.delete(sessionID)) return
      notify(sessionID, eventName, { category: "task_complete", title, message: prompts.get(sessionID) || "" })
    }

    function requestApproval(event: Extract<Event, { type: "permission.asked" }>) {
      const { id, sessionID, action, resources, message } = event.data
      if (pending.has(id)) return
      const request = { sessionID, controller: new AbortController() }
      pending.set(id, request)
      const abort = () => request.controller.abort()
      controller.signal.addEventListener("abort", abort, { once: true })
      const subtitle = action === "shell" ? "Waiting for command approval" : action === "edit" ? "Waiting for file edit approval" : "Waiting for approval"
      void send(envelope(sessionID, event.type, {
        type: "approval.request", actionId: id, phase: "waitingForApproval",
        category: "approval_required", toolName: action, title: "OpenCode permission", subtitle,
        message: message || `${action}: ${resources[0] || "permission requested"}`,
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
      }), request.controller.signal, true).then(async (result) => {
        const decision = result?.decision === "approve" ? "once" : result?.decision === "deny" ? "reject" : undefined
        if (!decision || request.controller.signal.aborted || pending.get(id) !== request) return
        // Recheck native pending state: a terminal reply may have beaten the daemon.
        const requests = await ctx.permission.list({ sessionID })
        if (request.controller.signal.aborted || !requests.some((item) => item.id === id)) return
        await ctx.permission.reply({ sessionID, requestID: id, decision })
      }).catch((error) => {
        if (!request.controller.signal.aborted) console.warn("[moshi] Permission response failed:", error)
      }).finally(() => {
        controller.signal.removeEventListener("abort", abort)
        if (pending.get(id) === request) pending.delete(id)
      })
    }

    function publishChange(sessionID: SessionID, messageID: string) {
      if (!messageID) return
      const data = encoder.encode("data: " + JSON.stringify({ type: "message.updated", properties: { sessionID, messageID } }) + "\n\n")
      for (const stream of streams) {
        try { stream.enqueue(data) } catch { streams.delete(stream) }
      }
    }

    async function consume() {
      for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
        if (controller.signal.aborted) break
        if (event.type === "model.updated") {
          await refreshLimits().catch((error) => console.warn("[moshi] Model limit refresh failed:", error))
          continue
        }
        const data = event.data
        const sessionID = event.type === "form.created" ? event.data.form.sessionID : "sessionID" in data ? data.sessionID : undefined
        if (!sessionID) continue
        if (event.type === "session.deleted" || (event.type === "session.moved" && event.data.location.directory !== directory)) {
          if (owned.has(sessionID)) {
            void send(envelope(sessionID, event.type, { type: "session.closed", category: "session_ended", title: "OpenCode session ended" }), controller.signal)
            forget(sessionID)
          }
          continue
        }
        if (!owned.has(sessionID) && !await owns(sessionID)) continue
        if ("durable" in event && event.durable) {
          if (event.durable.seq <= (sequence.get(sessionID) ?? -1)) continue
          sequence.set(sessionID, event.durable.seq)
        }
        switch (event.type) {
          case "session.created":
            notify(sessionID, event.type, { title: "OpenCode started" })
            break
          case "session.inbox.enqueued":
            if (event.data.item.type === "user") {
              const prompt = event.data.item.payload.text.trim()
              prompts.set(sessionID, prompt.length > 200 ? prompt.slice(0, 197) + "..." : prompt)
              running.add(sessionID)
              notify(sessionID, "chat.message", { category: "session_started", title: "OpenCode started", message: prompts.get(sessionID) })
            }
            break
          case "session.execution.started":
            running.add(sessionID)
            break
          case "session.execution.interrupted":
            finish(sessionID, event.type, "OpenCode interrupted")
            break
          case "session.execution.succeeded":
            finish(sessionID, event.type, "OpenCode complete")
            break
          case "session.execution.failed":
            finish(sessionID, event.type, "OpenCode failed")
            notify(sessionID, event.type, { category: "approval_required", title: "OpenCode blocked", subtitle: "Check terminal", message: "OpenCode reported an error" })
            break
          case "session.model.selected":
            modelNames.set(sessionID, event.data.model.id)
            contextRemaining.delete(sessionID)
            break
          case "session.compaction.ended":
            contextRemaining.delete(sessionID)
            break
          case "session.step.ended": {
            const messages = await ctx.session.context({ sessionID }).catch(() => [])
            const message = messages.find((item) => item.id === event.data.assistantMessageID)
            if (message?.type !== "assistant") break
            modelNames.set(sessionID, message.model.id)
            const window = limits.get(`${message.model.providerID}/${message.model.id}`)
            const tokens = event.data.tokens
            const used = tokens.input + tokens.cache.read + tokens.cache.write + tokens.output + tokens.reasoning
            if (window && used > 0) contextRemaining.set(sessionID, Math.max(0, 100 - Math.floor(100 * used / window)))
            else contextRemaining.delete(sessionID)
            break
          }
          case "permission.asked":
            requestApproval(event)
            break
          case "permission.replied":
            cancelPermission(event.data.requestID)
            notify(sessionID, event.type)
            break
          case "form.created":
            notify(sessionID, event.type, { category: "approval_required", title: "OpenCode needs input", subtitle: "Answer in terminal", message: event.data.form.title })
            break
          case "form.replied":
          case "form.cancelled":
            notify(sessionID, event.type)
            break
        }
        publishChange(sessionID, "assistantMessageID" in data ? data.assistantMessageID : "messageID" in data ? data.messageID : "inboxID" in data ? data.inboxID : "")
      }
    }
    void consume().catch((error) => {
      if (!controller.signal.aborted) console.warn("[moshi] Event subscription failed:", error)
    })
    return () => {
      controller.abort()
      for (const request of pending.values()) request.controller.abort()
      pending.clear()
      for (const stream of streams) { try { stream.close() } catch {} }
      streams.clear()
      relay.stop(true)
    }
  },
})
