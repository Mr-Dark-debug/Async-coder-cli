import type { Message, Part } from "@async-coder/sdk/v2"

/** Search only user-visible content; synthetic prompt material stays out of results. */
type SearchPart =
  | Pick<Extract<Part, { type: "text" }>, "type" | "text" | "synthetic" | "ignored">
  | { type: "tool"; state: { status: "completed"; output: string } | { status: "error"; error: string } | { status: "pending" | "running"; input?: Record<string, unknown> } }
  | { type: Exclude<Part["type"], "text" | "tool"> }

export function conversationSearch(messages: Pick<Message, "id" | "role">[], parts: Record<string, SearchPart[] | undefined>, query: string) {
  const needle = query.trim().toLocaleLowerCase()
  return messages.flatMap((message) => {
    const text = (parts[message.id] ?? []).flatMap((part) => {
      if (part.type === "text" && !part.synthetic && !part.ignored) return [part.text]
      if (part.type === "tool" && part.state.status === "completed") return [part.state.output]
      if (part.type === "tool" && part.state.status === "error") return [part.state.error]
      return []
    }).join("\n")
    const index = needle ? text.toLocaleLowerCase().indexOf(needle) : 0
    if (!text || index < 0) return []
    return [{ id: message.id, role: message.role, text: text.slice(Math.max(0, index - 35), index + 160).replace(/\s+/g, " ") }]
  })
}
