import type { AssistantMessage, Message, Part } from "@async-coder/sdk/v2"

export type Slice = { key: "system" | "user" | "assistant" | "tools" | "reasoning" | "attachments"; label: string; tokens: number }

/** Rough token estimate, four characters per token — the same heuristic the server's Token.estimate uses. */
export const estimate = (text: string) => Math.max(0, Math.round(text.length / 4))

export function used(tokens: AssistantMessage["tokens"]) {
  return tokens.total ?? tokens.input + tokens.output + tokens.reasoning + tokens.cache.read + tokens.cache.write
}

const sum = (parts: readonly Part[], pick: (part: Part) => number) => parts.reduce((total, part) => total + pick(part), 0)

/**
 * Split the current context into slices. Conversation slices are estimated from the visible parts;
 * "system" is whatever remains of the provider-reported total (system prompt, rules, tool schemas, memory).
 */
export function breakdown(input: {
  total: number
  messages: readonly Message[]
  parts: (messageID: string) => readonly Part[]
}): Slice[] {
  const slices = { user: 0, assistant: 0, tools: 0, reasoning: 0, attachments: 0 }
  for (const message of input.messages) {
    const parts = input.parts(message.id)
    const text = sum(parts, (part) => (part.type === "text" ? estimate(part.text) : 0))
    if (message.role === "user") slices.user += text
    else slices.assistant += text
    slices.reasoning += sum(parts, (part) => (part.type === "reasoning" ? estimate(part.text) : 0))
    slices.tools += sum(parts, (part) =>
      part.type === "tool" && part.state.status === "completed" ? estimate(part.state.output) + estimate(JSON.stringify(part.state.input)) : 0,
    )
    slices.attachments += sum(parts, (part) => (part.type === "file" ? estimate(part.source?.text?.value ?? part.filename ?? "") + 256 : 0))
  }
  const known = Object.values(slices).reduce((total, value) => total + value, 0)
  return [
    { key: "system", label: "system, rules, tool schemas, memory", tokens: Math.max(0, input.total - known) },
    { key: "user", label: "your messages", tokens: slices.user },
    { key: "assistant", label: "assistant text", tokens: slices.assistant },
    { key: "tools", label: "tool calls and results", tokens: slices.tools },
    { key: "reasoning", label: "reasoning", tokens: slices.reasoning },
    { key: "attachments", label: "attachments", tokens: slices.attachments },
  ]
}

/** Context fill state: ok under 70%, warn under 85%, danger from 85%. */
export function level(percent: number) {
  return percent < 70 ? "ok" : percent < 85 ? "warn" : "danger"
}

/** Projected turns until `target` tokens, from the average growth across the given per-turn totals. */
export function turnsLeft(history: number[], target: number) {
  if (history.length < 2) return undefined
  const growth = (history[history.length - 1] - history[0]) / (history.length - 1)
  if (growth <= 0) return undefined
  return Math.max(0, Math.ceil((target - history[history.length - 1]) / growth))
}

export function bar(tokens: number, total: number, width = 24) {
  if (total <= 0) return ""
  return "█".repeat(Math.max(tokens > 0 ? 1 : 0, Math.round((tokens / total) * width)))
}
