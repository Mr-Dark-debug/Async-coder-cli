import type { TuiPlugin, TuiPluginModule } from "@async-coder/plugin/tui"
import { DialogJobs } from "@tui/component/dialog-jobs"

const id = "internal:jobs"

const tui: TuiPlugin = async (api) => {
  api.command.register(() => [
    {
      title: "Background jobs",
      value: "jobs.open",
      category: "system",
      slash: { name: "jobs", aliases: ["tasks"] },
      onSelect() {
        api.ui.dialog.replace(() => <DialogJobs api={api} />)
      },
    },
  ])

  api.command.register(() => [
    {
      title: "Start a team",
      value: "team.start",
      category: "system",
      slash: { name: "team" },
      async onSelect() {
        const names = (await api.client.team.manifests()).data ?? []
        if (names.length === 0)
          return api.ui.toast({ variant: "info", message: "No team manifests. Add .async-coder/team/<name>.md with a workers list." })
        api.ui.dialog.replace(() => (
          <api.ui.DialogSelect
            title="Start a team"
            options={names.map((name) => ({ title: name, value: name }))}
            onSelect={(option) => {
              api.ui.dialog.clear()
              void api.client.team
                .start({ manifest: option.value })
                .then((res) =>
                  api.ui.toast({
                    variant: res.error ? "error" : "success",
                    message: res.error ? "Could not start the team" : `Team started: ${(res.data as { jobs: unknown[] }).jobs.length} workers (see /jobs)`,
                  }),
                )
            }}
          />
        ))
      },
    },
  ])

  // Announce finished jobs: terminal bell + OSC 9 (desktop notification in terminals that support it) and a toast.
  const stop = api.event.on("job.notify", (evt) => {
    process.stdout.write(evt.properties.sequences)
    api.ui.toast({
      variant: evt.properties.status === "done" ? "success" : "warning",
      title: `Job ${evt.properties.status}`,
      message: evt.properties.title,
      duration: 6000,
    })
  })
  api.lifecycle.onDispose(stop)
}

const plugin: TuiPluginModule & { id: string } = { id, tui }

export default plugin
