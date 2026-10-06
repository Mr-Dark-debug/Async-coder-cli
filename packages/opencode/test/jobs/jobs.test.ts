import { afterEach, describe, expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import { Database } from "../../src/storage"
import { JobTable } from "../../src/jobs/job.sql"
import * as Store from "../../src/jobs/store"
import * as Notify from "../../src/jobs/notify"
import { canTransition, name, slug, terminal, transition } from "../../src/jobs/state"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import { Instance } from "../../src/project/instance"

afterEach(async () => {
  Database.use((db) => db.delete(JobTable).run())
  await Instance.disposeAll()
})

describe("job state machine", () => {
  test("allows the documented edges only", () => {
    expect(canTransition("queued", "running")).toBe(true)
    expect(canTransition("running", "done")).toBe(true)
    expect(canTransition("running", "cancelled")).toBe(true)
    expect(canTransition("failed", "queued")).toBe(true)
    expect(canTransition("done", "running")).toBe(false)
    expect(canTransition("queued", "done")).toBe(false)
    expect(() => transition("done", "failed")).toThrow("Invalid job transition done -> failed")
  })

  test("terminal states", () => {
    expect(["done", "failed", "cancelled"].every((s) => terminal(s as any))).toBe(true)
    expect(terminal("running")).toBe(false)
  })

  test("slug and name", () => {
    expect(slug("Fix the AUTH e2e test!!")).toBe("fix-the-auth-e2e-test")
    expect(slug("!!!")).toBe("job")
    expect(slug("x".repeat(100)).length).toBeLessThanOrEqual(32)
    expect(name("a".repeat(80)).length).toBe(48)
    expect(name("first line\nsecond")).toBe("first line")
  })
})

const it = testEffect(Layer.mergeAll(CrossSpawnSpawner.defaultLayer))

describe("job store", () => {
  it.live("create, move and list with timestamps", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const job = Store.create({ name: "n", prompt: "p", budget_usd: 1 })
        expect(job.status).toBe("queued")
        expect(job.id.startsWith("job")).toBe(true)
        const running = Store.move(job.id, "running")
        expect(running.time_started).not.toBeNull()
        const done = Store.move(job.id, "done", { result: "ok", cost_usd: 0.25 })
        expect(done.time_finished).not.toBeNull()
        expect(done.cost_usd).toBe(0.25)
        expect(() => Store.move(job.id, "running")).toThrow()
        expect(Store.list({ status: ["done"] }).map((j) => j.id)).toEqual([job.id])
        expect(Store.list({ status: ["running"] })).toEqual([])
      }),
    ),
  )

  it.live("survives a restart: orphaned running jobs are failed, live ones kept", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const orphan = Store.create({ name: "orphan", prompt: "p" })
        const kept = Store.create({ name: "kept", prompt: "p" })
        Store.move(orphan.id, "running")
        Store.move(kept.id, "running")
        expect(Store.reapOrphans(new Set([kept.id]))).toBe(1)
        expect(Store.get(orphan.id)?.status).toBe("failed")
        expect(Store.get(orphan.id)?.error).toContain("Server stopped")
        expect(Store.get(kept.id)?.status).toBe("running")
      }),
    ),
  )

  it.live("counts by status", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        Store.create({ name: "a", prompt: "p" })
        const b = Store.create({ name: "b", prompt: "p" })
        Store.move(b.id, "cancelled")
        expect(Store.counts()).toEqual({ queued: 1, cancelled: 1 })
      }),
    ),
  )

  it.live("recovery covers every orphan beyond the default list page", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const jobs = Array.from({ length: 110 }, (_, i) => Store.create({ name: `job ${i}`, prompt: "p" }))
        jobs.forEach((job) => Store.move(job.id, "running"))
        expect(Store.reapOrphans(new Set())).toBe(110)
        expect(jobs.every((job) => Store.get(job.id)?.status === "failed")).toBe(true)
      }),
    ),
  )
})

describe("job notifications", () => {
  const at = (h: number, m = 0) => new Date(2026, 9, 4, h, m)

  test("quiet hours, including a range that wraps midnight", () => {
    const night = { start: "22:00", end: "07:00" }
    expect(Notify.quiet(night, at(23))).toBe(true)
    expect(Notify.quiet(night, at(3))).toBe(true)
    expect(Notify.quiet(night, at(12))).toBe(false)
    expect(Notify.quiet({ start: "09:00", end: "17:00" }, at(10))).toBe(true)
    expect(Notify.quiet({ start: "09:00", end: "17:00" }, at(18))).toBe(false)
    expect(Notify.quiet(undefined, at(3))).toBe(false)
    expect(Notify.quiet({ start: "bad", end: "07:00" }, at(3))).toBe(false)
  })

  test("a job notifies once, only when finished or failed, and not during quiet hours", () => {
    const base = { notified: false, status: "done" as const, now: at(12) }
    expect(Notify.shouldNotify(base)).toBe(true)
    expect(Notify.shouldNotify({ ...base, notified: true })).toBe(false)
    expect(Notify.shouldNotify({ ...base, status: "cancelled" })).toBe(false)
    expect(Notify.shouldNotify({ ...base, quietHours: { start: "11:00", end: "13:00" } })).toBe(false)
    expect(Notify.shouldNotify({ ...base, status: "failed" })).toBe(true)
  })

  test("escape sequences are a bell plus OSC 9 with control characters stripped", () => {
    const text = Notify.sequences({ title: "fix\x1b[31m auth", status: "done" })
    expect(text.startsWith("\x07\x1b]9;Finished: fix")).toBe(true)
    expect(text.slice(1)).not.toContain("\x1b[31m")
    expect(Notify.sequences({ title: "t", status: "failed" })).toContain("Failed: t")
  })
})
