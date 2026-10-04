import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@async-coder/plugin/tui"
import path from "path"

const id = "internal:memory"

type Note = { path: string; scope: string; scope_id: string; type: string; pinned: boolean; bytes: number }

async function browse(api: TuiPluginApi, query?: string) {
  const notes: Note[] = query?.trim()
    ? ((await api.client.memory.search({ query })).data as { path: string }[] | undefined ?? []).map((hit) => ({ path: hit.path, scope: "", scope_id: "", type: "match", pinned: false, bytes: 0 }))
    : ((await api.client.memory.list()).data ?? [])
  api.ui.dialog.replace(() => (
    <api.ui.DialogSelect<Note>
      title={query ? `Memory: ${query}` : `Memory (${notes.length} notes)`}
      placeholder="Search notes, enter to open"
      options={notes.map((note) => ({
        title: `${note.pinned ? "★ " : ""}${path.basename(note.path)}`,
        value: note,
        description: note.scope ? `${note.scope}${note.scope_id ? `/${note.scope_id}` : ""} · ${note.type} · ${note.bytes} bytes` : note.path,
      }))}
      onSelect={(option) => void open(api, option.value)}
    />
  ))
}

async function open(api: TuiPluginApi, note: Note) {
  const text = (await api.client.memory.read({ path: note.path })).data?.text ?? "(unreadable)"
  api.ui.dialog.replace(() => (
    <api.ui.DialogSelect<string>
      title={path.basename(note.path)}
      options={[
        { title: "View", value: "view", description: text.slice(0, 160).replace(/\s+/g, " ") },
        { title: note.pinned ? "Unpin" : "Pin (always recalled)", value: "pin" },
        { title: "Forget (delete this note)", value: "forget" },
        { title: "Back", value: "back" },
      ]}
      onSelect={async (option) => {
        if (option.value === "view") return api.ui.dialog.replace(() => <api.ui.DialogAlert title={path.basename(note.path)} message={text.slice(0, 4000)} onConfirm={() => void browse(api)} />)
        if (option.value === "pin") {
          await api.client.memory.pin({ path: note.path, pinned: !note.pinned })
          api.ui.toast({ variant: "success", message: note.pinned ? "Unpinned" : "Pinned: this note is recalled into every turn" })
        }
        if (option.value === "forget") {
          await api.client.memory.forget({ path: note.path })
          api.ui.toast({ variant: "warning", message: `Forgot ${path.basename(note.path)}` })
        }
        void browse(api)
      }}
    />
  ))
}

const tui: TuiPlugin = async (api) => {
  api.command.register(() => [
    {
      title: "Memory notes",
      value: "memory.open",
      category: "system",
      slash: { name: "memory" },
      onSelect() {
        void browse(api)
      },
    },
  ])
}

const plugin: TuiPluginModule & { id: string } = { id, tui }

export default plugin
