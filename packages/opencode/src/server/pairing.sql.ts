import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core"
import { Timestamps } from "../storage/schema.sql"

export const PairedDeviceTable = sqliteTable(
  "paired_device",
  {
    id: text().primaryKey(),
    name: text().notNull(),
    token_hash: text().notNull(),
    time_last_seen: integer(),
    revoked: integer({ mode: "boolean" }).notNull().default(false),
    ...Timestamps,
  },
  (table) => [uniqueIndex("paired_device_token_idx").on(table.token_hash)],
)
