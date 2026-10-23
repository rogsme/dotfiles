import { Provider, type Model, type Plugin } from "@opencode/plugin"
import { buildModels, parseCatalog, parseLazer, type Catalog, type LazerModel } from "./catalog"

export const LAZER_URL = "https://proxy.lazertechnologies.com/api/v1/models"
export const CATALOG_URL = "https://models.dev/catalog.json"
export const CACHE_KEY = "catalog-v1"
const INTERVAL_MS = 15 * 60 * 1000
const TIMEOUT_MS = 10000
type Snapshot<T> = { data: T; etag?: string }
type Cache = { lazer?: Snapshot<LazerModel[]>; catalog?: Snapshot<Catalog> }
type Options = {
  fetcher?: (url: string, init: RequestInit) => Promise<Response>
  intervalMs?: number
  timeoutMs?: number
  warn?: (message: string) => void
}

export async function setup(ctx: Pick<Plugin.Context, "provider" | "storage">, options: Options = {}) {
  const fetcher = options.fetcher ?? fetch
  const warn = options.warn ?? ((message: string) => console.warn(`[lazer-models] ${message}`))
  const controller = new AbortController()
  let cache: Cache = {}
  let models: Model.Info[] = []
  let registered = false
  let pending: Promise<void> | undefined

  try {
    const saved = await ctx.storage.get(CACHE_KEY)
    if (typeof saved === "string") {
      const parsed = JSON.parse(saved)
      if (parsed.lazer) cache.lazer = { data: parseLazer(parsed.lazer.data), etag: parsed.lazer.etag }
      if (parsed.catalog) cache.catalog = { data: parseCatalog(parsed.catalog.data), etag: parsed.catalog.etag }
      if (cache.lazer) models = buildModels(cache.lazer.data, cache.catalog?.data)
    }
  } catch {
    warn("Could not restore the catalog cache; fetching fresh data.")
    cache = {}
  }

  async function load<T>(url: string, previous: Snapshot<T> | undefined, parse: (value: unknown) => T): Promise<Snapshot<T> | undefined> {
    try {
      const response = await fetcher(url, {
        headers: { Accept: "application/json", ...(previous?.etag ? { "If-None-Match": previous.etag } : {}) },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(options.timeoutMs ?? TIMEOUT_MS)]),
      })
      if (response.status === 304 && previous) return previous
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return { data: parse(await response.json()), etag: response.headers.get("etag") ?? undefined }
    } catch (error) {
      if (!controller.signal.aborted) warn(`${new URL(url).hostname}: ${error instanceof Error ? error.message : "refresh failed"}; retaining previous data.`)
      return previous
    }
  }

  function refresh(): Promise<void> {
    if (controller.signal.aborted) return Promise.resolve()
    if (pending) return pending
    pending = (async () => {
      const [lazer, catalog] = await Promise.all([
        load(LAZER_URL, cache.lazer, parseLazer),
        load(CATALOG_URL, cache.catalog, parseCatalog),
      ])
      if (controller.signal.aborted) return
      const next = lazer ? buildModels(lazer.data, catalog?.data) : models
      const previous = models
      const changed = JSON.stringify(next) !== JSON.stringify(previous)
      models = next
      try {
        if (registered && changed) await ctx.provider.reload()
      } catch (error) {
        models = previous
        throw error
      }
      const updated: Cache = { lazer, catalog }
      if (JSON.stringify(updated) !== JSON.stringify(cache)) {
        cache = updated
        try { await ctx.storage.set(CACHE_KEY, JSON.stringify(cache)) }
        catch { warn("Catalog refreshed, but its durable cache could not be saved.") }
      }
    })().catch((error) => {
      if (!controller.signal.aborted) warn(`Could not publish catalog: ${error instanceof Error ? error.message : "unknown error"}`)
    }).finally(() => { pending = undefined })
    return pending
  }

  // On a cold start, wait for discovery so configured title/explore models are available immediately.
  const restored = models.length > 0
  if (!restored) await refresh()
  const registration = await ctx.provider.transform((editor) => {
    if (!models.length) return
    if (editor.get("lazer")) editor.models.set("lazer", models)
    else editor.add({
      // Local sources run before config transforms. The later config transform retains the user's connection overrides.
      info: {
        ...Provider.Info.empty(Provider.ID.make("lazer")),
        name: "Lazer", activation: "enabled", package: "aisdk:@ai-sdk/openai-compatible",
        settings: { baseURL: "https://proxy.lazertechnologies.com/" },
      },
      models,
    })
  })
  registered = true
  if (restored) void refresh()
  const timer = setInterval(() => void refresh(), options.intervalMs ?? INTERVAL_MS) as ReturnType<typeof setInterval> & { unref?: () => void }
  timer.unref?.()
  return {
    refresh,
    async dispose() {
      clearInterval(timer)
      controller.abort()
      await pending
      await registration.dispose()
    },
  }
}
