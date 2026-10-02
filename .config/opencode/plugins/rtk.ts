import { $ } from "bun"
import { Plugin } from "@opencode/plugin"

// RTK OpenCode plugin — rewrites commands to use rtk for token savings.
// Requires: rtk >= 0.23.0 in PATH.
//
// Thin delegating plugin: all rewrite logic lives in `rtk rewrite`
// (src/discover/registry.rs). Edit the Rust registry, not this file.

export default Plugin.define({
  id: "rtk",
  async setup(ctx) {
    try {
      await $`which rtk`.quiet()
    } catch {
      console.warn("[rtk] rtk binary not found in PATH — plugin disabled")
      return
    }

    await ctx.tool.hook("execute.before", async (event) => {
      const tool = String(event.tool ?? "").toLowerCase()
      if (tool !== "bash" && tool !== "shell") return
      const args = event.input
      if (!args || typeof args !== "object") return
      const command = (args as Record<string, unknown>).command
      if (typeof command !== "string" || !command) return
      try {
        const result = await $`rtk rewrite ${command}`.quiet().nothrow()
        const rewritten = String(result.stdout).trim()
        if (rewritten && rewritten !== command) {
          ;(args as Record<string, unknown>).command = rewritten
        }
      } catch {
        // rtk rewrite failed — pass through unchanged
      }
    })
  },
})
