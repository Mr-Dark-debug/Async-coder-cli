import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@async-coder/plugin/tui"

const id = "internal:hooks"

type Hook = { id?: string; enabled?: boolean; event: string; command: string; condition?: string }

async function show(api: TuiPluginApi) {
  const config = (await api.client.config.get()).data
  const hooks = ((config?.hooks ?? []) as Hook[]).map((hook, index) => ({ hook, index }))
  if (hooks.length === 0)
    return api.ui.dialog.replace(() => (
      <api.ui.DialogAlert
        title="Hooks"
        message={'No hooks configured. Add one to async-coder.json, for example:\n"hooks": [{ "event": "post_command", "command": "echo done >> hooks.log" }]'}
      />
    ))
  api.ui.dialog.replace(() => (
    <api.ui.DialogSelect<number>
      title={`Hooks (${hooks.length}) — select to enable/disable`}
      options={hooks.map(({ hook, index }) => ({
        title: `${hook.enabled === false ? "○" : "●"} ${hook.id ?? hook.event}`,
        value: index,
        description: `${hook.event}${hook.condition ? ` when ${hook.condition}` : ""} → ${hook.command.slice(0, 80)}`,
      }))}
      onSelect={async (option) => {
        const next = hooks.map(({ hook, index }) => (index === option.value ? { ...hook, enabled: hook.enabled === false } : hook))
        await api.client.config.update({ config: { hooks: next as never } })
        api.ui.toast({ variant: "info", message: `Hook ${next[option.value].enabled === false ? "disabled" : "enabled"}` })
        void show(api)
      }}
    />
  ))
}

const tui: TuiPlugin = async (api) => {
  api.command.register(() => [
    {
      title: "Lifecycle hooks",
      value: "hooks.list",
      category: "system",
      slash: { name: "hooks" },
      onSelect() {
        void show(api)
      },
    },
  ])
}

const plugin: TuiPluginModule & { id: string } = { id, tui }

export default plugin
