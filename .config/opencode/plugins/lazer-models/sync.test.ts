import { expect, mock, test } from "bun:test"
import { setup, LAZER_URL, CATALOG_URL, CACHE_KEY } from "./sync"
import type { Plugin } from "@opencode/plugin"

const rawLazer = { data: [{ id: "gpt-6.1-sol", kind: "chat", owned_by: "openai", input_cost: 2, output_cost: 10 }] }
const rawCatalog = { models: { "openai/gpt-6.1-sol": { id: "openai/gpt-6.1-sol", limit: { context: 1050000, output: 128000 } } }, providers: {} }

function context(cache?: string) {
  const values = new Map<string, string>(cache ? [[CACHE_KEY, cache]] : [])
  let transform: (editor: any) => void
  let inventory: any[] = []
  const apply = () => transform?.({ get: () => ({ provider: { id: "lazer" } }), models: { set: (_id: string, models: any[]) => { inventory = models } } })
  const ctx = {
    storage: {
      get: mock(async (key: string) => values.get(key)),
      set: mock(async (key: string, value: string) => { values.set(key, value) }),
    },
    provider: {
      transform: mock(async (fn: typeof transform) => { transform = fn; apply(); return { dispose: async () => {} } }),
      reload: mock(async () => { apply() }),
    },
  }
  return { ctx: ctx as unknown as Plugin.Context, values, inventory: () => inventory, reload: ctx.provider.reload }
}

function response(data: unknown, etag: string) {
  return Response.json(data, { headers: { ETag: etag } })
}

test("initial refresh publishes models and persists the cache", async () => {
  const state = context()
  const fetcher = mock(async (url: string) => response(url === LAZER_URL ? rawLazer : rawCatalog, '"v1"'))
  const running = await setup(state.ctx, { fetcher })
  try {
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(state.inventory()[0].limit.context).toBe(1050000)
    expect(state.values.has(CACHE_KEY)).toBe(true)
    expect(state.reload).not.toHaveBeenCalled()
  } finally { await running.dispose() }
})

test("registers a source before the config provider exists", async () => {
  const state = context()
  let added: any
  state.ctx.provider.transform = mock(async (transform) => {
    transform({ get: () => undefined, add: (value: unknown) => { added = value } } as any)
    return { dispose: async () => {} }
  })
  const running = await setup(state.ctx, { fetcher: async (url) => response(url === LAZER_URL ? rawLazer : rawCatalog, '"v1"') })
  try {
    expect(added.info.id).toBe("lazer")
    expect(added.info.package).toBe("aisdk:@ai-sdk/openai-compatible")
    expect(added.models).toHaveLength(1)
  } finally { await running.dispose() }
})

test("conditional requests keep the inventory and avoid unnecessary reloads", async () => {
  const state = context()
  const headers: Headers[] = []
  let initial = true
  const fetcher = mock(async (url: string, init: RequestInit) => {
    headers.push(new Headers(init.headers))
    return initial ? response(url === LAZER_URL ? rawLazer : rawCatalog, '"v1"') : new Response(null, { status: 304 })
  })
  const running = await setup(state.ctx, { fetcher })
  try {
    initial = false
    await running.refresh()
    expect(headers.slice(2).every((header) => header.get("If-None-Match") === '"v1"')).toBe(true)
    expect(state.reload).not.toHaveBeenCalled()
    expect(state.inventory()).toHaveLength(1)
  } finally { await running.dispose() }
})

test("models.dev changes apply even if Lazer returns 304", async () => {
  const state = context()
  let initial = true
  const fetcher = mock(async (url: string) => {
    if (initial) return response(url === LAZER_URL ? rawLazer : rawCatalog, '"v1"')
    if (url === LAZER_URL) return new Response(null, { status: 304 })
    return response({ ...rawCatalog, models: { "openai/gpt-6.1-sol": { id: "openai/gpt-6.1-sol", limit: { context: 900000, output: 64000 } } } }, '"v2"')
  })
  const running = await setup(state.ctx, { fetcher })
  try {
    initial = false
    await running.refresh()
    expect(state.inventory()[0].limit.context).toBe(900000)
    expect(state.reload).toHaveBeenCalledTimes(1)
  } finally { await running.dispose() }
})

test("network failures and invalid inventories retain the last successful data", async () => {
  const state = context()
  let mode = "initial"
  const fetcher = mock(async (url: string) => {
    if (mode === "offline") throw new Error("offline")
    if (mode === "invalid") return response(url === LAZER_URL ? { data: [] } : { models: {}, providers: {} }, '"bad"')
    return response(url === LAZER_URL ? rawLazer : rawCatalog, '"v1"')
  })
  const running = await setup(state.ctx, { fetcher, warn: () => {} })
  try {
    const saved = state.values.get(CACHE_KEY)
    for (mode of ["offline", "invalid"]) {
      await running.refresh()
      expect(state.inventory()[0].limit.context).toBe(1050000)
      expect(state.values.get(CACHE_KEY)).toBe(saved)
    }
    expect(state.reload).not.toHaveBeenCalled()
  } finally { await running.dispose() }
})

test("a successful refresh removes retired models and adds new models", async () => {
  const state = context()
  let initial = true
  const fetcher = mock(async (url: string) => response(url === LAZER_URL
    ? initial ? rawLazer : { data: [{ id: "new-model", kind: "chat", input_cost: 0, output_cost: 0 }] }
    : rawCatalog, initial ? '"v1"' : '"v2"'))
  const running = await setup(state.ctx, { fetcher })
  try {
    initial = false
    await running.refresh()
    expect(state.inventory().map((model) => model.id)).toEqual(["new-model"])
  } finally { await running.dispose() }
})

test("an offline reload restores durable data before fetching", async () => {
  const state = context()
  const first = await setup(state.ctx, { fetcher: async (url) => response(url === LAZER_URL ? rawLazer : rawCatalog, '"v1"') })
  await first.dispose()
  const restored = context(state.values.get(CACHE_KEY))
  const second = await setup(restored.ctx, { fetcher: async () => { throw new Error("offline") }, warn: () => {} })
  try {
    expect(restored.inventory()[0].limit.context).toBe(1050000)
    await second.refresh()
    expect(restored.inventory()).toHaveLength(1)
  } finally { await second.dispose() }
})

test("overlapping refreshes share one request pair and dispose aborts pending work", async () => {
  const state = context()
  let blocked = false
  let started = 0
  const signals: AbortSignal[] = []
  const fetcher = mock(async (url: string, init: RequestInit) => {
    if (!blocked) return response(url === LAZER_URL ? rawLazer : rawCatalog, '"v1"')
    started++
    signals.push(init.signal!)
    return new Promise<Response>((_resolve, reject) => init.signal!.addEventListener("abort", () => reject(new Error("aborted")), { once: true }))
  })
  const running = await setup(state.ctx, { fetcher, warn: () => {} })
  blocked = true
  const one = running.refresh()
  const two = running.refresh()
  expect(started).toBe(2)
  await running.dispose()
  await Promise.all([one, two])
  expect(signals.every((signal) => signal.aborted)).toBe(true)
  await running.refresh()
  expect(started).toBe(2)
})

test("periodic refreshes use the configured interval and stop on disposal", async () => {
  const state = context()
  const fetcher = mock(async (url: string) => response(url === LAZER_URL ? rawLazer : rawCatalog, '"v1"'))
  const running = await setup(state.ctx, { fetcher, intervalMs: 10 })
  try {
    await Bun.sleep(35)
    expect(fetcher.mock.calls.length).toBeGreaterThanOrEqual(4)
  } finally { await running.dispose() }
  const calls = fetcher.mock.calls.length
  await Bun.sleep(25)
  expect(fetcher.mock.calls.length).toBe(calls)
})

test("timeouts preserve cached models and release the refresh lock", async () => {
  const state = context()
  let timeout = false
  const fetcher = mock(async (url: string, init: RequestInit) => {
    if (!timeout) return response(url === LAZER_URL ? rawLazer : rawCatalog, '"v1"')
    return new Promise<Response>((_resolve, reject) => init.signal!.addEventListener("abort", () => reject(new Error("timeout")), { once: true }))
  })
  const running = await setup(state.ctx, { fetcher, timeoutMs: 10, warn: () => {} })
  try {
    timeout = true
    await running.refresh()
    expect(state.inventory()[0].limit.context).toBe(1050000)
    timeout = false
    await running.refresh()
    expect(fetcher).toHaveBeenCalledTimes(6)
  } finally { await running.dispose() }
})

test("a broken cache and unavailable models.dev do not prevent Lazer discovery", async () => {
  const state = context("broken json")
  const running = await setup(state.ctx, {
    fetcher: async (url) => url === LAZER_URL ? response(rawLazer, '"v1"') : new Response(null, { status: 503 }),
    warn: () => {},
  })
  try {
    expect(state.inventory()).toHaveLength(1)
    expect(state.inventory()[0].limit.context).toBe(200000)
  } finally { await running.dispose() }
})
