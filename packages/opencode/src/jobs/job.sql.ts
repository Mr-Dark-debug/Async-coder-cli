import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core"
import type { SessionID } from "../session/schema"
import { Timestamps } from "../storage/schema.sql"

export type GateResult = { command: string; code: number; ms: number; output: string }
export type VerifyResult = { pass: boolean; attempts: number; gates: GateResult[] }

export const JobTable = sqliteTable(
  "job",
  {
    id: text().primaryKey(),
    session_id: text().$type<SessionID>(),
    name: text().notNull(),
    prompt: text().notNull(),
    agent: text(),
    model: text(),
    status: text().$type<"queued" | "running" | "done" | "failed" | "cancelled">().notNull().default("queued"),
    directory: text(),
    branch: text(),
    team_id: text(),
    role: text(),
    budget_usd: real(),
    cost_usd: real().notNull().default(0),
    error: text(),
    result: text(),
    verify: text({ mode: "json" }).$type<string[]>(),
    verify_retries: integer().notNull().default(0),
    verify_result: text({ mode: "json" }).$type<VerifyResult>(),
    tokens_in: integer().notNull().default(0),
    tokens_out: integer().notNull().default(0),
    notified: integer({ mode: "boolean" }).notNull().default(false),
    time_started: integer(),
    time_finished: integer(),
    ...Timestamps,
  },
  (table) => [index("job_status_idx").on(table.status, table.time_created), index("job_team_idx").on(table.team_id)],
)
