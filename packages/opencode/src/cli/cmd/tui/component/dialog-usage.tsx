import { TextAttributes } from "@opentui/core"
import { useKeyboard } from "@opentui/solid"
import type { TuiPluginApi } from "@async-coder/plugin/tui"
import { createEffect, createMemo, createSignal, For, Match, Show, Switch } from "solid-js"
import path from "path"
import { Global } from "@/global"
import {
  aggregateUsage,
  contextBar,
  csv,
  formatCost,
  formatTokens,
  isAssistantMessage,
  sparkline,
} from "../feature-plugins/sidebar/usage-data"

type Range = "today" | "7d" | "30d" | "all"
type Sort = "cost" | "tokens" | "name"

const ranges: Range[] = ["today", "7d", "30d", "all"]
const sorts: Sort[] = ["cost", "tokens", "name"]

function cutoff(range: Range) {
  const now = Date.now()
  if (range === "today") return new Date(new Date(now).toDateString()).getTime()
  if (range === "7d") return now - 7 * 24 * 60 * 60 * 1000
  if (range === "30d") return now - 30 * 24 * 60 * 60 * 1000
  return 0
}

function tokens(item: ReturnType<typeof aggregateUsage>["models"][number]) {
  return item.input + item.output + item.cacheRead + item.cacheWrite + item.reasoning
}

export function DialogUsage(props: { api: TuiPluginApi; session_id: string }) {
  const [range, setRange] = createSignal<Range>("all")
  const [sort, setSort] = createSignal<Sort>("cost")
  const theme = () => props.api.theme.current
  const messages = createMemo(() => props.api.state.session.messages(props.session_id))
  const filtered = createMemo(() => messages().filter((message) => !isAssistantMessage(message) || message.time.created >= cutoff(range())))
  const summary = createMemo(() => aggregateUsage(filtered()))
  const last = createMemo(() => filtered().findLast(isAssistantMessage))
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
  const sortedModels = createMemo(() => {
    const list = [...summary().models]
    if (sort() === "tokens") return list.sort((a, b) => tokens(b) - tokens(a))
    if (sort() === "name") return list.sort((a, b) => `${a.providerID}/${a.modelID}`.localeCompare(`${b.providerID}/${b.modelID}`))
    return list.sort((a, b) => b.cost - a.cost)
  })

  createEffect(() => props.api.ui.dialog.setSize("xlarge"))

  useKeyboard((evt) => {
    if (evt.name === "t") {
      evt.preventDefault()
      setRange((value) => ranges[(ranges.indexOf(value) + 1) % ranges.length])
    }
    if (evt.name === "s") {
      evt.preventDefault()
      setSort((value) => sorts[(sorts.indexOf(value) + 1) % sorts.length])
    }
    if (evt.name === "e") {
      evt.preventDefault()
      const filename = `usage-export-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}.csv`
      void Bun.write(path.join(Global.Path.data, filename), csv(summary())).then(() =>
        props.api.ui.toast({ variant: "success", message: `Exported ${filename}` }),
      )
    }
  })

  return (
    <box paddingLeft={2} paddingRight={2} paddingBottom={1} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme().text}>
          Usage
        </text>
        <text fg={theme().textMuted}>t range | s sort | e export | esc</text>
      </box>

      <box flexDirection="row" gap={2}>
        <text fg={theme().primary}>{formatCost(summary().total.cost)}</text>
        <text fg={theme().textMuted}>in {formatTokens(summary().total.input)}</text>
        <text fg={theme().textMuted}>out {formatTokens(summary().total.output)}</text>
        <text fg={theme().textMuted}>cr {formatTokens(summary().total.cacheRead)}</text>
        <text fg={theme().textMuted}>cw {formatTokens(summary().total.cacheWrite)}</text>
        <text fg={theme().textMuted}>reason {formatTokens(summary().total.reasoning)}</text>
      </box>

      <box flexDirection="row" gap={2}>
        <text fg={theme().text}>range {range()}</text>
        <text fg={theme().text}>sort {sort()}</text>
        <Show when={activeModel()}>
          {(model) => (
            <text fg={theme().textMuted}>
              {contextBar({ used: activeTokens(), limit: model().limit.context })} {formatTokens(activeTokens())} /{" "}
              {formatTokens(model().limit.context)}
            </text>
          )}
        </Show>
      </box>

      <box>
        <text fg={theme().text}>Daily</text>
        <text fg={theme().primary}>{sparkline(summary().days)}</text>
      </box>

      <box>
        <text fg={theme().text}>Providers</text>
        <For each={summary().providers}>
          {(item) => (
            <box flexDirection="row" justifyContent="space-between">
              <text fg={theme().text}>{item.providerID}</text>
              <text fg={theme().primary}>{formatCost(item.cost)}</text>
              <text fg={theme().textMuted}>{formatTokens(tokens(item))} tokens</text>
            </box>
          )}
        </For>
      </box>

      <box>
        <text fg={theme().text}>Models</text>
        <Show when={sortedModels().length > 0} fallback={<text fg={theme().textMuted}>No assistant usage yet</text>}>
          <For each={sortedModels()}>
            {(item) => (
              <box flexDirection="row" justifyContent="space-between">
                <text fg={theme().text} wrapMode="none">
                  {item.providerID} / {item.modelID}
                </text>
                <text fg={theme().primary}>{formatCost(item.cost)}</text>
                <text fg={theme().textMuted}>
                  in {formatTokens(item.input)} out {formatTokens(item.output)} cr {formatTokens(item.cacheRead)} cw{" "}
                  {formatTokens(item.cacheWrite)}
                </text>
              </box>
            )}
          </For>
        </Show>
      </box>

      <Switch>
        <Match when={range() !== "all"}>
          <text fg={theme().textMuted}>Showing synced messages for the current session in this TUI.</text>
        </Match>
      </Switch>
    </box>
  )
}
