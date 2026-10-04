import { createMemo, createSignal } from "solid-js"
import { DialogSelect } from "@tui/ui/dialog-select"
import { useSync } from "@tui/context/sync"
import { useDialog } from "@tui/ui/dialog"
import type { Message } from "@async-coder/sdk/v2"
import { conversationSearch } from "../../util/conversation-search"

export function DialogConversationSearch(props: { messages: Message[]; onSelect: (id: string) => void }) {
  const sync = useSync()
  const dialog = useDialog()
  const [query, setQuery] = createSignal("")
  const matches = createMemo(() => conversationSearch(props.messages, sync.data.part, query()))
  return <DialogSelect title="Search conversation" placeholder="Search messages and tool results" skipFilter
    onFilter={setQuery}
    options={matches().map((match) => ({ title: match.text, value: match.id, category: match.role }))}
    onSelect={(option) => { props.onSelect(option.value); dialog.clear() }} />
}
