import { TextAttributes } from "@opentui/core"
import { useKeyboard } from "@opentui/solid"
import type { TuiPluginApi } from "@async-coder/plugin/tui"
import { createEffect, createMemo, For, Show } from "solid-js"
import { bar, breakdown, level, turnsLeft, used } from "../feature-plugins/sidebar/context-data"
import { formatTokens, isAssistantMessage } from "../feature-plugins/sidebar/usage-data"

export function DialogContext(props: { api: TuiPluginApi; session_id: string }) {
  const theme = () => props.api.theme.current
  const messages = createMemo(() => props.api.state.session.messages(props.session_id))
  const finished = createMemo(() => messages().filter(isAssistantMessage).filter((item) => item.tokens.output > 0))
  const last = createMemo(() => finished().at(-1))
  const model = createMemo(() => {
    const msg = last()
    if (!msg) return
    return props.api.state.provider.find((item) => item.id === msg.providerID)?.models[msg.modelID]
  })
  const total = createMemo(() => (last() ? used(last()!.tokens) : 0))
  const limit = createMemo(() => model()?.limit.context ?? 0)
  const percent = createMemo(() => (limit() ? Math.min(100, Math.round((total() / limit()) * 100)) : 0))
  const threshold = createMemo(() => Math.round(((props.api.state.config.compaction as { threshold?: number } | undefined)?.threshold ?? 1) * 100))
  const slices = createMemo(() =>
    breakdown({ total: total(), messages: messages(), parts: (id) => props.api.state.part(id) }),
  )
  const left = createMemo(() => turnsLeft(finished().map((item) => used(item.tokens)), (limit() * threshold()) / 100))
  const color = () => {
    const state = level(percent())
    return state === "ok" ? theme().success : state === "warn" ? theme().warning : theme().error
  }

  createEffect(() => props.api.ui.dialog.setSize("large"))

  useKeyboard((evt) => {
    if (evt.name !== "c") return
    evt.preventDefault()
    const msg = last()
    if (!msg) return props.api.ui.toast({ variant: "info", message: "Nothing to compact yet" })
    void props.api.client.session.summarize({
      sessionID: props.session_id,
      providerID: msg.providerID,
      modelID: msg.modelID,
    })
    props.api.ui.toast({ variant: "info", message: "Compacting session…" })
    props.api.ui.dialog.clear()
  })

  return (
    <box paddingLeft={2} paddingRight={2} paddingBottom={1} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme().text}>
          Context
        </text>
        <text fg={theme().textMuted}>c compact now | esc</text>
      </box>
      <Show when={last()} fallback={<text fg={theme().textMuted}>No completed turns yet.</text>}>
        <box flexDirection="row" gap={2}>
          <text fg={color()}>{percent()}%</text>
          <text fg={theme().text}>
            {formatTokens(total())} / {limit() ? formatTokens(limit()) : "unknown"}
          </text>
          <text fg={theme().textMuted}>auto-compacts at {threshold()}% of usable window</text>
        </box>
        <Show when={left() !== undefined}>
          <text fg={theme().textMuted}>At the current burn rate the window reaches the compaction point in ~{left()} turns.</text>
        </Show>
        <box>
          <For each={slices()}>
            {(slice) => (
              <box flexDirection="row" gap={1}>
                <text fg={theme().textMuted} wrapMode="none">
                  {slice.label.padEnd(36)}
                </text>
                <text fg={theme().primary}>{formatTokens(slice.tokens).padStart(6)}</text>
                <text fg={theme().primary}>{bar(slice.tokens, total())}</text>
              </box>
            )}
          </For>
        </box>
        <text fg={theme().textMuted}>Conversation slices are estimates (about 4 characters per token); the total comes from the provider.</text>
      </Show>
    </box>
  )
}
