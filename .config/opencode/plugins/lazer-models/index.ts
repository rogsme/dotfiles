import { Plugin } from "@opencode/plugin"
import { setup } from "./sync"

export default Plugin.define({
  id: "lazer-models",
  async setup(ctx) {
    const sync = await setup(ctx)
    return () => sync.dispose()
  },
})
