// Locally maintained V2 integration. The Herdr installer can overwrite this file.
import net from "node:net";
import { Plugin } from "@opencode/plugin";

const SOURCE = "herdr:opencode";
let reportSeq = Date.now() * 1000;

function request(method, params) {
  return new Promise((resolve) => {
    const client = net.createConnection(process.env.HERDR_SOCKET_PATH);
    const timer = setTimeout(finish, 500);
    function finish() {
      clearTimeout(timer);
      client.destroy();
      resolve();
    }
    client.once("connect", () => {
      client.write(JSON.stringify({
        id: `${SOURCE}:${++reportSeq}`,
        method,
        params: {
          pane_id: process.env.HERDR_PANE_ID,
          source: SOURCE,
          agent: "opencode",
          seq: reportSeq,
          ...params,
        },
      }) + "\n");
    });
    client.once("data", finish);
    client.once("error", finish);
    client.once("close", finish);
  });
}

export default Plugin.define({
  id: "herdr-agent-state",
  setup(ctx) {
    if (process.env.HERDR_ENV !== "1" || !process.env.HERDR_SOCKET_PATH || !process.env.HERDR_PANE_ID) return;

    const controller = new AbortController();
    const sessions = new Map();
    const pending = new Map();
    let currentRoot;
    let working = false;
    let failed = false;

    async function rootFor(sessionID) {
      const visited = new Set();
      while (sessionID && !visited.has(sessionID)) {
        visited.add(sessionID);
        let info = sessions.get(sessionID);
        if (!info) {
          info = await ctx.session.get({ sessionID }).catch(() => undefined);
          if (!info) return;
          sessions.set(sessionID, info);
        }
        if (info.location.directory !== ctx.location.directory) return;
        if (!info.parentID) return sessionID;
        sessionID = info.parentID;
      }
    }

    function forget(root) {
      for (const [key, owner] of pending) if (owner.root === root) pending.delete(key);
    }

    async function reportState() {
      const blocked = failed || [...pending.values()].some((owner) => owner.root === currentRoot);
      await request("pane.report_agent", {
        state: blocked ? "blocked" : working ? "working" : "idle",
        ...(currentRoot ? { agent_session_id: currentRoot } : {}),
      });
    }

    async function consume() {
      for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
        if (controller.signal.aborted) break;
        const data = event.data;
        const sessionID = event.type === "form.created" ? data.form.sessionID : data.sessionID;
        if (!sessionID) continue;

        if (event.type === "session.created") sessions.set(sessionID, data);
        if (event.type === "session.moved") {
          sessions.delete(sessionID);
          if (sessionID === currentRoot && data.location.directory !== ctx.location.directory) {
            forget(currentRoot);
            currentRoot = undefined;
            working = failed = false;
            await reportState();
          }
        }
        if (event.type === "session.deleted") {
          sessions.delete(sessionID);
          let cleared = false;
          for (const [key, owner] of pending) {
            if (owner.sessionID === sessionID) {
              pending.delete(key);
              cleared = true;
            }
          }
          // Child deletions must not clear the pane's root conversation.
          if (sessionID === currentRoot) {
            forget(currentRoot);
            currentRoot = undefined;
            working = failed = false;
            await reportState();
          } else if (cleared) {
            await reportState();
          }
          continue;
        }

        const root = await rootFor(sessionID);
        if (!root) continue;
        const primary = root === sessionID;
        const selectsRoot = primary && (event.type === "session.created" || event.type === "session.inbox.enqueued");
        if (!currentRoot || selectsRoot) {
          if (currentRoot !== root) working = failed = false;
          currentRoot = root;
          await request("pane.report_agent_session", {
            agent_session_id: root,
            ...(event.type === "session.created" && primary ? { session_start_source: "new" } : {}),
          });
        }
        if (root !== currentRoot) continue;

        switch (event.type) {
          case "permission.asked":
            pending.set(`permission:${data.id}`, { root, sessionID });
            break;
          case "permission.replied":
            pending.delete(`permission:${data.requestID}`);
            break;
          case "form.created":
            pending.set(`form:${data.form.id}`, { root, sessionID });
            break;
          case "form.replied":
          case "form.cancelled":
            pending.delete(`form:${data.id}`);
            break;
          case "session.execution.started":
          case "session.inbox.enqueued":
            if (!primary) continue;
            working = true;
            failed = false;
            break;
          case "session.status":
            if (!primary) continue;
            working = data.status.type !== "idle";
            if (working) failed = false;
            break;
          case "session.execution.failed":
            if (!primary) continue;
            working = false;
            failed = true;
            forget(root);
            break;
          case "session.execution.succeeded":
          case "session.execution.interrupted":
          case "session.idle":
            if (!primary) continue;
            working = false;
            forget(root);
            break;
          default:
            continue;
        }
        await reportState();
      }
    }
    void consume().catch((error) => {
      if (!controller.signal.aborted) console.warn("[herdr] Event subscription failed:", error);
    });
    return () => {
      controller.abort();
      sessions.clear();
      pending.clear();
    };
  },
});
