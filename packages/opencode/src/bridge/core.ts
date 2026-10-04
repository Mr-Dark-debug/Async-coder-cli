export type Allow = { chats?: readonly (string | number)[]; users?: readonly (string | number)[] }

export type Incoming = { chat: string; user: string; text: string; username?: string }

/** Only allowlisted chats or users may drive the agent. An empty allowlist denies everyone. */
export function authorized(msg: Pick<Incoming, "chat" | "user">, allow: Allow | undefined) {
  const chats = (allow?.chats ?? []).map(String)
  const users = (allow?.users ?? []).map(String)
  if (chats.length === 0 && users.length === 0) return false
  return chats.includes(msg.chat) || users.includes(msg.user)
}

/** Split text for chat limits, preferring paragraph then line then space boundaries. */
export function chunk(text: string, limit = 4000) {
  const out: string[] = []
  let rest = text.trim()
  while (rest.length > limit) {
    const slice = rest.slice(0, limit)
    const cut = Math.max(slice.lastIndexOf("\n\n"), slice.lastIndexOf("\n"), slice.lastIndexOf(" "))
    const at = cut > limit * 0.5 ? cut : limit
    out.push(rest.slice(0, at).trimEnd())
    rest = rest.slice(at).trimStart()
  }
  if (rest) out.push(rest)
  return out
}

export type Command =
  | { type: "prompt"; text: string }
  | { type: "details" }
  | { type: "allow" }
  | { type: "deny" }
  | { type: "new" }
  | { type: "help" }

/** Chat commands are slash words; everything else is a prompt for the agent. */
export function parse(text: string): Command {
  const trimmed = text.trim()
  const word = /^\/(\w+)(?:@\w+)?(?:\s|$)/.exec(trimmed)?.[1]?.toLowerCase()
  if (word === "details") return { type: "details" }
  if (word === "allow") return { type: "allow" }
  if (word === "deny") return { type: "deny" }
  if (word === "new") return { type: "new" }
  if (word === "help" || word === "start") return { type: "help" }
  return { type: "prompt", text: trimmed }
}

export const HELP = [
  "Send a message to give the agent a task.",
  "/details  full text of the last reply",
  "/allow /deny  answer a permission request",
  "/new  start a fresh session",
].join("\n")

/** One-line progress for a tool call, never the full output. */
export function progress(tool: string, input?: Record<string, unknown>) {
  const target = [input?.filePath, input?.command, input?.pattern, input?.url].find((v): v is string => typeof v === "string")
  return `• ${tool}${target ? ` ${target.replace(/\s+/g, " ").slice(0, 80)}` : ""}`
}
