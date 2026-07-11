import { getAgentDir, type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { AssistantMessage, TextContent } from "@earendil-works/pi-ai";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const STATE = "plan-mode-state";
const CONTEXT = "plan-mode-context";
const READ_ONLY_TOOLS = new Set([
  "read", "grep", "find", "ls", "ask_user_question", "questionnaire",
  "web_search", "fetch_content", "get_search_content", "Agent",
]);

type State = {
  enabled: boolean;
  toolsBefore?: string[];
  plan?: string;
  planPath?: string;
};

function assistantText(message: AssistantMessage): string {
  return message.content
    .filter((part): part is TextContent => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function isAssistant(message: unknown): message is AssistantMessage {
  return !!message && typeof message === "object" && (message as { role?: string }).role === "assistant";
}

function slug(text: string): string {
  return (text.match(/^#{1,6}\s+(.+)$/m)?.[1] ?? "plan")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "plan";
}

export default function planMode(pi: ExtensionAPI): void {
  let state: State = { enabled: false };

  pi.registerFlag("plan", {
    description: "Start in read-only plan mode",
    type: "boolean",
    default: false,
  });

  function persist(): void {
    pi.appendEntry(STATE, state);
  }

  function render(ctx: ExtensionContext): void {
    ctx.ui.setStatus("plan-mode", state.enabled ? ctx.ui.theme.fg("warning", "⏸ plan") : undefined);
  }

  function enter(ctx: ExtensionContext): void {
    if (state.enabled) return;
    state = { enabled: true, toolsBefore: pi.getActiveTools() };
    pi.setActiveTools(pi.getAllTools().map((tool) => tool.name).filter((name) => READ_ONLY_TOOLS.has(name)));
    render(ctx);
    persist();
  }

  function leave(ctx: ExtensionContext): void {
    if (!state.enabled) return;
    pi.setActiveTools(state.toolsBefore ?? pi.getActiveTools());
    state = { enabled: false };
    render(ctx);
    persist();
  }

  async function savePlan(plan: string): Promise<string> {
    const directory = join(getAgentDir(), "plans");
    await mkdir(directory, { recursive: true });
    const path = state.planPath ?? join(directory, `${slug(plan)}-${Date.now()}.md`);
    await writeFile(path, `${plan.trim()}\n`, "utf8");
    return path;
  }

  async function toggle(ctx: ExtensionContext): Promise<void> {
    if (state.enabled) {
      leave(ctx);
      ctx.ui.notify("Plan mode disabled.", "info");
    } else {
      enter(ctx);
      ctx.ui.notify("Plan mode enabled. Read-only tools only.", "info");
    }
  }

  pi.registerCommand("plan", {
    description: "Toggle plan mode, optionally starting with a prompt",
    handler: async (args, ctx) => {
      await toggle(ctx);
      if (state.enabled && args.trim()) await pi.sendUserMessage(args.trim());
    },
  });

  pi.registerCommand("plan-exit", {
    description: "Exit plan mode",
    handler: async (_args, ctx) => {
      leave(ctx);
      ctx.ui.notify("Plan mode disabled.", "info");
    },
  });

  // Claude Code uses Shift+Tab; pi reserves it for thinking-level cycling.
  pi.registerShortcut("alt+m", {
    description: "Toggle plan mode",
    handler: toggle,
  });

  pi.on("tool_call", (event) => {
    if (!state.enabled) return;
    if (!READ_ONLY_TOOLS.has(event.toolName)) {
      return { block: true, reason: `Plan mode: ${event.toolName} is not read-only.` };
    }
    if (event.toolName === "Agent") {
      const input = event.input as {
        subagent_type?: string;
        isolation?: string;
        schedule?: string;
      };
      if (input.subagent_type !== "Explore" || input.isolation || input.schedule) {
        return { block: true, reason: "Plan mode permits only immediate, read-only Explore subagents." };
      }
    }
  });

  pi.on("before_agent_start", () => {
    if (!state.enabled) return;
    return {
      message: {
        customType: CONTEXT,
        display: false,
        content: `[PLAN MODE ACTIVE]\nExplore and design only; do not modify the project or execute implementation.\n\nUse read-only tools and the Explore subagent for codebase research. Ask focused clarifying questions when requirements materially affect the design.\n\nWhen ready, return the complete proposed implementation plan as Markdown beginning with \"# Plan\". Make it specific enough to execute, including affected files and verification. Do not ask for approval in prose; the plan review UI handles approval.`,
      },
    };
  });

  pi.on("context", (event) => {
    if (state.enabled) return;
    return {
      messages: event.messages.filter((message) => (message as { customType?: string }).customType !== CONTEXT),
    };
  });

  pi.on("agent_end", async (event, ctx) => {
    if (!state.enabled || !ctx.hasUI) return;
    const message = [...event.messages].reverse().find(isAssistant);
    if (!message) return;
    const plan = assistantText(message);
    if (!/^#\s+Plan\b/im.test(plan)) return;

    state.plan = plan;
    state.planPath = await savePlan(plan);
    persist();

    const choice = await ctx.ui.select("Plan ready", [
      "Approve and implement",
      "Keep planning with feedback",
      "Edit plan",
      "Stay in plan mode",
    ]);

    if (choice === "Approve and implement") {
      const approvedPlan = state.plan;
      const planPath = state.planPath;
      leave(ctx);
      if (!pi.getSessionName()) pi.setSessionName(slug(approvedPlan));
      pi.sendUserMessage(`Implement the approved plan below.\n\n${approvedPlan}\n\nPlan file: ${planPath}`, {
        deliverAs: "followUp",
      });
    } else if (choice === "Keep planning with feedback") {
      const feedback = await ctx.ui.editor("Plan feedback", "");
      if (feedback?.trim()) pi.sendUserMessage(feedback.trim(), { deliverAs: "followUp" });
    } else if (choice === "Edit plan") {
      const edited = await ctx.ui.editor("Edit plan", state.plan);
      if (edited?.trim()) {
        state.plan = edited.trim();
        state.planPath = await savePlan(state.plan);
        persist();
        pi.sendUserMessage(`Use this edited plan as the current proposal:\n\n${state.plan}`, { deliverAs: "followUp" });
      }
    }
  });

  pi.on("session_start", (_event, ctx) => {
    const saved = ctx.sessionManager.getBranch()
      .filter((entry) => entry.type === "custom" && entry.customType === STATE)
      .at(-1) as { data?: State } | undefined;
    state = saved?.data ?? { enabled: pi.getFlag("plan") === true };
    if (pi.getFlag("plan") === true) state.enabled = true;
    if (state.enabled) {
      state.toolsBefore ??= pi.getActiveTools();
      pi.setActiveTools(pi.getAllTools().map((tool) => tool.name).filter((name) => READ_ONLY_TOOLS.has(name)));
    }
    render(ctx);
  });
}
