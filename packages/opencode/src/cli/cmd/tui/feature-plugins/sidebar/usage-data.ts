import type { AssistantMessage, Message, Provider } from "@async-coder/sdk/v2"

export type UsageBucket = {
  providerID: string
  modelID: string
  cost: number
  input: number
  output: number
  reasoning: number
  cacheRead: number
  cacheWrite: number
  messages: number
  timeCreated: number
}

export type UsageSummary = {
  total: UsageBucket
  models: UsageBucket[]
  providers: UsageBucket[]
  days: { date: string; cost: number }[]
}

export const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
})

export const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

export const moneyPrecise = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
})

export function isAssistantMessage(message: Message): message is AssistantMessage {
  return message.role === "assistant"
}

export function formatTokens(value: number) {
  return compactNumber.format(value)
}

export function formatCost(value: number) {
  if (value > 0 && value < 0.01) return moneyPrecise.format(value)
  return money.format(value)
}

export function modelCostLabel(cost: Provider["models"][string]["cost"] | undefined) {
  if (!cost) return undefined
  if (cost.input === 0 && cost.output === 0 && cost.cache.read === 0 && cost.cache.write === 0) return "Free"
  return [
    `$${cost.input.toFixed(2)}/M in`,
    `$${cost.output.toFixed(2)}/M out`,
    `$${cost.cache.read.toFixed(2)}/M cache read`,
    `$${cost.cache.write.toFixed(2)}/M cache write`,
  ].join(" | ")
}

function empty(providerID: string, modelID: string): UsageBucket {
  return {
    providerID,
    modelID,
    cost: 0,
    input: 0,
    output: 0,
    reasoning: 0,
    cacheRead: 0,
    cacheWrite: 0,
    messages: 0,
    timeCreated: 0,
  }
}

function add(target: UsageBucket, message: AssistantMessage) {
  target.cost += message.cost
  target.input += message.tokens.input
  target.output += message.tokens.output
  target.reasoning += message.tokens.reasoning
  target.cacheRead += message.tokens.cache.read
  target.cacheWrite += message.tokens.cache.write
  target.messages += 1
  target.timeCreated = Math.max(target.timeCreated, message.time.created)
  return target
}

function dateKey(time: number) {
  return new Date(time).toISOString().slice(0, 10)
}

export function aggregateUsage(messages: readonly Message[]): UsageSummary {
  const assistants = messages.filter(isAssistantMessage)
  const byModel = assistants.reduce((acc, message) => {
    const key = `${message.providerID}/${message.modelID}`
    acc.set(key, add(acc.get(key) ?? empty(message.providerID, message.modelID), message))
    return acc
  }, new Map<string, UsageBucket>())
  const byProvider = assistants.reduce((acc, message) => {
    acc.set(message.providerID, add(acc.get(message.providerID) ?? empty(message.providerID, ""), message))
    return acc
  }, new Map<string, UsageBucket>())
  const byDay = assistants.reduce((acc, message) => {
    const key = dateKey(message.time.created)
    acc.set(key, (acc.get(key) ?? 0) + message.cost)
    return acc
  }, new Map<string, number>())

  return {
    total: assistants.reduce((acc, message) => add(acc, message), empty("", "")),
    models: Array.from(byModel.values()).sort((a, b) => b.cost - a.cost),
    providers: Array.from(byProvider.values()).sort((a, b) => b.cost - a.cost),
    days: Array.from(byDay.entries())
      .map(([date, cost]) => ({ date, cost }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  }
}

export function contextBar(input: { used: number; limit?: number; width?: number }) {
  const width = input.width ?? 20
  if (!input.limit || input.limit <= 0) return `[${"░".repeat(width)}] 0%`
  const percent = Math.min(100, Math.round((input.used / input.limit) * 100))
  const filled = Math.min(width, Math.round((percent / 100) * width))
  return `[${"█".repeat(filled)}${"░".repeat(width - filled)}] ${percent}%`
}

export function sparkline(days: readonly { date: string; cost: number }[]) {
  const recent = days.slice(-14)
  if (recent.length === 0) return ""
  const max = Math.max(...recent.map((day) => day.cost), 0)
  if (max === 0) return "▁".repeat(recent.length)
  const bars = ["▁", "▂", "▄", "▆", "█"]
  return recent.map((day) => bars[Math.min(bars.length - 1, Math.floor((day.cost / max) * bars.length))]).join("")
}

export function csv(summary: UsageSummary) {
  return [
    "provider,model,cost,input,output,cache_read,cache_write,reasoning,messages",
    ...summary.models.map((item) =>
      [
        item.providerID,
        item.modelID,
        item.cost.toFixed(8),
        item.input,
        item.output,
        item.cacheRead,
        item.cacheWrite,
        item.reasoning,
        item.messages,
      ]
        .map((value) => JSON.stringify(String(value)))
        .join(","),
    ),
  ].join("\n")
}
