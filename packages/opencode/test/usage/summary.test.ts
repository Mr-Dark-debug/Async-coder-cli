import { afterEach, describe, expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import { Database } from "../../src/storage"
import { MessageTable, SessionTable, PartTable } from "../../src/session/session.sql"
import { ProjectTable } from "../../src/project/project.sql"
import * as Summary from "../../src/usage/summary"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import { Instance } from "../../src/project/instance"

afterEach(async () => {
  Database.use((db) => {
    db.delete(PartTable).run()
    db.delete(MessageTable).run()
    db.delete(SessionTable).run()
    db.delete(ProjectTable).run()
  })
  await Instance.disposeAll()
})

const it = testEffect(Layer.mergeAll(CrossSpawnSpawner.defaultLayer))

describe("projectMonth", () => {
  test("extrapolates the run rate to month end", () => {
    // 15th at noon of a 31-day month: 15.5 elapsed days
    const now = new Date(2026, 9, 15, 12).getTime()
    expect(Summary.projectMonth({ spent: 15.5, now })).toBeCloseTo(31)
    expect(Summary.projectMonth({ spent: 0, now })).toBe(0)
  })
})

describe("usage summary", () => {
  it.live("groups by provider, model and agent and daily buckets sum to the total", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const now = new Date(2026, 9, 15, 12).getTime()
        const day = 24 * 3600 * 1000
        Database.use((db) => {
          db.insert(ProjectTable)
            .values({ id: "proj_1", worktree: "/tmp", sandboxes: [] as any, time_created: now, time_updated: now } as any)
            .run()
          db.insert(SessionTable)
            .values({ id: "ses_1" as any, project_id: "proj_1" as any, slug: "s", directory: "/tmp", title: "t", version: "1", time_created: now, time_updated: now })
            .run()
          const add = (id: string, at: number, data: object) =>
            db.insert(MessageTable).values({ id: id as any, session_id: "ses_1" as any, agent_id: "main", data: data as any, time_created: at, time_updated: at }).run()
          const usage = (agent: string, cost: number, input: number) => ({
            role: "assistant", providerID: "groq", modelID: "k2", agent, cost,
            tokens: { input, output: 10, reasoning: 0, cache: { read: 5, write: 1 } },
          })
          add("m1", now, usage("build", 0.5, 100))
          add("m2", now - day, usage("build", 0.25, 50))
          add("m3", now - 2 * day, usage("sage", 0.1, 20))
          add("m4", now, { role: "user", cost: 99 })
          add("m5", now - 40 * day, usage("build", 7, 1))
        })
        const month = Summary.summary("month", now)
        expect(month.total).toBeCloseTo(0.85)
        expect(month.daily.reduce((sum, d) => sum + d.cost, 0)).toBeCloseTo(month.total)
        const build = month.rows.find((row) => row.agent === "build")!
        expect(build.messages).toBe(2)
        expect(build.input).toBe(150)
        expect(build.cache_read).toBe(10)
        expect(month.rows.find((row) => row.agent === "sage")?.cost).toBeCloseTo(0.1)
        expect(month.rows[0].agent).toBe("build")
        expect(month.projected_month).toBeGreaterThan(month.total)
        const today = Summary.summary("day", now)
        expect(today.total).toBeCloseTo(0.5)
      }),
    ),
  )
})
