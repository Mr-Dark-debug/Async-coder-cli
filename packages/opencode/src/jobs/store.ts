import { Database, eq, desc, and, inArray, sql } from "@/storage"
import { Identifier } from "@/id/id"
import { JobTable } from "./job.sql"
import { SageInvocationTable } from "@/sage/sage.sql"
import { transition, type Status } from "./state"

export type Job = typeof JobTable.$inferSelect

export function create(input: {
  name: string
  prompt: string
  agent?: string
  model?: string
  directory?: string
  branch?: string
  budget_usd?: number
  team_id?: string
  role?: string
  verify?: string[]
  verify_retries?: number
}) {
  const id = Identifier.ascending("job")
  const now = Date.now()
  Database.use((db) =>
    db
      .insert(JobTable)
      .values({ id, ...input, status: "queued", time_created: now, time_updated: now })
      .run(),
  )
  return get(id)!
}

export function get(id: string) {
  return Database.use((db) => db.select().from(JobTable).where(eq(JobTable.id, id)).get())
}

export function list(input?: { status?: Status[]; limit?: number; team_id?: string }) {
  return Database.use((db) =>
    db
      .select()
      .from(JobTable)
      .where(
        and(
          input?.status?.length ? inArray(JobTable.status, input.status) : undefined,
          input?.team_id ? eq(JobTable.team_id, input.team_id) : undefined,
        ),
      )
      .orderBy(desc(JobTable.time_created))
      .limit(input?.limit ?? 100)
      .all(),
  )
}

export function patch(id: string, values: Partial<Omit<Job, "id">>) {
  Database.use((db) =>
    db
      .update(JobTable)
      .set({ ...values, time_updated: Date.now() })
      .where(eq(JobTable.id, id))
      .run(),
  )
  return get(id)
}

/** Move a job to a new status, validating the transition and stamping start/finish times. */
export function move(id: string, to: Status, extra?: Partial<Omit<Job, "id" | "status">>) {
  const current = get(id)
  if (!current) throw new Error(`Job not found: ${id}`)
  transition(current.status, to)
  const now = Date.now()
  return patch(id, {
    ...extra,
    status: to,
    ...(to === "running" ? { time_started: now, time_finished: null } : {}),
    ...(to === "done" || to === "failed" || to === "cancelled" ? { time_finished: now } : {}),
  })!
}

/** Jobs left "running" by a process that is gone (server crash or restart) are failed on startup. */
export function reapOrphans(alive: Set<string>) {
  const stale = list({ status: ["running"] }).filter((job) => !alive.has(job.id))
  for (const job of stale) move(job.id, "failed", { error: "Server stopped while the job was running" })
  return stale.length
}

export function counts() {
  const rows = Database.use((db) =>
    db
      .select({ status: JobTable.status, n: sql<number>`count(*)` })
      .from(JobTable)
      .where(and())
      .groupBy(JobTable.status)
      .all(),
  )
  return Object.fromEntries(rows.map((row) => [row.status, row.n])) as Partial<Record<Status, number>>
}

export function recordSage(input: { job_id: string; stage: "critique" | "judge"; reason: string; session_id?: string; cost_usd: number }) {
  const now = Date.now()
  Database.use((db) =>
    db
      .insert(SageInvocationTable)
      .values({ id: Identifier.ascending("job").replace("job", "sag"), ...input, time_created: now, time_updated: now })
      .run(),
  )
}

export function sageInvocations(jobID: string) {
  return Database.use((db) => db.select().from(SageInvocationTable).where(eq(SageInvocationTable.job_id, jobID)).all())
}
