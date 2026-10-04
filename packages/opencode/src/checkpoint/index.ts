import path from "node:path"
import z from "zod"
import { Effect } from "effect"
import { Database, and, desc, eq, inArray } from "@/storage"
import { Session } from "@/session"
import { MessageV2 } from "@/session/message-v2"
import { SyncEvent } from "@/sync"
import { SessionID } from "@/session/schema"
import { SessionStatus } from "@/session/status"
import { Snapshot } from "@/snapshot"
import { Instance } from "@/project/instance"
import { InstanceState } from "@/effect"
import { Config } from "@/config"
import { makeRuntime } from "@/effect/run-service"
import { CheckpointTable } from "./checkpoint.sql"

const snapshots = makeRuntime(Snapshot.Service, Snapshot.defaultLayer)
const sessions = makeRuntime(Session.Service, Session.defaultLayer)
const config = makeRuntime(Config.Service, Config.defaultLayer)
const status = makeRuntime(SessionStatus.Service, SessionStatus.defaultLayer)

export type Info = typeof CheckpointTable.$inferSelect
export const Summary = z.object({ id: z.string(), session_id: SessionID.zod, directory: z.string(), description: z.string(), snapshot: z.string(), time_created: z.number(), automatic: z.boolean(), files: z.array(z.string()), status: z.enum(["ready", "restoring", "restored"]), messages: z.number() }).meta({ ref: "SessionCheckpointSummary" })
export const RestoreResult = z.object({ id: z.string(), restored: z.array(z.string()), preserved: z.array(z.string()), messageCount: z.number() }).meta({ ref: "SessionCheckpointRestore" })
export const summarize = (row: Info) => ({ ...row, conversation: undefined, messages: row.conversation.length })

export function list(sessionID: SessionID) {
  return Database.use((db) => db.select().from(CheckpointTable).where(and(eq(CheckpointTable.session_id, sessionID), eq(CheckpointTable.directory, Instance.directory))).orderBy(desc(CheckpointTable.time_created), desc(CheckpointTable.id)).all())
}

function scope(files: string[]) {
  return [...new Set(files.map((file) => path.resolve(Instance.directory, file)))].map((file) => {
    if (!Instance.containsPath(file)) throw new Error(`Checkpoint file is outside the workspace: ${file}`)
    return file.replaceAll("\\", "/")
  })
}

export async function create(input: { sessionID: SessionID; description?: string; automatic?: boolean; files?: string[]; retention?: number }) {
  const settings = await config.runPromise((svc) => svc.get())
  const retention = input.retention ?? settings.checkpoints?.retention ?? 10
  if (!Number.isInteger(retention) || retention < 1) throw new Error("Checkpoint retention must be a positive integer")
  const files = scope(input.files ?? [])
  const session = await sessions.runPromise((svc) => svc.get(input.sessionID))
  if (path.resolve(session.directory) !== path.resolve(Instance.directory)) throw new Error("Checkpoint session belongs to another workspace")
  const snapshot = await snapshots.runPromise((svc) => svc.track())
  if (!snapshot) throw new Error("File checkpoints require Git snapshots to be enabled in a Git project")
  const conversation = await sessions.runPromise((svc) => svc.messages({ sessionID: input.sessionID, agentID: "*" }))
  const row: Info = {
    id: `cp_${Date.now().toString(36)}_${crypto.randomUUID().replaceAll("-", "")}`,
    session_id: input.sessionID,
    directory: Instance.directory,
    description: input.description ?? "Checkpoint",
    snapshot,
    time_created: Date.now(),
    automatic: input.automatic ?? false,
    files,
    conversation,
    status: "ready",
  }
  await snapshots.runPromise((svc) => svc.retain(row.id, snapshot))
  Database.use((db) => db.insert(CheckpointTable).values(row).run())
  const expired = list(input.sessionID).filter((checkpoint) => checkpoint.status !== "restoring").slice(retention)
  await Promise.all(expired.map((checkpoint) => snapshots.runPromise((svc) => svc.release(checkpoint.id))))
  if (expired.length) Database.use((db) => db.delete(CheckpointTable).where(inArray(CheckpointTable.id, expired.map((checkpoint) => checkpoint.id))).run())
  return row
}

export async function auto(input: { sessionID: SessionID; tool: string; files?: string[] }) {
  const settings = await config.runPromise((svc) => svc.get())
  if (settings.checkpoints?.enabled === false || settings.snapshot === false || Instance.project.vcs !== "git") return
  const session = await sessions.runPromise((svc) => svc.get(input.sessionID))
  // Isolated workflow actors can retain the parent's session id. Their per-step snapshots
  // remain in the isolated workspace; an explicit parent-conversation checkpoint cannot.
  if (path.resolve(session.directory) !== path.resolve(Instance.directory)) return
  const files = input.files?.filter((file) => Instance.containsPath(path.resolve(Instance.directory, file)))
  if (input.files?.length && !files?.length) return
  return create({ ...input, files, description: `Before ${input.tool}`, automatic: true })
}

export function autoEffect(input: { sessionID: SessionID; tool: string; files?: string[] }) {
  return Effect.gen(function* () {
    const instance = yield* InstanceState.context
    return yield* Effect.promise(() => Instance.restore(instance, () => auto(input)))
  })
}

export async function restore(input: { sessionID: SessionID; id: string; files?: string[]; allFiles?: boolean }) {
  const checkpoint = list(input.sessionID).find((row) => row.id === input.id)
  if (!checkpoint) throw new Error("Checkpoint not found in this session and workspace")
  if (await status.runPromise((svc) => svc.get(input.sessionID)).then((value) => value.type !== "idle")) throw new Error("Stop the agent before restoring a checkpoint")
  const messages = await sessions.runPromise((svc) => svc.messages({ sessionID: input.sessionID, agentID: "*" }))
  const savedParts = new Set(checkpoint.conversation.flatMap((message) => message.parts.map((part) => part.id)))
  const changed = await snapshots.runPromise((svc) => svc.patch(checkpoint.snapshot))
  const owned = scope([
    ...list(input.sessionID).filter((row) => row.time_created >= checkpoint.time_created).flatMap((row) => row.files),
    ...messages.flatMap((message) => message.parts.filter((part) => !savedParts.has(part.id)).flatMap((part) => part.type === "patch" ? part.files : [])),
    ...(input.files ?? []),
  ])
  const files = input.allFiles ? changed.files : changed.files.filter((file) => owned.includes(file))
  // Persist an idempotent recovery marker before changing disk or conversation.
  Database.use((db) => db.update(CheckpointTable).set({ status: "restoring" }).where(eq(CheckpointTable.id, checkpoint.id)).run())
  await snapshots.runPromise((svc) => svc.revert([{ hash: checkpoint.snapshot, files }]))
  const remaining = await snapshots.runPromise((svc) => svc.patch(checkpoint.snapshot))
  if (files.some((file) => remaining.files.includes(file))) throw new Error("Checkpoint files could not all be restored; conversation was preserved. Retry this checkpoint after resolving file access errors.")
  Database.transaction((db) => {
    for (const message of messages) SyncEvent.run(MessageV2.Event.Removed, { sessionID: input.sessionID, messageID: message.info.id })
    for (const message of checkpoint.conversation) {
      SyncEvent.run(MessageV2.Event.Updated, { sessionID: input.sessionID, info: message.info })
      for (const part of message.parts) SyncEvent.run(MessageV2.Event.PartUpdated, { sessionID: input.sessionID, part, time: Date.now() })
    }
    SyncEvent.run(Session.Event.Updated, { sessionID: input.sessionID, info: { revert: null, time: { updated: Date.now() } } })
    db.update(CheckpointTable).set({ status: "restored" }).where(eq(CheckpointTable.id, checkpoint.id)).run()
  })
  return { id: checkpoint.id, restored: files, preserved: changed.files.filter((file) => !files.includes(file)), messageCount: checkpoint.conversation.length }
}

export * as Checkpoint from "."
