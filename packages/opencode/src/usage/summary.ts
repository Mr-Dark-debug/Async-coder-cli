import { Database, and, gte, sql } from "@/storage"
import { MessageTable } from "@/session/session.sql"
import { startOfDay, startOfMonth } from "./budget"

export type Range = "day" | "month"

export type Row = {
  provider: string
  model: string
  agent: string
  messages: number
  input: number
  output: number
  reasoning: number
  cache_read: number
  cache_write: number
  cost: number
}

const num = (path: string) => sql<number>`coalesce(sum(json_extract(${MessageTable.data}, ${path})), 0)`
const text = (path: string) => sql<string>`coalesce(json_extract(${MessageTable.data}, ${path}), '')`

export const since = (range: Range, now = Date.now()) => (range === "day" ? startOfDay(now) : startOfMonth(now))

/** Spend grouped by provider, model and agent for assistant messages created since `from`. */
export function rows(from: number): Row[] {
  return Database.use((db) =>
    db
      .select({
        provider: text("$.providerID"),
        model: text("$.modelID"),
        agent: text("$.agent"),
        messages: sql<number>`count(*)`,
        input: num("$.tokens.input"),
        output: num("$.tokens.output"),
        reasoning: num("$.tokens.reasoning"),
        cache_read: num("$.tokens.cache.read"),
        cache_write: num("$.tokens.cache.write"),
        cost: num("$.cost"),
      })
      .from(MessageTable)
      .where(and(gte(MessageTable.time_created, from), sql`json_extract(${MessageTable.data}, '$.role') = 'assistant'`))
      .groupBy(text("$.providerID"), text("$.modelID"), text("$.agent"))
      .all(),
  )
}

export const total = (list: Row[]) => list.reduce((sum, row) => sum + row.cost, 0)

/** Daily spend for each day since `from`, oldest first. Their sum equals the period total. */
export function daily(from: number) {
  const buckets = Database.use((db) =>
    db
      .select({
        day: sql<string>`strftime('%Y-%m-%d', ${MessageTable.time_created} / 1000, 'unixepoch', 'localtime')`,
        cost: num("$.cost"),
      })
      .from(MessageTable)
      .where(and(gte(MessageTable.time_created, from), sql`json_extract(${MessageTable.data}, '$.role') = 'assistant'`))
      .groupBy(sql`1`)
      .orderBy(sql`1`)
      .all(),
  )
  return buckets
}

/** Extrapolate month-end spend from the run rate so far (spend / elapsed days * days in month). */
export function projectMonth(input: { spent: number; now?: number }) {
  const now = new Date(input.now ?? Date.now())
  const day = now.getDate() + now.getHours() / 24
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return day > 0 ? (input.spent / day) * days : input.spent
}

export function summary(range: Range, now = Date.now()) {
  const from = since(range, now)
  const list = rows(from)
  const spent = total(list)
  return {
    range,
    from,
    rows: list.toSorted((a, b) => b.cost - a.cost),
    daily: daily(from),
    total: spent,
    projected_month: range === "month" ? projectMonth({ spent, now }) : undefined,
  }
}
