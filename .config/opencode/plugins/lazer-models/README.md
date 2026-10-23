# Lazer model discovery

OpenCode loads this global plugin automatically. It fetches Lazer's chat-model inventory and models.dev metadata on startup, then every 15 minutes while the location is loaded. It updates the provider registry without rewriting configuration or changing the selected model.

Lazer supplies model IDs, prices, variants, and explicit capabilities. Missing metadata comes from the actual upstream provider's models.dev entry when that entry can be identified unambiguously, then from the canonical model. Known spelling differences are mapped in `catalog.ts`; other matches require the exact model ID. Aliases follow Lazer's `latest_of` target and retain their own request IDs.

Models whose IDs end in `-latest` stay synchronized in the source catalog but are disabled, so they do not duplicate concrete models in the picker. Use concrete versioned IDs in agents and sessions.

Glean uses OpenCode's default 200,000-token context and 32,000-token output limits. These are fallback assumptions, not verified Glean limits. Other unknown models also use default limits, text input/output, and disabled tools unless a catalog supplies capabilities.

Both sources use conditional ETag requests with a ten-second timeout. The last successful catalogs are stored in OpenCode's plugin-scoped durable storage under `catalog-v1`. Cached data is published immediately after reload; a cold start waits for discovery. An outage or invalid response retains the previous inventory. Fresh installations without cache need one successful Lazer request.

Only supported OpenCode compatibility fields (`reasoningField` and `cacheFormat`) are imported. Lazer's extra replay/input-format hints and non-streaming output limit are not applied by this catalog plugin. Request encoding remains the configured AI SDK adapter's responsibility.

The provider connection stays in `opencode.json`. Keep its `models` block absent so static overrides do not shadow refreshed metadata. Existing agent selections and credentials are unchanged.

Run the offline tests from the config directory:

```sh
bun test ./plugins/lazer-models
```
