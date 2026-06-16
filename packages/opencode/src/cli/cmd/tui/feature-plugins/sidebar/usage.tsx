import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@async-coder/plugin/tui"
import { createMemo, createSignal, For, Show } from "solid-js"
import { DialogUsage } from "@tui/component/dialog-usage"
import { aggregateUsage, contextBar, formatCost, formatTokens } from "./usage-data"

const id = "internal:sidebar-usage"

function activeSession(api: TuiPluginApi) {
  if (api.route.current.name !== "session") return
  const sessionID = api.route.current.params?.sessionID
  return typeof sessionID === "string" ? sessionID : undefined
}

function View(props: { api: TuiPluginApi; session_id: string }) {
  const theme = () => props.api.theme.current
  const [expanded, setExpanded] = createSignal(false)
  const messages = createMemo(() => props.api.state.session.messages(props.session_id))
  const summary = createMemo(() => aggregateUsage(messages()))
  const last = createMemo(() => messages().findLast((item) => item.role === "assistant"))
  const activeModel = createMemo(() => {
    const msg = last()
    if (!msg) return
    return props.api.state.provider.find((item) => item.id === msg.providerID)?.models[msg.modelID]
  })
  const activeTokens = createMemo(() => {
    const msg = last()
    if (!msg) return 0
    return msg.tokens.input + msg.tokens.output + msg.tokens.reasoning + msg.tokens.cache.read + msg.tokens.cache.write
  })

  return (
    <box gap={1}>
      <text fg={theme().text}>
        <b>Usage</b>
      </text>
      <box flexDirection="row" gap={1}>
        <text fg={theme().primary}>{formatCost(summary().total.cost)}</text>
        <text fg={theme().textMuted}>in {formatTokens(summary().total.input)}</text>
        <text fg={theme().textMuted}>out {formatTokens(summary().total.output)}</text>
      </box>
      <box flexDirection="row" gap={1}>
        <text fg={theme().textMuted}>cr {formatTokens(summary().total.cacheRead)}</text>
        <text fg={theme().textMuted}>cw {formatTokens(summary().total.cacheWrite)}</text>
        <text fg={theme().textMuted}>reason {formatTokens(summary().total.reasoning)}</text>
      </box>
      <Show when={activeModel()}>
        {(model) => (
          <text fg={theme().textMuted}>
            {contextBar({ used: activeTokens(), limit: model().limit.context })} {formatTokens(activeTokens())} /{" "}
            {formatTokens(model().limit.context)}
          </text>
        )}
      </Show>
      <For each={summary().models.slice(0, expanded() ? 8 : 3)}>
        {(item) => (
          <box>
            <text fg={theme().text} wrapMode="none">
              {item.providerID} / {item.modelID}
            </text>
            <box flexDirection="row" gap={1}>
              <text fg={theme().primary}>{formatCost(item.cost)}</text>
              <text fg={theme().textMuted}>in {formatTokens(item.input)}</text>
              <text fg={theme().textMuted}>out {formatTokens(item.output)}</text>
              <text fg={theme().textMuted}>cr {formatTokens(item.cacheRead)}</text>
              <text fg={theme().textMuted}>cw {formatTokens(item.cacheWrite)}</text>
            </box>
          </box>
        )}
      </For>
      <Show when={summary().models.length > 3}>
        <text fg={theme().textMuted} onMouseUp={() => setExpanded((value) => !value)}>
          {expanded() ? "show less" : `+${summary().models.length - 3} more`}
        </text>
      </Show>
    </box>
  )
}

function show(api: TuiPluginApi) {
  const sessionID = activeSession(api)
  if (!sessionID) {
    api.ui.toast({ variant: "info", message: "Open a session to view usage" })
    return
  }
  api.ui.dialog.replace(() => <DialogUsage api={api} session_id={sessionID} />)
}

const tui: TuiPlugin = async (api) => {
  api.command.register(() => [
    {
      title: "Usage dashboard",
      value: "usage.open",
      category: "system",
      slash: { name: "usage" },
      onSelect() {
        show(api)
      },
    },
  ])

  api.slots.register({
    order: 95,
    slots: {
      sidebar_content(_ctx, props) {
        return <View api={api} session_id={props.session_id} />
      },
    },
  })
}

const plugin: TuiPluginModule & { id: string } = {
  id,
  tui,
}

export default plugin
