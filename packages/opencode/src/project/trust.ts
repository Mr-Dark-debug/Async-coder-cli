import path from "path"
import { Database, eq } from "@/storage"
import { ProjectTrustTable } from "./trust.sql"

const key = (directory: string) => {
  const resolved = path.resolve(directory)
  return process.platform === "win32" ? resolved.toLowerCase() : resolved
}

/** Whether the user has trusted this project to contribute its own skills. Revocable. */
export function isTrusted(directory: string) {
  return !!Database.use((db) => db.select().from(ProjectTrustTable).where(eq(ProjectTrustTable.directory, key(directory))).get())
}

export function grant(directory: string) {
  const now = Date.now()
  Database.use((db) =>
    db
      .insert(ProjectTrustTable)
      .values({ directory: key(directory), time_created: now, time_updated: now })
      .onConflictDoUpdate({ target: ProjectTrustTable.directory, set: { time_updated: now } })
      .run(),
  )
}

export function revoke(directory: string) {
  const had = isTrusted(directory)
  Database.use((db) => db.delete(ProjectTrustTable).where(eq(ProjectTrustTable.directory, key(directory))).run())
  return had
}

export const list = () => Database.use((db) => db.select().from(ProjectTrustTable).all()).map((row) => row.directory)
