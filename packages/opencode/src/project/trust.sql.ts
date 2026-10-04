import { sqliteTable, text } from "drizzle-orm/sqlite-core"
import { Timestamps } from "../storage/schema.sql"

export const ProjectTrustTable = sqliteTable("project_trust", {
  directory: text().primaryKey(),
  ...Timestamps,
})
