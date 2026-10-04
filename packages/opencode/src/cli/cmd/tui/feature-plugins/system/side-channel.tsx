import type { TuiPlugin, TuiPluginModule } from "@async-coder/plugin/tui"

const id = "internal:side-channel"

const tui: TuiPlugin = async (api) => {
  const hint = (name: string) => () =>
    api.ui.toast({ variant: "info", message: `Type /${name} followed by your note while an agent is running.` })
  api.command.register(() => [
    {
      title: "Side note to running agent (/btw)",
      value: "session.btw",
      category: "session",
      slash: { name: "btw" },
      onSelect: hint("btw"),
    },
    {
      title: "Course-correct running agent (/steer)",
      value: "session.steer",
      category: "session",
      slash: { name: "steer" },
      onSelect: hint("steer"),
    },
  ])
}

const plugin: TuiPluginModule & { id: string } = { id, tui }

export default plugin
