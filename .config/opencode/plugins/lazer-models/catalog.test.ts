import { describe, expect, test } from "bun:test"
import { buildModels, parseCatalog, parseLazer } from "./catalog"

function lazer(overrides: Record<string, unknown> = {}) {
  return {
    id: "deepseek-v4.1-flash-1017",
    kind: "chat",
    owned_by: "fireworks",
    name: "DeepSeek Flash",
    input_cost: 0.3,
    output_cost: 1.2,
    cache_read_cost: 0.006,
    created: 1792195200,
    capabilities: { tools: true, input: ["text", "image"], output: ["text"] },
    compatibility: { reasoningField: "reasoning_content", reasoningReplayFields: ["extra"] },
    variants: { low: { reasoningEffort: "low" }, max: { reasoningEffort: "max" } },
    ...overrides,
  }
}

function catalog() {
  return parseCatalog({
    models: {
      "deepseek/deepseek-v4.1-flash-1017": {
        id: "deepseek/deepseek-v4.1-flash-1017",
        name: "Canonical DeepSeek",
        family: "deepseek-flash",
        limit: { context: 1000000, output: 384000 },
        tool_call: true,
        modalities: { input: ["text", "image"], output: ["text"] },
        temperature: true,
      },
    },
    providers: {
      "fireworks-ai": {
        models: {
          "accounts/fireworks/models/deepseek-v4p1-flash-1017": {
            id: "accounts/fireworks/models/deepseek-v4p1-flash-1017",
            canonical_model_id: "deepseek/deepseek-v4.1-flash-1017",
            limit: { context: 800000, output: 300000 },
          },
        },
      },
    },
  })
}

describe("model mapping", () => {
  test("fills missing limits from the actual upstream before canonical metadata", () => {
    const [model] = buildModels(parseLazer({ data: [lazer()] }), catalog())
    expect(model.limit).toEqual({ context: 800000, output: 300000 })
    expect(model.name).toBe("DeepSeek Flash")
    expect(model.family).toBe("deepseek-flash")
    expect(model.capabilities.temperature).toBe(true)
    expect(model.compatibility).toEqual({ reasoningField: "reasoning_content" })
    expect(model.cost[0]).toEqual({ input: 0.3, output: 1.2, cache: { read: 0.006, write: 0 } })
    expect(model.variants).toEqual([
      { id: "low", settings: { reasoningEffort: "low" } },
      { id: "max", settings: { reasoningEffort: "max" } },
    ])
  })

  test("preserves Lazer limits, zero prices, false capabilities, and explicit variants", () => {
    const [model] = buildModels(parseLazer({ data: [lazer({
      limit: { context: 500000, output: 10000, outputNonStreaming: 5000 },
      capabilities: { tools: false, input: ["text"], output: ["text"], temperature: false },
      input_cost: 0,
      output_cost: 0,
      variants: {},
    })] }), catalog())
    expect(model.limit).toEqual({ context: 500000, output: 10000 })
    expect(model.capabilities).toEqual({ tools: false, input: ["text"], output: ["text"], temperature: false })
    expect(model.cost[0].input).toBe(0)
    expect(model.variants).toEqual([])
  })

  test("uses canonical metadata when the host has no entry", () => {
    const [model] = buildModels(parseLazer({ data: [lazer({ owned_by: "unknown" })] }), catalog())
    expect(model.limit).toEqual({ context: 1000000, output: 384000 })
  })

  test("keeps alias request IDs while inheriting their target", () => {
    const alias = lazer({ id: "deepseek-flash-latest", latest_of: "deepseek-v4.1-flash-1017" })
    const models = buildModels(parseLazer({ data: [alias, lazer()] }), catalog())
    const model = models.find((model) => model.id === alias.id)!
    expect(model.modelID).toBe(alias.id)
    expect(model.limit.context).toBe(800000)
    expect(model.variants.map((variant) => variant.id)).toEqual(["low", "max"])
  })

  test("keeps latest aliases in the source catalog but disables them in the picker", () => {
    const models = buildModels(parseLazer({ data: [
      lazer(),
      lazer({ id: "deepseek-flash-latest", latest_of: "deepseek-v4.1-flash-1017" }),
      lazer({ id: "gpt-6.1-sol", owned_by: "openai" }),
      lazer({ id: "gpt-sol-latest", latest_of: "gpt-6.1-sol", owned_by: "openai" }),
      lazer({ id: "another-latest" }),
    ] }), catalog())
    expect(models).toHaveLength(5)
    expect(models.filter((model) => model.enabled).map((model) => model.id)).toEqual([
      "deepseek-v4.1-flash-1017", "gpt-6.1-sol",
    ])
    expect(models.filter((model) => model.id.endsWith("-latest")).every((model) => !model.enabled)).toBe(true)
    expect(models.find((model) => model.id === "gpt-sol-latest")?.modelID).toBe("gpt-sol-latest")
  })

  test("matches spelling differences explicitly and retains GPT aliases", () => {
    const data = parseLazer({ data: [
      lazer({ id: "claude-sonnet-5.5", owned_by: "anthropic" }),
      lazer({ id: "qwen-3.8-max" }),
      lazer({ id: "minimax-m3.1-flash" }),
      lazer({ id: "gpt-6.1-sol", owned_by: "openai" }),
      lazer({ id: "gpt-sol-latest", latest_of: "gpt-6.1-sol", owned_by: "openai" }),
    ] })
    const models = buildModels(data, parseCatalog({ models: Object.fromEntries([
      "anthropic/claude-sonnet-5-5", "alibaba/qwen3.8-max", "minimax/MiniMax-M3.1-Flash", "openai/gpt-6.1-sol",
    ].map((id) => [id, { id, limit: { context: 1000000, output: 128000 } }])), providers: {} }))
    expect(models.every((model) => model.limit.context === 1000000)).toBe(true)
    expect(models.find((model) => model.id === "gpt-sol-latest")?.modelID).toBe("gpt-sol-latest")
  })

  test("does not fuzzy-match a different model version", () => {
    const [model] = buildModels(parseLazer({ data: [lazer({ id: "deepseek-v4.2-flash" })] }), catalog())
    expect(model.limit).toEqual({ context: 200000, output: 32000 })
  })

  test("accepts zero token limits on unrelated specialized catalog entries", () => {
    const parsed = parseCatalog({ models: { "lab/image": { limit: { context: 0, output: 0 } } }, providers: {} })
    expect(parsed.models["lab/image"].limit?.context).toBeUndefined()
    expect(() => parseLazer({ data: [lazer({ limit: { context: 0 } })] })).toThrow()
  })

  test("inherits partial alias pricing and compatibility without undefined fields masking the target", () => {
    const models = buildModels(parseLazer({ data: [lazer(), {
      id: "deepseek-flash-latest", kind: "chat", latest_of: "deepseek-v4.1-flash-1017", compatibility: { cacheFormat: "anthropic" },
    }] }), catalog())
    const alias = models.find((model) => model.id === "deepseek-flash-latest")!
    expect(alias.cost[0].input).toBe(0.3)
    expect(alias.compatibility).toEqual({ reasoningField: "reasoning_content", cacheFormat: "anthropic" })
  })

  test("leaves Glean on default limits and filters non-chat models", () => {
    const models = buildModels(parseLazer({ data: [
      lazer({ id: "glean", owned_by: "glean", capabilities: { tools: false, input: ["text"], output: ["text"] } }),
      { id: "embedding", kind: "embedding" },
      { id: "whisper", kind: "audio" },
    ] }), catalog())
    expect(models).toHaveLength(1)
    expect(models[0].limit).toEqual({ context: 200000, output: 32000 })
    expect(models[0].capabilities.tools).toBe(false)
  })

  test("maps long-context pricing into OpenCode cost tiers", () => {
    const [model] = buildModels(parseLazer({ data: [lazer({
      long_context_pricing: { threshold: 100000, input_cost: 0.5, output_cost: 2.5, cache_read_cost: 0.05 },
    })] }), catalog())
    expect(model.cost[1]).toEqual({
      tier: { type: "context", size: 100000 },
      input: 0.5,
      output: 2.5,
      cache: { read: 0.05, write: 0 },
    })
  })

  test("rejects partial inventories, bad metadata, duplicates, and invalid aliases", () => {
    for (const data of [
      [],
      [lazer(), lazer()],
      [lazer({ input_cost: -1 })],
      [lazer({ limit: { context: "1000" } })],
      [lazer({ capabilities: { tools: "true" } })],
      [lazer({ latest_of: "missing" })],
      [lazer({ latest_of: "deepseek-v4.1-flash-1017" })],
      [lazer({ id: "a", latest_of: "b" }), lazer({ id: "b", latest_of: "a" })],
    ]) {
      expect(() => buildModels(parseLazer({ data }), catalog())).toThrow()
    }
    expect(() => parseCatalog({ models: {}, providers: {} })).toThrow()
  })
})
