import { afterEach, expect, test } from "bun:test"
import { $ } from "bun"
import fs from "node:fs/promises"
import path from "node:path"
import { tmpdir } from "../fixture/fixture"
import { Instance } from "@/project/instance"
import { Checkpoint } from "@/checkpoint"
import { Session } from "@/session"
import { SessionStatus } from "@/session/status"
import { makeRuntime } from "@/effect/run-service"
import { MessageID, PartID } from "@/session/schema"
import { ProviderID, ModelID } from "@/provider/schema"
import { Database, eq } from "@/storage"
import { CheckpointTable } from "@/checkpoint/checkpoint.sql"
import { Global } from "@/global"
import { Hash } from "@async-coder/shared/util/hash"

const sessions = makeRuntime(Session.Service, Session.defaultLayer)
const status = makeRuntime(SessionStatus.Service, SessionStatus.defaultLayer)
afterEach(() => Instance.disposeAll())

test("restores modified, created and deleted files and the exact conversation anchor; preserves unrelated edits", async () => {
  await using tmp = await tmpdir({ git: true })
  await Promise.all([Bun.write(path.join(tmp.path, "edit.txt"), "original"), Bun.write(path.join(tmp.path, "delete.txt"), "keep"), Bun.write(path.join(tmp.path, "manual.txt"), "manual before")])
  await $`git add .`.cwd(tmp.path).quiet()
  await $`git commit -m files`.cwd(tmp.path).quiet()
  await Instance.provide({ directory: tmp.path, fn: async () => {
    const session = await sessions.runPromise((svc) => svc.create())
    const message = await sessions.runPromise((svc) => svc.updateMessage({ id: MessageID.ascending(), sessionID: session.id, role: "user", agent: "build", model: { providerID: ProviderID.make("test"), modelID: ModelID.make("test") }, time: { created: Date.now() } }))
    const part = await sessions.runPromise((svc) => svc.updatePart({ id: PartID.ascending(), messageID: message.id, sessionID: session.id, type: "text", text: "saved question" }))
    const saved = await Checkpoint.create({ sessionID: session.id, description: "Before edits", files: ["edit.txt", "delete.txt", "new.txt"] })
    await Promise.all([Bun.write(path.join(tmp.path, "edit.txt"), "changed"), fs.unlink(path.join(tmp.path, "delete.txt")), Bun.write(path.join(tmp.path, "new.txt"), "created"), Bun.write(path.join(tmp.path, "manual.txt"), "manual after")])
    await sessions.runPromise((svc) => svc.updatePart({ ...part, text: "mutated existing part" }))
    await sessions.runPromise((svc) => svc.updatePart({ id: PartID.ascending(), messageID: message.id, sessionID: session.id, type: "text", text: "part appended after checkpoint" }))
    await sessions.runPromise((svc) => svc.updateMessage({ ...message, id: MessageID.ascending(), time: { created: Date.now() + 1 } }))
    const restored = await Checkpoint.restore({ sessionID: session.id, id: saved.id })
    expect(restored.restored).toHaveLength(3)
    expect(restored.preserved).toContain(path.join(tmp.path, "manual.txt").replaceAll("\\", "/"))
    expect(await Bun.file(path.join(tmp.path, "edit.txt")).text()).toBe("original")
    expect(await Bun.file(path.join(tmp.path, "delete.txt")).text()).toBe("keep")
    expect(await Bun.file(path.join(tmp.path, "new.txt")).exists()).toBe(false)
    expect(await Bun.file(path.join(tmp.path, "manual.txt")).text()).toBe("manual after")
    expect(await sessions.runPromise((svc) => svc.messages({ sessionID: session.id, agentID: "*" }))).toEqual(saved.conversation)
    expect(Checkpoint.list(session.id)[0]!.status).toBe("restored")
    // A persisted recovery marker can be retried safely after restart.
    Database.use((db) => db.update(CheckpointTable).set({ status: "restoring" }).where(eq(CheckpointTable.id, saved.id)).run())
    expect((await Checkpoint.restore({ sessionID: session.id, id: saved.id })).restored).toEqual([])
  } })
}, 30_000)

test("retention removes old SQLite checkpoints and protects retained trees from Git garbage collection", async () => {
  await using tmp = await tmpdir({ git: true })
  await Instance.provide({ directory: tmp.path, fn: async () => {
    const session = await sessions.runPromise((svc) => svc.create())
    const first = await Checkpoint.create({ sessionID: session.id, retention: 2 })
    await Bun.write(path.join(tmp.path, "new.txt"), "second")
    const second = await Checkpoint.create({ sessionID: session.id, retention: 2, files: ["new.txt"] })
    await Bun.write(path.join(tmp.path, "new.txt"), "third")
    const third = await Checkpoint.create({ sessionID: session.id, retention: 2, files: ["new.txt"] })
    expect(Checkpoint.list(session.id).map((row) => row.id).sort()).toEqual([second.id, third.id].sort())
    const gitdir = path.join(Global.Path.data, "snapshot", Instance.project.id, Hash.fast(Instance.worktree))
    const refs = await $`git --git-dir ${gitdir} for-each-ref refs/checkpoints`.quiet().text()
    expect(refs).not.toContain(first.id)
    expect(refs).toContain(second.id)
    await $`git --git-dir ${gitdir} gc --prune=now`.quiet()
    expect((await $`git --git-dir ${gitdir} cat-file -t ${second.snapshot}`.quiet().text()).trim()).toBe("tree")
    await Checkpoint.restore({ sessionID: session.id, id: second.id })
    expect(await Bun.file(path.join(tmp.path, "new.txt")).text()).toBe("second")
  } })
}, 30_000)

test("rejects invalid retention, cross-workspace files and a running session", async () => {
  await using tmp = await tmpdir({ git: true })
  await Instance.provide({ directory: tmp.path, fn: async () => {
    const session = await sessions.runPromise((svc) => svc.create())
    await expect(Checkpoint.create({ sessionID: session.id, retention: 0 })).rejects.toThrow("retention")
    await expect(Checkpoint.create({ sessionID: session.id, files: ["../../outside"] })).rejects.toThrow("outside")
    const saved = await Checkpoint.create({ sessionID: session.id })
    await status.runPromise((svc) => svc.set(session.id, { type: "busy" }))
    await expect(Checkpoint.restore({ sessionID: session.id, id: saved.id })).rejects.toThrow("Stop the agent")
    await status.runPromise((svc) => svc.set(session.id, { type: "idle" }))
  } })
}, 30_000)
