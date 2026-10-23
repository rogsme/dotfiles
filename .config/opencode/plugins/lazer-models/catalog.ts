import { Model, Provider } from "@opencode/plugin"

type ObjectValue = Record<string, unknown>
type Limits = { context?: number; input?: number; output?: number }
type Facts = {
  id: string
  name?: string
  family?: string
  limit?: Limits
  tool_call?: boolean
  temperature?: boolean
  modalities?: { input?: string[]; output?: string[] }
  canonical_model_id?: string
}
type Price = { input_cost: number; output_cost: number; cache_read_cost?: number; cache_write_cost?: number }
export type LazerModel = Facts & Partial<Price> & {
  kind: "chat"
  owned_by?: string
  latest_of?: string
  created?: number
  deprecation_date?: string
  capabilities?: { tools?: boolean; input?: string[]; output?: string[]; temperature?: boolean }
  compatibility?: { reasoningField?: Model.ReasoningField; cacheFormat?: "anthropic" | "alibaba" }
  variants?: Record<string, ObjectValue>
  long_context_pricing?: Price & { threshold: number }
}
export type Catalog = { models: Record<string, Facts>; providers: Record<string, { models: Record<string, Facts> }> }

// ID spelling differences only. Token limits and capabilities always come from the catalogs.
const CANONICAL_IDS: Record<string, string> = {
  "claude-haiku-5.5": "anthropic/claude-haiku-5-5",
  "claude-opus-5.5": "anthropic/claude-opus-5-5",
  "claude-sonnet-5.5": "anthropic/claude-sonnet-5-5",
  "minimax-m3": "minimax/MiniMax-M3",
  "minimax-m3.1-flash": "minimax/MiniMax-M3.1-Flash",
  "qwen-3.7-plus": "alibaba/qwen3.7-plus",
  "qwen-3.8-max": "alibaba/qwen3.8-max",
}
const PROVIDER_IDS: Record<string, string> = {
  anthropic: "anthropic", openai: "openai", gemini: "google", fireworks: "fireworks-ai", cerebras: "cerebras", xai: "xai",
}

function object(value: unknown): ObjectValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected an object")
  return value as ObjectValue
}

function string(value: unknown): string | undefined {
  if (value == null) return undefined
  if (typeof value !== "string" || !value.length) throw new Error("Expected a nonempty string")
  return value
}

function boolean(value: unknown): boolean | undefined {
  if (value == null) return undefined
  if (typeof value !== "boolean") throw new Error("Expected a boolean")
  return value
}

function number(value: unknown, positive = false): number | undefined {
  if (value == null) return undefined
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || (positive && (!Number.isInteger(value) || value === 0))) {
    throw new Error("Expected a valid nonnegative number or positive token limit")
  }
  return value
}

function strings(value: unknown): string[] | undefined {
  if (value == null) return undefined
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.length)) throw new Error("Expected string array")
  return value as string[]
}

function limits(value: unknown, allowZero = false): Limits | undefined {
  if (value == null) return undefined
  const source = object(value)
  const token = (value: unknown) => allowZero && value === 0 ? undefined : number(value, true)
  return { context: token(source.context), input: token(source.input), output: token(source.output) }
}

function facts(value: unknown, id: string, allowZero = false): Facts {
  const source = object(value)
  const modalities = source.modalities == null ? undefined : object(source.modalities)
  return {
    id,
    name: string(source.name), family: string(source.family), limit: limits(source.limit, allowZero),
    tool_call: boolean(source.tool_call), temperature: boolean(source.temperature),
    canonical_model_id: string(source.canonical_model_id),
    modalities: modalities ? { input: strings(modalities.input), output: strings(modalities.output) } : undefined,
  }
}

export function parseCatalog(value: unknown): Catalog {
  const source = object(value)
  const models = Object.fromEntries(Object.entries(object(source.models)).map(([id, entry]) => [id, facts(entry, id, true)]))
  if (!Object.keys(models).length) throw new Error("Empty models.dev catalog")
  // Retain only host metadata needed by Lazer. Drop descriptions, prices, and unrelated providers from the durable cache.
  const providers = Object.fromEntries(Object.entries(object(source.providers)).filter(([id]) => Object.values(PROVIDER_IDS).includes(id)).map(([id, entry]) => [id, {
    models: Object.fromEntries(Object.entries(object(object(entry).models)).map(([key, model]) => [key, facts(model, key, true)])),
  }]))
  return { models, providers }
}

export function parseLazer(value: unknown): LazerModel[] {
  const data = Array.isArray(value) ? value : object(value).data
  if (!Array.isArray(data)) throw new Error("Invalid Lazer model list")
  const ids = new Set<string>()
  const models: LazerModel[] = []
  for (const entry of data) {
    const source = object(entry)
    const id = string(source.id)
    if (!id || id.includes("#") || ids.has(id)) throw new Error("Missing, duplicate, or invalid model ID")
    ids.add(id)
    if (source.kind !== "chat") continue
    const caps = source.capabilities == null ? undefined : object(source.capabilities)
    const compatibility = source.compatibility == null ? undefined : object(source.compatibility)
    const pricing = source.long_context_pricing == null ? undefined : object(source.long_context_pricing)
    const cacheFormat = string(compatibility?.cacheFormat)
    if (cacheFormat !== undefined && cacheFormat !== "anthropic" && cacheFormat !== "alibaba") throw new Error("Unknown cache format")
    const reasoningField = string(compatibility?.reasoningField)
    const variants = source.variants == null ? undefined : Object.fromEntries(Object.entries(object(source.variants)).map(([id, settings]) => {
      if (!id || id.includes("#")) throw new Error("Invalid variant ID")
      return [id, object(settings)]
    }))
    const model: LazerModel = {
      ...facts(source, id), kind: "chat", owned_by: string(source.owned_by), latest_of: string(source.latest_of),
      created: number(source.created), deprecation_date: string(source.deprecation_date),
      input_cost: number(source.input_cost), output_cost: number(source.output_cost),
      cache_read_cost: number(source.cache_read_cost), cache_write_cost: number(source.cache_write_cost),
      capabilities: caps ? { tools: boolean(caps.tools), input: strings(caps.input), output: strings(caps.output), temperature: boolean(caps.temperature) } : undefined,
      compatibility: compatibility ? { reasoningField: reasoningField ? Model.ReasoningField.make(reasoningField) : undefined, cacheFormat } : undefined,
      variants,
    }
    if (pricing) {
      const threshold = number(pricing.threshold, true)
      const input_cost = number(pricing.input_cost)
      const output_cost = number(pricing.output_cost)
      if (threshold === undefined || input_cost === undefined || output_cost === undefined) throw new Error("Incomplete long-context pricing")
      model.long_context_pricing = { threshold, input_cost, output_cost, cache_read_cost: number(pricing.cache_read_cost), cache_write_cost: number(pricing.cache_write_cost) }
    }
    models.push(model)
  }
  if (!models.length) throw new Error("Empty Lazer chat inventory")
  const byID = new Map(models.map((model) => [model.id, model]))
  for (const model of models) resolveAlias(model, byID)
  return models.sort((a, b) => a.id.localeCompare(b.id))
}

function resolveAlias(model: LazerModel, byID: Map<string, LazerModel>): LazerModel {
  const seen = new Set<string>()
  let target = model
  while (target.latest_of) {
    if (seen.has(target.id)) throw new Error(`Alias cycle: ${model.id}`)
    seen.add(target.id)
    const next = byID.get(target.latest_of)
    if (!next) throw new Error(`Missing alias target: ${target.latest_of}`)
    target = next
  }
  return target
}

function lookup(model: LazerModel, catalog?: Catalog): { canonical?: Facts; host?: Facts } {
  if (!catalog) return {}
  const explicit = model.canonical_model_id ?? CANONICAL_IDS[model.id]
  const candidates = explicit ? [catalog.models[explicit]].filter(Boolean) : Object.values(catalog.models).filter((entry) => entry.id.slice(entry.id.indexOf("/") + 1) === model.id)
  if (candidates.length !== 1) return {}
  const canonical = candidates[0]
  const provider = catalog.providers[PROVIDER_IDS[model.owned_by ?? ""]]
  const hosts = Object.values(provider?.models ?? {}).filter((entry) => entry.id === model.id || entry.canonical_model_id === canonical.id)
  const exact = hosts.find((entry) => entry.id === model.id)
  const concrete = hosts.filter((entry) => !entry.id.includes("/routers/"))
  // Ambiguous deployment-specific entries fall back to the canonical model instead of guessing a route.
  return { canonical, host: exact ?? (concrete.length === 1 ? concrete[0] : undefined) }
}

function cost(price: Price, threshold?: number): Model.Cost {
  return Model.Cost.make({
    ...(threshold === undefined ? {} : { tier: { type: "context" as const, size: threshold } }),
    input: Model.Cost.fields.input.make(price.input_cost),
    output: Model.Cost.fields.output.make(price.output_cost),
    cache: {
      read: Model.Cost.fields.input.make(price.cache_read_cost ?? 0),
      write: Model.Cost.fields.output.make(price.cache_write_cost ?? 0),
    },
  })
}

export function buildModels(inventory: LazerModel[], catalog?: Catalog): Model.Info[] {
  const byID = new Map(inventory.map((model) => [model.id, model]))
  return inventory.map((source) => {
    const target = resolveAlias(source, byID)
    const { canonical, host } = lookup(target, catalog)
    const base = Model.Info.default(Provider.ID.make("lazer"), Model.ID.make(source.id))
    const cap = source.capabilities
    const targetCap = target.capabilities
    // Parsed optional fields may be undefined: use per-field precedence rather than object-spread defaults.
    const limitSources: (Limits | undefined)[] = [source.limit, target.limit, host?.limit, canonical?.limit, base.limit]
    const tokenLimit = (key: keyof Limits) => limitSources.map((entry) => entry?.[key]).find((value) => value !== undefined)
    const limit = {
      context: tokenLimit("context") ?? base.limit.context,
      input: tokenLimit("input"),
      output: tokenLimit("output") ?? base.limit.output,
    }
    const input = source.input_cost ?? target.input_cost
    const output = source.output_cost ?? target.output_cost
    const price = input !== undefined && output !== undefined ? {
      input_cost: input, output_cost: output,
      cache_read_cost: source.cache_read_cost ?? target.cache_read_cost,
      cache_write_cost: source.cache_write_cost ?? target.cache_write_cost,
    } : undefined
    const tier = source.long_context_pricing ?? target.long_context_pricing
    const family = source.family ?? target.family ?? host?.family ?? canonical?.family
    const timestamp = source.created ?? target.created ?? 0
    const deprecation = source.deprecation_date ?? target.deprecation_date
    const variants = source.variants ?? target.variants ?? {}
    return Model.Info.make({
      ...base,
      // Keep aliases synchronized without duplicating their target's display name in the picker.
      enabled: !source.id.endsWith("-latest"),
      name: source.name ?? target.name ?? host?.name ?? canonical?.name ?? source.id,
      ...(family ? { family: Model.Family.make(family) } : {}),
      capabilities: {
        tools: cap?.tools ?? targetCap?.tools ?? host?.tool_call ?? canonical?.tool_call ?? false,
        input: cap?.input ?? targetCap?.input ?? host?.modalities?.input ?? canonical?.modalities?.input ?? ["text"],
        output: cap?.output ?? targetCap?.output ?? host?.modalities?.output ?? canonical?.modalities?.output ?? ["text"],
        temperature: cap?.temperature ?? targetCap?.temperature ?? host?.temperature ?? canonical?.temperature,
      },
      compatibility: {
        reasoningField: source.compatibility?.reasoningField ?? target.compatibility?.reasoningField,
        cacheFormat: source.compatibility?.cacheFormat ?? target.compatibility?.cacheFormat,
      },
      variants: Object.entries(variants).sort(([a], [b]) => a.localeCompare(b)).map(([id, settings]) => Model.Variant.make({ id: Model.VariantID.make(id), settings })),
      time: { released: timestamp * 1000 },
      cost: [...(price ? [cost(price)] : []), ...(tier ? [cost(tier, tier.threshold)] : [])],
      status: deprecation ? "deprecated" : "active",
      limit,
    })
  })
}
