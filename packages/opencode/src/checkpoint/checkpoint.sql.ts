import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core"
import { SessionTable } from "@/session/session.sql"
import type { SessionID } from "@/session/schema"
import type { MessageV2 } from "@/session/message-v2"

export const CheckpointTable = sqliteTable("session_checkpoint", {
  id: text().primaryKey(),
  session_id: text().$type<SessionID>().notNull().references(() => SessionTable.id, { onDelete: "cascade" }),
  directory: text().notNull(),
  description: text().notNull(),
  snapshot: text().notNull(),
  time_created: integer().notNull(),
  automatic: integer({ mode: "boolean" }).notNull().default(false),
  files: text({ mode: "json" }).$type<string[]>().notNull(),
  conversation: text({ mode: "json" }).$type<MessageV2.WithParts[]>().notNull(),
  status: text().$type<"ready" | "restoring" | "restored">().notNull().default("ready"),
}, (table) => [index("session_checkpoint_session_idx").on(table.session_id, table.time_created)])
