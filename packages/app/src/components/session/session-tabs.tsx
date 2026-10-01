import { useNavigate, useParams } from "@solidjs/router"
import { createEffect, createMemo, For, Show } from "solid-js"
import { createStore } from "solid-js/store"
import { useSync } from "@/context/sync"
import { Persist, persisted } from "@/utils/persist"
import { openSessionTab, closeSessionTab } from "./session-tabs-state"

/** Session navigation is independent of the existing file/review tabs. */
export function SessionTabs() {
  const params = useParams<{ dir: string; id?: string }>()
  const navigate = useNavigate()
  const sync = useSync()
  const [store, setStore, , ready] = persisted(Persist.global("session-tabs"), createStore({ directories: {} as Record<string, string[]> }))
  const tabs = createMemo(() => store.directories[params.dir] ?? [])
  createEffect(() => {
    const id = params.id
    if (!ready() || !id) return
    setStore("directories", params.dir, (current = []) => openSessionTab(current, id))
  })
  const go = (id?: string) => navigate(`/${params.dir}/session${id ? `/${id}` : ""}`)
  return <div role="tablist" aria-label="Agent sessions" class="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border-weak-base px-3 py-1">
    <For each={tabs()}>{(id) => {
      const session = createMemo(() => sync.data.session.find((item) => item.id === id))
      return <div class="flex shrink-0 items-center rounded-md border border-border-weak-base" classList={{ "bg-surface-interactive-weak": params.id === id }}>
        <button role="tab" aria-selected={params.id === id} class="max-w-48 truncate px-3 py-2 text-12 text-text-base hover:text-text-strong" onClick={() => go(id)} title={session()?.title ?? id}>
          <Show when={sync.data.session_status[id]?.type && sync.data.session_status[id]?.type !== "idle"}><span class="mr-1 text-icon-warning-base">●</span></Show>
          {session()?.title ?? id}
        </button>
        <button class="px-2 py-2 text-text-weak hover:text-text-strong" aria-label={`Close tab ${session()?.title ?? id}`} title="Close tab (agent continues running)" onClick={() => {
          const next = closeSessionTab(tabs(), id, params.id)
          setStore("directories", params.dir, next.tabs)
          if (id === params.id) go(next.active)
        }}>×</button>
      </div>
    }}</For>
    <Show when={!params.id}><span role="tab" aria-selected="true" class="shrink-0 px-3 py-2 text-12 text-text-base">New session</span></Show>
    <button class="shrink-0 px-3 py-2 text-text-base hover:text-text-strong" aria-label="New agent session" title="New session" onClick={() => go()}>+</button>
  </div>
}
