import type { TuiPlugin, TuiPluginModule } from "@async-coder/plugin/tui"
import { DialogContext } from "@tui/component/dialog-context"

const id = "internal:context-inspector"

const tui: TuiPlugin = async (api) => {
  api.command.register(() => [
    {
      title: "Context inspector",
      value: "context.open",
      category: "system",
      slash: { name: "context" },
      onSelect() {
        const route = api.route.current
        const sessionID = route.name === "session" ? (route.params?.sessionID as string | undefined) : undefined
        if (!sessionID) return api.ui.toast({ variant: "info", message: "Open a session to inspect its context" })
        api.ui.dialog.replace(() => <DialogContext api={api} session_id={sessionID} />)
      },
    },
  ])
}

const plugin: TuiPluginModule & { id: string } = { id, tui }

export default plugin
