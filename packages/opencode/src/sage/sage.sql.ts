import { sqliteTable, text, real, index } from "drizzle-orm/sqlite-core"
import { Timestamps } from "../storage/schema.sql"

export const SageInvocationTable = sqliteTable(
  "sage_invocation",
  {
    id: text().primaryKey(),
    job_id: text().notNull(),
    stage: text().$type<"critique" | "judge">().notNull(),
    reason: text().notNull(),
    session_id: text(),
    cost_usd: real().notNull().default(0),
    ...Timestamps,
  },
  (table) => [index("sage_invocation_job_idx").on(table.job_id)],
)
