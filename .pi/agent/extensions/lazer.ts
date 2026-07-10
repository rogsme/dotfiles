import { getAgentDir, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Lazer (https://lazertechnologies.com) provider for pi.
 *
 * Lazer exposes an OpenAI-compatible Chat Completions API at
 * https://proxy.lazertechnologies.com/api/v1 that routes to upstream models
 * (Anthropic, OpenAI, Google, xAI, DeepSeek, etc.).
 *
 * On startup this extension fetches the live model list from the proxy's
 * /api/v1/models endpoint, so new models appear automatically without code
 * changes. The API key is read from ~/.pi/agent/auth.json (set via `/login`)
 * or the LAZER_API_KEY environment variable.
 *
 * The /models endpoint provides ids, pricing, and reasoning variants, but not
 * context windows, max output tokens, or image support. Those are filled in
 * from the STATIC_META lookup below (with heuristic defaults for unknown
 * models). If the fetch fails (no key, network error, etc.), a hardcoded
 * FALLBACK_MODELS list is used so the provider still appears in /login.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ThinkingLevel =
  | "off"
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh"
  | "max";

type ThinkingLevelMap = Partial<Record<ThinkingLevel, string | null>>;
type InputTypes = ("text" | "image")[];

interface ModelMeta {
  contextWindow: number;
  maxTokens: number;
  input: InputTypes;
}

interface ApiModel {
  id: string;
  owned_by?: string;
  input_cost?: number;
  output_cost?: number;
  cache_read_cost?: number;
  cache_write_cost?: number;
  variants?: Record<string, { reasoningEffort?: string; reasoning_effort?: string }>;
}

interface ApiModelsResponse {
  data?: ApiModel[];
}

// ---------------------------------------------------------------------------
// Static metadata (not provided by the /models endpoint)
// ---------------------------------------------------------------------------

const MULTIMODAL: InputTypes = ["text", "image"];
const TEXT_ONLY: InputTypes = ["text"];

const STATIC_META: Record<string, ModelMeta> = {
  // Anthropic
  "claude-fable-5": { contextWindow: 200000, maxTokens: 64000, input: MULTIMODAL },
  "claude-haiku-4.5": { contextWindow: 200000, maxTokens: 64000, input: MULTIMODAL },
  "claude-opus-4.6": { contextWindow: 200000, maxTokens: 64000, input: MULTIMODAL },
  "claude-opus-4.8": { contextWindow: 200000, maxTokens: 64000, input: MULTIMODAL },
  "claude-sonnet-5": { contextWindow: 200000, maxTokens: 64000, input: MULTIMODAL },
  // DeepSeek
  "deepseek-v4-flash": { contextWindow: 128000, maxTokens: 16384, input: TEXT_ONLY },
  "deepseek-v4-pro": { contextWindow: 128000, maxTokens: 16384, input: TEXT_ONLY },
  // Google Gemini
  "gemini-3-flash": { contextWindow: 1000000, maxTokens: 65536, input: MULTIMODAL },
  "gemini-3.1-pro": { contextWindow: 1000000, maxTokens: 65536, input: MULTIMODAL },
  "gemini-3.5-flash": { contextWindow: 1000000, maxTokens: 65536, input: MULTIMODAL },
  // GLM
  "glm-5.2": { contextWindow: 128000, maxTokens: 16384, input: TEXT_ONLY },
  // OpenAI GPT
  "gpt-5.3-codex": { contextWindow: 272000, maxTokens: 16384, input: TEXT_ONLY },
  "gpt-5.4": { contextWindow: 272000, maxTokens: 16384, input: MULTIMODAL },
  "gpt-5.4-mini": { contextWindow: 272000, maxTokens: 16384, input: MULTIMODAL },
  "gpt-5.5": { contextWindow: 272000, maxTokens: 16384, input: MULTIMODAL },
  "gpt-5.6-luna": { contextWindow: 272000, maxTokens: 16384, input: MULTIMODAL },
  "gpt-5.6-sol": { contextWindow: 272000, maxTokens: 16384, input: MULTIMODAL },
  "gpt-5.6-terra": { contextWindow: 272000, maxTokens: 16384, input: MULTIMODAL },
  // gpt-oss
  "gpt-oss-120b": { contextWindow: 128000, maxTokens: 16384, input: TEXT_ONLY },
  // xAI Grok
  "grok-4.5": { contextWindow: 256000, maxTokens: 16384, input: MULTIMODAL },
  // Kimi
  "kimi-2.7-code": { contextWindow: 128000, maxTokens: 16384, input: TEXT_ONLY },
  // Xiaomi MiMo
  "mimo-2.5": { contextWindow: 128000, maxTokens: 16384, input: TEXT_ONLY },
  "mimo-2.5-pro": { contextWindow: 128000, maxTokens: 16384, input: TEXT_ONLY },
  // MiniMax
  "minimax-m3": { contextWindow: 128000, maxTokens: 16384, input: TEXT_ONLY },
  // Qwen
  "qwen-3-coder": { contextWindow: 128000, maxTokens: 16384, input: TEXT_ONLY },
  "qwen-3.7-plus": { contextWindow: 128000, maxTokens: 16384, input: TEXT_ONLY },
};

const DEFAULT_META: ModelMeta = {
  contextWindow: 128000,
  maxTokens: 16384,
  input: TEXT_ONLY,
};

// Known non-chat models to exclude (audio/transcription models that error on
// chat/completions).
const EXCLUDED_MODELS = new Set(["nova-3", "whisper", "whisper-turbo"]);

function getMeta(id: string): ModelMeta {
  return STATIC_META[id] ?? guessMeta(id);
}

// Heuristic defaults for models not in STATIC_META.
function guessMeta(id: string): ModelMeta {
  if (id.startsWith("claude-")) return { contextWindow: 200000, maxTokens: 64000, input: MULTIMODAL };
  if (id.startsWith("gemini-")) return { contextWindow: 1000000, maxTokens: 65536, input: MULTIMODAL };
  if (id.startsWith("gpt-5.6")) return { contextWindow: 272000, maxTokens: 16384, input: MULTIMODAL };
  if (id.startsWith("gpt-5.")) return { contextWindow: 272000, maxTokens: 16384, input: MULTIMODAL };
  if (id.startsWith("grok-")) return { contextWindow: 256000, maxTokens: 16384, input: MULTIMODAL };
  if (id.startsWith("deepseek-")) return { contextWindow: 128000, maxTokens: 16384, input: TEXT_ONLY };
  return { ...DEFAULT_META };
}

// ---------------------------------------------------------------------------
// Thinking level map construction from API variants
// ---------------------------------------------------------------------------

function buildThinkingLevelMap(
  variants?: ApiModel["variants"]
): ThinkingLevelMap | undefined {
  if (!variants) return undefined;
  const keys = Object.keys(variants);
  if (keys.length === 0) return undefined;

  const getEffort = (key: string): string => {
    const v = variants[key];
    return v?.reasoningEffort ?? v?.reasoning_effort ?? key;
  };

  const result: ThinkingLevelMap = {};
  const piLevels: ThinkingLevel[] = [
    "off", "minimal", "low", "medium", "high", "xhigh", "max",
  ];

  for (const level of piLevels) {
    if (keys.includes(level)) {
      result[level] = getEffort(level);
    } else if (level === "off" && keys.includes("none")) {
      // Many models use "none" instead of "off" for disabling thinking.
      result[level] = getEffort("none");
    } else {
      result[level] = null;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// API key retrieval
// ---------------------------------------------------------------------------

function getApiKey(): string | undefined {
  // Environment variable takes priority (matches pi's resolution order).
  const envKey = process.env["LAZER_API_KEY"];
  if (envKey) return envKey;

  // Read from auth.json (where /login stores it).
  try {
    const authPath = join(getAgentDir(), "auth.json");
    const auth = JSON.parse(readFileSync(authPath, "utf-8"));
    const lazer = auth["lazer"];
    if (lazer?.type === "api_key" && typeof lazer?.key === "string") {
      return lazer.key;
    }
  } catch {
    // auth.json missing, unreadable, or no lazer entry — that's fine.
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Fetch live model list from the proxy
// ---------------------------------------------------------------------------

async function fetchLiveModels(apiKey: string): Promise<ApiModel[]> {
  const response = await fetch(
    "https://proxy.lazertechnologies.com/api/v1/models",
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );
  if (!response.ok) {
    throw new Error(`Lazer /models returned ${response.status}`);
  }
  const payload = (await response.json()) as ApiModelsResponse;
  if (!payload.data || !Array.isArray(payload.data)) {
    throw new Error("Lazer /models response missing data array");
  }
  return payload.data;
}

function buildModelsFromApi(apiModels: ApiModel[]) {
  return apiModels
    .filter((m) => !EXCLUDED_MODELS.has(m.id))
    .map((m) => {
      const meta = getMeta(m.id);
      const thinkingLevelMap = buildThinkingLevelMap(m.variants);
      const hasVariants = m.variants && Object.keys(m.variants).length > 0;
      return {
        id: m.id,
        reasoning: hasVariants ?? false,
        ...(thinkingLevelMap ? { thinkingLevelMap } : {}),
        input: meta.input,
        cost: {
          input: m.input_cost ?? 0,
          output: m.output_cost ?? 0,
          cacheRead: m.cache_read_cost ?? 0,
          cacheWrite: m.cache_write_cost ?? 0,
        },
        contextWindow: meta.contextWindow,
        maxTokens: meta.maxTokens,
      };
    });
}

// ---------------------------------------------------------------------------
// Fallback model list (used when the live fetch fails)
// ---------------------------------------------------------------------------

const FALLBACK_MODELS = [
  { id: "claude-fable-5", reasoning: true, tl: map(["high","low","max","medium","xhigh"]), input: MULTIMODAL, cost: { input: 10, output: 50, cacheRead: 1, cacheWrite: 12.5 }, ctx: 200000, max: 64000 },
  { id: "claude-haiku-4.5", reasoning: true, tl: map(["high","low","max","medium","minimal"]), input: MULTIMODAL, cost: { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 }, ctx: 200000, max: 64000 },
  { id: "claude-opus-4.6", reasoning: true, tl: map(["high","low","max","medium","minimal"]), input: MULTIMODAL, cost: { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 }, ctx: 200000, max: 64000 },
  { id: "claude-opus-4.8", reasoning: true, tl: map(["high","low","max","medium","xhigh"]), input: MULTIMODAL, cost: { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 }, ctx: 200000, max: 64000 },
  { id: "claude-sonnet-5", reasoning: true, tl: map(["high","low","max","medium","xhigh"]), input: MULTIMODAL, cost: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 }, ctx: 200000, max: 64000 },
  { id: "deepseek-v4-flash", input: TEXT_ONLY, cost: { input: 0.1, output: 0.2, cacheRead: 0.02, cacheWrite: 0 }, ctx: 128000, max: 16384 },
  { id: "deepseek-v4-pro", reasoning: true, tl: map(["high","low","medium","none"]), input: TEXT_ONLY, cost: { input: 1.74, output: 3.48, cacheRead: 0.14, cacheWrite: 0 }, ctx: 128000, max: 16384 },
  { id: "gemini-3-flash", reasoning: true, tl: map(["high","low","medium","off"]), input: MULTIMODAL, cost: { input: 0.5, output: 3, cacheRead: 0.05, cacheWrite: 0 }, ctx: 1000000, max: 65536 },
  { id: "gemini-3.1-pro", reasoning: true, tl: map(["high","low","medium","off"]), input: MULTIMODAL, cost: { input: 2, output: 12, cacheRead: 0.2, cacheWrite: 0 }, ctx: 1000000, max: 65536 },
  { id: "gemini-3.5-flash", reasoning: true, tl: map(["high","low","medium","off"]), input: MULTIMODAL, cost: { input: 1.5, output: 9, cacheRead: 0.15, cacheWrite: 0 }, ctx: 1000000, max: 65536 },
  { id: "glm-5.2", reasoning: true, tl: map(["high","low","medium","none"]), input: TEXT_ONLY, cost: { input: 1.4, output: 4.4, cacheRead: 0.26, cacheWrite: 0 }, ctx: 128000, max: 16384 },
  { id: "gpt-5.3-codex", reasoning: true, tl: map(["high","low","medium","minimal","none","xhigh"]), input: TEXT_ONLY, cost: { input: 1.75, output: 14, cacheRead: 0.175, cacheWrite: 0 }, ctx: 272000, max: 16384 },
  { id: "gpt-5.4", reasoning: true, tl: map(["high","low","medium","minimal","none","xhigh"]), input: MULTIMODAL, cost: { input: 2.5, output: 15, cacheRead: 0.25, cacheWrite: 0 }, ctx: 272000, max: 16384 },
  { id: "gpt-5.4-mini", reasoning: true, tl: map(["high","low","medium","minimal","none","xhigh"]), input: MULTIMODAL, cost: { input: 0.75, output: 4.5, cacheRead: 0.075, cacheWrite: 0 }, ctx: 272000, max: 16384 },
  { id: "gpt-5.5", reasoning: true, tl: map(["high","low","medium","minimal","none","xhigh"]), input: MULTIMODAL, cost: { input: 5, output: 30, cacheRead: 0.5, cacheWrite: 0 }, ctx: 272000, max: 16384 },
  { id: "gpt-5.6-luna", reasoning: true, tl: map(["high","low","max","medium","minimal","none","xhigh"]), input: MULTIMODAL, cost: { input: 1, output: 6, cacheRead: 0.1, cacheWrite: 0 }, ctx: 272000, max: 16384 },
  { id: "gpt-5.6-sol", reasoning: true, tl: map(["high","low","max","medium","minimal","none","xhigh"]), input: MULTIMODAL, cost: { input: 5, output: 30, cacheRead: 0.5, cacheWrite: 0 }, ctx: 272000, max: 16384 },
  { id: "gpt-5.6-terra", reasoning: true, tl: map(["high","low","medium","minimal","none","xhigh"]), input: MULTIMODAL, cost: { input: 2.5, output: 15, cacheRead: 0.25, cacheWrite: 0 }, ctx: 272000, max: 16384 },
  { id: "gpt-oss-120b", reasoning: true, tl: map(["high","low","medium"]), input: TEXT_ONLY, cost: { input: 0.35, output: 0.75, cacheRead: 0, cacheWrite: 0 }, ctx: 128000, max: 16384 },
  { id: "grok-4.5", reasoning: true, tl: map(["high","low","medium"]), input: MULTIMODAL, cost: { input: 2, output: 6, cacheRead: 0.5, cacheWrite: 0 }, ctx: 256000, max: 16384 },
  { id: "kimi-2.7-code", input: TEXT_ONLY, cost: { input: 0.95, output: 4, cacheRead: 0.19, cacheWrite: 0 }, ctx: 128000, max: 16384 },
  { id: "mimo-2.5", input: TEXT_ONLY, cost: { input: 0.4, output: 2, cacheRead: 0.08, cacheWrite: 0 }, ctx: 128000, max: 16384 },
  { id: "mimo-2.5-pro", input: TEXT_ONLY, cost: { input: 1, output: 3, cacheRead: 0.2, cacheWrite: 0 }, ctx: 128000, max: 16384 },
  { id: "minimax-m3", reasoning: true, tl: map(["high","low","medium","none"]), input: TEXT_ONLY, cost: { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0 }, ctx: 128000, max: 16384 },
  { id: "qwen-3-coder", input: TEXT_ONLY, cost: { input: 0.22, output: 1, cacheRead: 0, cacheWrite: 0 }, ctx: 128000, max: 16384 },
  { id: "qwen-3.7-plus", reasoning: true, tl: map(["high","low","medium","none"]), input: TEXT_ONLY, cost: { input: 0.4, output: 1.6, cacheRead: 0.08, cacheWrite: 0 }, ctx: 128000, max: 16384 },
].map((m) => ({
  id: m.id,
  reasoning: m.reasoning ?? false,
  ...(m.tl ? { thinkingLevelMap: m.tl } : {}),
  input: m.input,
  cost: m.cost,
  contextWindow: m.ctx,
  maxTokens: m.max,
}));

// Build a thinkingLevelMap from variant keys (used by FALLBACK_MODELS).
function map(variantKeys: string[]): ThinkingLevelMap {
  const present = new Set(variantKeys);
  const result: ThinkingLevelMap = {};
  const piLevels: ThinkingLevel[] = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];
  for (const level of piLevels) {
    if (present.has(level)) {
      result[level] = level;
    } else if (level === "off" && present.has("none")) {
      result[level] = "none";
    } else {
      result[level] = null;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Extension entry point
// ---------------------------------------------------------------------------

export default async function (pi: ExtensionAPI) {
  let models = FALLBACK_MODELS;

  const apiKey = getApiKey();
  if (apiKey) {
    try {
      const apiModels = await fetchLiveModels(apiKey);
      models = buildModelsFromApi(apiModels);
    } catch (err) {
      // Keep fallback models; the provider still appears in /login and /model.
      // The error is non-fatal — next startup or /reload will retry.
    }
  }

  pi.registerProvider("lazer", {
    name: "Lazer",
    baseUrl: "https://proxy.lazertechnologies.com/api/v1",
    api: "openai-completions",
    // The extension API requires an apiKey/oauth field when defining models.
    // We reference an env var that is typically unset, so this resolves to
    // nothing. Auth comes from `/login` (auth.json), which takes priority.
    apiKey: "$LAZER_API_KEY",
    // Conservative compat for a multi-upstream OpenAI-compatible proxy:
    // don't send OpenAI-specific `store` or tool `strict` fields, which some
    // upstreams reject. Default reasoning_effort / developer role / streaming
    // usage are all supported by the proxy (verified).
    compat: {
      supportsStore: false,
      supportsStrictMode: false,
    },
    models,
  });
}
