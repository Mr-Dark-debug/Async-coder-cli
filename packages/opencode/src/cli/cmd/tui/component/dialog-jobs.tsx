import { TextAttributes } from "@opentui/core"
import { useKeyboard } from "@opentui/solid"
import type { TuiPluginApi } from "@async-coder/plugin/tui"
import type { Job } from "@async-coder/sdk/v2"
import { createEffect, createSignal, For, onCleanup, onMount, Show } from "solid-js"
import { formatCost } from "../feature-plugins/sidebar/usage-data"

const icon = { queued: "…", running: "▶", done: "✓", failed: "✗", cancelled: "■" } as const

export const age = (from: number, to = Date.now()) => {
  const seconds = Math.max(0, Math.round((to - from) / 1000))
  return seconds < 60 ? `${seconds}s` : seconds < 3600 ? `${Math.floor(seconds / 60)}m` : `${Math.floor(seconds / 3600)}h`
}

export function DialogJobs(props: { api: TuiPluginApi }) {
  const theme = () => props.api.theme.current
  const [jobs, setJobs] = createSignal<Job[]>([])
  const [cursor, setCursor] = createSignal(0)
  const refresh = () =>
    void props.api.client.job.list().then((res) => {
      setJobs(res.data ?? [])
      setCursor((value) => Math.min(value, Math.max(0, (res.data?.length ?? 1) - 1)))
    })

  onMount(() => {
    refresh()
    const handle = setInterval(refresh, 2000)
    onCleanup(() => clearInterval(handle))
  })
  createEffect(() => props.api.ui.dialog.setSize("xlarge"))

  const selected = () => jobs()[cursor()]

  useKeyboard((evt) => {
    if (evt.name === "j" || evt.name === "down") setCursor((value) => Math.min(value + 1, jobs().length - 1))
    if (evt.name === "k" || evt.name === "up") setCursor((value) => Math.max(value - 1, 0))
    if (evt.name === "r") refresh()
    if (evt.name === "x") {
      const job = selected()
      if (!job || (job.status !== "running" && job.status !== "queued")) return
      void props.api.client.job.cancel({ jobID: job.id }).then(refresh)
      props.api.ui.toast({ variant: "info", message: `Cancelling ${job.name}` })
    }
    if (evt.name === "o") {
      const job = selected()
      if (!job?.session_id) return
      props.api.ui.dialog.clear()
      props.api.route.navigate("session", { sessionID: job.session_id })
    }
    if (evt.name === "n") {
      props.api.ui.dialog.replace(() => (
        <props.api.ui.DialogPrompt
          title="New background job"
          placeholder="What should the job do? (runs in its own worktree)"
          onConfirm={(value) => {
            if (!value.trim()) return
            void props.api.client.job
              .create({ prompt: value.trim(), worktree: true })
              .then(() => props.api.ui.toast({ variant: "success", message: "Job started in the background" }))
              .finally(() => props.api.ui.dialog.replace(() => <DialogJobs api={props.api} />))
          }}
          onCancel={() => props.api.ui.dialog.replace(() => <DialogJobs api={props.api} />)}
        />
      ))
    }
  })

  return (
    <box paddingLeft={2} paddingRight={2} paddingBottom={1} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme().text}>
          Jobs
        </text>
        <text fg={theme().textMuted}>j/k move | n new | x cancel | o open session | r refresh | esc</text>
      </box>
      <Show when={jobs().length > 0} fallback={<text fg={theme().textMuted}>No jobs yet. Press n to start one.</text>}>
        <For each={jobs()}>
          {(job, index) => (
            <box flexDirection="row" gap={2} backgroundColor={index() === cursor() ? theme().backgroundElement : undefined}>
              <text
                fg={
                  job.status === "done"
                    ? theme().success
                    : job.status === "failed"
                      ? theme().error
                      : job.status === "running"
                        ? theme().primary
                        : theme().textMuted
                }
              >
                {icon[job.status]}
              </text>
              <text fg={theme().text} wrapMode="none">
                {(job.role ? `${job.role}: ${job.name}` : job.name).slice(0, 36).padEnd(36)}
              </text>
              <text fg={theme().textMuted}>{job.status.padEnd(9)}</text>
              <text fg={theme().primary}>{formatCost(job.cost_usd)}</text>
              <text fg={theme().textMuted}>{age(job.time_started ?? job.time_created, job.time_finished ?? Date.now())}</text>
              <Show when={job.branch}>
                <text fg={theme().textMuted}>{job.branch}</text>
              </Show>
            </box>
          )}
        </For>
        <Show when={selected()?.error}>
          <text fg={theme().error}>{selected()?.error}</text>
        </Show>
        <Show when={selected()?.result && selected()?.status === "done"}>
          <text fg={theme().textMuted}>{(selected()?.result ?? "").slice(0, 400)}</text>
        </Show>
      </Show>
    </box>
  )
}
