import { Database, and, gte, eq, sql } from "@/storage"
import { MessageTable } from "@/session/session.sql"
import type { SessionID } from "@/session/schema"

import type { ConfigUsage } from "@/config/usage"

export type Caps = ConfigUsage.Budget

export type Scope = "session" | "agent" | "daily" | "monthly"
export type Spend = Partial<Record<Scope, number>>
export type Verdict = {
  scope: Scope
  action: "warn" | "stop" | "downgrade"
  spent: number
  cap: number
  message: string
}

const names: Record<Scope, string> = {
  session: "per-session",
  agent: "per-agent",
  daily: "daily",
  monthly: "monthly",
}

const limits = (caps: Caps): [Scope, number | undefined][] => [
  ["session", caps.per_session_usd],
  ["agent", caps.per_agent_usd],
  ["daily", caps.daily_usd],
  ["monthly", caps.monthly_usd],
]

const usd = (value: number) => `$${value.toFixed(value < 1 ? 4 : 2)}`

/** Pure evaluation of caps against spend. Hitting a cap yields the configured action; nearing it yields a warning. */
export function evaluate(caps: Caps | undefined, spend: Spend): Verdict[] {
  if (!caps) return []
  const action = caps.default_action ?? "stop"
  const warnAt = caps.warn_at ?? 0.8
  return limits(caps).flatMap(([scope, cap]): Verdict[] => {
    const spent = spend[scope]
    if (cap === undefined || spent === undefined) return []
    if (spent >= cap)
      return [
        {
          scope,
          action,
          spent,
          cap,
          message: `Budget reached: ${names[scope]} spend ${usd(spent)} is at or over the ${usd(cap)} cap${action === "stop" ? ". Stopping before the next model call" : action === "downgrade" ? ". Continuing on the lite model tier" : ""}.`,
        },
      ]
    if (spent >= cap * warnAt)
      return [
        {
          scope,
          action: "warn",
          spent,
          cap,
          message: `Budget warning: ${names[scope]} spend ${usd(spent)} is ${Math.round((spent / cap) * 100)}% of the ${usd(cap)} cap.`,
        },
      ]
    return []
  })
}

/** The verdict to act on: a stop outranks a warning, and the largest overrun wins within a tier. */
export function decisive(verdicts: Verdict[]): Verdict | undefined {
  const rank = (item: Verdict) => (item.action === "stop" ? 3 : item.action === "downgrade" ? 2 : 1)
  return verdicts.toSorted((a, b) => rank(b) - rank(a) || b.spent / b.cap - a.spent / a.cap)[0]
}

export function startOfDay(now: number) {
  const date = new Date(now)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

export function startOfMonth(now: number) {
  const date = new Date(now)
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime()
}

const cost = sql<number>`coalesce(sum(json_extract(${MessageTable.data}, '$.cost')), 0)`
const assistant = sql`json_extract(${MessageTable.data}, '$.role') = 'assistant'`

/** Sum assistant-message cost across all sessions since the given time (ms epoch). */
export function spentSince(since: number) {
  return (
    Database.use((db) =>
      db
        .select({ total: cost })
        .from(MessageTable)
        .where(and(gte(MessageTable.time_created, since), assistant))
        .get(),
    )?.total ?? 0
  )
}

export function spentInSession(sessionID: SessionID, agentID?: string) {
  return (
    Database.use((db) =>
      db
        .select({ total: cost })
        .from(MessageTable)
        .where(
          and(
            eq(MessageTable.session_id, sessionID),
            assistant,
            agentID ? eq(MessageTable.agent_id, agentID) : undefined,
          ),
        )
        .get(),
    )?.total ?? 0
  )
}

/** Gather only the spend figures the configured caps actually need. */
export function measure(caps: Caps | undefined, input: { sessionID: SessionID; agentID: string; now?: number }): Spend {
  if (!caps) return {}
  const now = input.now ?? Date.now()
  return {
    ...(caps.per_session_usd ? { session: spentInSession(input.sessionID) } : {}),
    ...(caps.per_agent_usd ? { agent: spentInSession(input.sessionID, input.agentID) } : {}),
    ...(caps.daily_usd ? { daily: spentSince(startOfDay(now)) } : {}),
    ...(caps.monthly_usd ? { monthly: spentSince(startOfMonth(now)) } : {}),
  }
}

/** Input and output token totals for a session, all agents included. */
export function tokensInSession(sessionID: SessionID) {
  const row = Database.use((db) =>
    db
      .select({
        input: sql<number>`coalesce(sum(json_extract(${MessageTable.data}, '$.tokens.input') + coalesce(json_extract(${MessageTable.data}, '$.tokens.cache.read'), 0)), 0)`,
        output: sql<number>`coalesce(sum(json_extract(${MessageTable.data}, '$.tokens.output')), 0)`,
      })
      .from(MessageTable)
      .where(and(eq(MessageTable.session_id, sessionID), assistant))
      .get(),
  )
  return { input: row?.input ?? 0, output: row?.output ?? 0 }
}
