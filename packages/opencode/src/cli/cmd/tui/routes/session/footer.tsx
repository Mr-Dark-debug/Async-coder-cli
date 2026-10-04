import { createMemo, Match, onCleanup, onMount, Show, Switch } from "solid-js"
import { useTheme } from "../../context/theme"
import { useSync } from "../../context/sync"
import { useDirectory } from "../../context/directory"
import { useConnected } from "../../component/dialog-model"
import { createStore } from "solid-js/store"
import { useRoute, useCurrentAgentID } from "../../context/route"
import { useLocal } from "../../context/local"
import { useTerminalDimensions } from "@opentui/solid"

export function Footer() {
  const { theme } = useTheme()
  const sync = useSync()
  const route = useRoute()
  const local = useLocal()
  const dimensions = useTerminalDimensions()
  const agentID = useCurrentAgentID()
  const messages = createMemo(() => route.data.type === "session" ? sync.data.message[route.data.sessionID]?.[agentID()] ?? [] : [])
  const cost = createMemo(() => messages().reduce((total, message) => total + (message.role === "assistant" ? message.cost : 0), 0))
  const status = createMemo(() => route.data.type === "session" ? sync.data.session_status[route.data.sessionID]?.type ?? "idle" : "idle")
  const mcp = createMemo(() => Object.values(sync.data.mcp).filter((x) => x.status === "connected").length)
  const mcpError = createMemo(() => Object.values(sync.data.mcp).some((x) => x.status === "failed"))
  const lsp = createMemo(() => sync.data.lsp.filter((server) => server.status === "connected"))
  const lspError = createMemo(() => sync.data.lsp.some((server) => server.status === "error"))
  const diagnostics = createMemo(() => sync.data.lsp.reduce((total, server) => total + (server.diagnostics ?? 0), 0))
  const permissions = createMemo(() => {
    if (route.data.type !== "session") return []
    return sync.data.permission[route.data.sessionID] ?? []
  })
  const directory = useDirectory()
  const connected = useConnected()

  const [store, setStore] = createStore({
    welcome: false,
  })

  onMount(() => {
    // Track all timeouts to ensure proper cleanup
    const timeouts: ReturnType<typeof setTimeout>[] = []

    function tick() {
      if (connected()) return
      if (!store.welcome) {
        setStore("welcome", true)
        timeouts.push(setTimeout(() => tick(), 5000))
        return
      }

      if (store.welcome) {
        setStore("welcome", false)
        timeouts.push(setTimeout(() => tick(), 10_000))
        return
      }
    }
    timeouts.push(setTimeout(() => tick(), 10_000))

    onCleanup(() => {
      timeouts.forEach(clearTimeout)
    })
  })

  return (
    <box flexDirection="row" justifyContent="space-between" gap={1} flexShrink={0}>
      <text fg={theme.textMuted} wrapMode="none">
        <Show when={route.data.type === "session"} fallback={directory()}>
          <span style={{ fg: status() === "idle" ? theme.success : theme.warning }}>●</span> {local.agent.current()?.name ?? "agent"}
          <Show when={dimensions().width > 85}> · {local.model.current()?.modelID}</Show>
          <Show when={status() !== "idle"}> · {status()}</Show>
        </Show>
      </text>
      <box gap={2} flexDirection="row" flexShrink={0}>
        <Switch>
          <Match when={store.welcome}>
            <text fg={theme.text}>
              Get started <span style={{ fg: theme.textMuted }}>/connect</span>
            </text>
          </Match>
          <Match when={connected() || route.data.type === "session"}>
            <Show when={permissions().length > 0}>
              <text fg={theme.warning}>
                <span style={{ fg: theme.warning }}>△</span> {permissions().length} Permission
                {permissions().length > 1 ? "s" : ""}
              </text>
            </Show>
            <text fg={theme.text}>
              <span style={{ fg: lspError() ? theme.error : lsp().length > 0 ? theme.success : theme.textMuted }}>•</span> {lsp().length} LSP
              <Show when={diagnostics() > 0}><span style={{ fg: theme.warning }}> · {diagnostics()} diagnostic{diagnostics() === 1 ? "" : "s"}</span></Show>
            </text>
            <Show when={mcp() || mcpError()}>
              <text fg={theme.text}>
                <Switch>
                  <Match when={mcpError()}>
                    <span style={{ fg: theme.error }}>⊙ </span>
                  </Match>
                  <Match when={true}>
                    <span style={{ fg: theme.success }}>⊙ </span>
                  </Match>
                </Switch>
                {mcp()} MCP
              </text>
            </Show>
            <Show when={route.data.type === "session"}><text fg={theme.textMuted}>${cost().toFixed(2)}</text></Show>
            <Show when={dimensions().width > 100}><text fg={theme.textMuted}>/status</text></Show>
          </Match>
        </Switch>
      </box>
    </box>
  )
}
