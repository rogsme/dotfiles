// installed by herdr
// managed by herdr; reinstalling or updating the integration overwrites this file.
// add custom hooks/plugins beside this file instead of editing it.
// HERDR_INTEGRATION_ID=opencode
// HERDR_INTEGRATION_VERSION=8

import net from "node:net";

const SOURCE = "herdr:opencode";
const AGENT = "opencode";
let reportSeq = Date.now() * 1000;

// Subagent (task tool) sessions carry a parentID; the main agent session does
// not. Their lifecycle events would otherwise clobber the pane's real state, so
// learn child session ids from session.created/updated and drop their reports.
const childSessions = new Set();

function nextReportSeq() {
  reportSeq += 1;
  return reportSeq;
}

function sessionIDFromProperties(properties) {
  return typeof properties?.sessionID === "string" && properties.sessionID
    ? properties.sessionID
    : undefined;
}

function stateFromSessionStatus(status) {
  // session.status carries { type: "idle" | "busy" | "retry" }; older builds used a bare string.
  const kind = typeof status === "string" ? status : status?.type;
  if (typeof kind !== "string") return undefined;
  switch (kind.toLowerCase()) {
    case "idle":
      return "idle";
    case "active":
    case "busy":
    case "pending":
    case "running":
    case "streaming":
    case "working":
    case "retry":
      return "working";
    default:
      return undefined;
  }
}

function request(method, params) {
  const paneId = process.env.HERDR_PANE_ID;
  const socketPath = process.env.HERDR_SOCKET_PATH;

  if (!paneId || !socketPath) {
    return Promise.resolve();
  }

  const requestId = `${SOURCE}:${Date.now()}:${Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0")}`;
  const request = {
    id: requestId,
    method,
    params: {
      pane_id: paneId,
      source: SOURCE,
      agent: AGENT,
      seq: nextReportSeq(),
      ...params,
    },
  };

  return new Promise((resolve) => {
    const client = net.createConnection(socketPath, () => {
      client.write(`${JSON.stringify(request)}\n`);
    });

    const finish = () => {
      client.destroy();
      resolve();
    };

    client.setTimeout(500, finish);
    client.on("data", finish);
    client.on("error", finish);
    client.on("end", finish);
    client.on("close", resolve);
  });
}

function reportSession(sessionID, sessionStartSource) {
  if (!sessionID) {
    return Promise.resolve();
  }
  const params = { agent_session_id: sessionID };
  if (sessionStartSource) {
    params.session_start_source = sessionStartSource;
  }
  return request("pane.report_agent_session", params);
}

function reportState(state, sessionID) {
  const params = { state };
  if (sessionID) {
    params.agent_session_id = sessionID;
  }
  return request("pane.report_agent", params);
}

export const HerdrAgentStatePlugin = async () => {
  if (
    process.env.HERDR_ENV !== "1" ||
    !process.env.HERDR_SOCKET_PATH ||
    !process.env.HERDR_PANE_ID
  ) {
    return {};
  }

  return {
    "chat.message": async ({ sessionID }) => {
      if (sessionID && childSessions.has(sessionID)) {
        return;
      }
      await reportState("working", sessionID);
    },
    event: async ({ event }) => {
      const type = event?.type;
      const properties = event?.properties ?? {};
      const sessionID = sessionIDFromProperties(properties);

      const info = properties.info;
      if (info?.id && info.parentID) {
        childSessions.add(info.id);
      }
      if (sessionID && childSessions.has(sessionID)) {
        // Child session events are dropped so they cannot clobber the pane's
        // root-agent state, but a subagent waiting on the user must still
        // surface as blocked (and clear once answered). Report state only,
        // without an agent_session_id, so the pane keeps the root session.
        switch (type) {
          case "permission.asked":
          case "question.asked":
            await reportState("blocked");
            break;
          case "permission.replied":
          case "question.replied":
          case "question.rejected":
            await reportState("working");
            break;
          default:
            break;
        }
        return;
      }

      switch (type) {
        case "session.created":
          // A root session.created is a genuine new-session start (subagent
          // creates are dropped above). Signal it so herdr replaces the pane's
          // prior session id instead of treating the change as cross-talk.
          await reportSession(sessionID, "new");
          break;
        case "session.updated":
          await reportSession(sessionID);
          break;
        case "session.status": {
          const state = stateFromSessionStatus(properties.status);
          if (state) {
            await reportState(state, sessionID);
          } else {
            await reportSession(sessionID);
          }
          break;
        }
        case "tool.execute.before":
        case "tool.execute.after":
        case "permission.replied":
        case "question.replied":
        case "question.rejected":
        case "session.compacted":
          await reportState("working", sessionID);
          break;
        case "permission.asked":
        case "question.asked":
        case "session.error":
          await reportState("blocked", sessionID);
          break;
        case "session.idle":
          await reportState("idle", sessionID);
          break;
        case "session.deleted":
          break;
        default:
          break;
      }
    },
  };
};

// OpenCode 2 plugin API. Same observable behavior as HerdrAgentStatePlugin
// above; the V1 entrypoint stays for V1 host compatibility. NOTE: herdr
// manages this file (HERDR_INTEGRATION_VERSION=8) — reinstalling or updating
// the herdr integration overwrites it and removes this V2 block. Re-apply it
// after a herdr integration update, or relocate it to a custom plugin file
// beside this one.
import { Plugin } from "@opencode/plugin";

// V2 implementation: same observable behavior as HerdrAgentStatePlugin.
async function setup(ctx) {
  if (
    process.env.HERDR_ENV !== "1" ||
    !process.env.HERDR_SOCKET_PATH ||
    !process.env.HERDR_PANE_ID
  ) {
    return;
  }

  const controller = new AbortController();
  void (async () => {
    // V2 events are { type, data }-shaped (data.sessionID, data.id,
    // data.action, data.resources). This replicates the V1 event switch
    // (lines 125–194 of the original above):
    // - child-session tracking via session.created/updated (info.id + info.parentID),
    // - state reporting via reportState/reportSession, same event-type mapping,
    // - same "blocked without agent_session_id" behavior for child permissions/questions.
    for await (const { type, data: rawData } of ctx.event.subscribe({ signal: controller.signal })) {
      const data = rawData ?? {};
      const sessionID =
        typeof data.sessionID === "string" && data.sessionID ? data.sessionID : undefined;

      const info = data.info;
      if (info?.id && info.parentID) {
        childSessions.add(info.id);
      }
      if (sessionID && childSessions.has(sessionID)) {
        // Child session events are dropped so they cannot clobber the pane's
        // root-agent state, but a subagent waiting on the user must still
        // surface as blocked (and clear once answered). Report state only,
        // without an agent_session_id, so the pane keeps the root session.
        switch (type) {
          case "permission.asked":
          case "question.asked":
            await reportState("blocked");
            break;
          case "permission.replied":
          case "question.replied":
          case "question.rejected":
            await reportState("working");
            break;
          default:
            break;
        }
        continue;
      }

      switch (type) {
        case "session.created":
          // A root session.created is a genuine new-session start (subagent
          // creates are dropped above). Signal it so herdr replaces the pane's
          // prior session id instead of treating the change as cross-talk.
          await reportSession(sessionID, "new");
          break;
        case "session.updated":
          await reportSession(sessionID);
          break;
        case "session.status": {
          const state = stateFromSessionStatus(data.status);
          if (state) {
            await reportState(state, sessionID);
          } else {
            await reportSession(sessionID);
          }
          break;
        }
        case "tool.execute.before":
        case "tool.execute.after":
        case "permission.replied":
        case "question.replied":
        case "question.rejected":
        case "session.compacted":
          await reportState("working", sessionID);
          break;
        case "permission.asked":
        case "question.asked":
        case "session.error":
          await reportState("blocked", sessionID);
          break;
        case "session.idle":
          await reportState("idle", sessionID);
          break;
        case "session.deleted":
          break;
        default:
          break;
      }
    }
  })().catch(() => {});
  await ctx.session.hook("prompt", async (event) => {
    // V1 "chat.message" case: reportState("working", sessionID) unless child session.
    const record = (event && (event.data ?? event)) ?? {};
    const sessionID =
      typeof record.sessionID === "string" && record.sessionID ? record.sessionID : undefined;
    if (sessionID && childSessions.has(sessionID)) {
      return;
    }
    await reportState("working", sessionID);
  });
  return () => controller.abort();
}

export default { id: "herdr-agent-state", server: HerdrAgentStatePlugin, setup };
