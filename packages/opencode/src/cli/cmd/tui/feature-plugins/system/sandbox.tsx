import type { TuiPlugin, TuiPluginModule } from "@async-coder/plugin/tui"

const id = "internal:sandbox"
const order = ["off", "writes", "full"] as const

const tui: TuiPlugin = async (api) => {
  api.command.register(() => [
    {
      title: "Cycle sandbox mode",
      value: "sandbox.cycle",
      category: "system",
      slash: { name: "sandbox" },
      async onSelect() {
        if (process.platform === "win32")
          return api.ui.toast({ variant: "warning", message: "Sandboxing is not available on Windows: shell commands would be refused. Use WSL or leave it off." })
        const config = await api.client.config.get()
        const current = config.data?.sandbox?.mode ?? "off"
        const next = order[(order.indexOf(current) + 1) % order.length]
        await api.client.config.update({ config: { sandbox: { ...config.data?.sandbox, mode: next } } })
        api.ui.toast({
          variant: next === "off" ? "warning" : "success",
          message:
            next === "off"
              ? "Sandbox off: commands run unconfined"
              : next === "writes"
                ? "Sandbox writes: shell and file writes confined to the project and temp dirs"
                : "Sandbox full: writes confined and network blocked",
        })
      },
    },
  ])
}

const plugin: TuiPluginModule & { id: string } = { id, tui }

export default plugin
