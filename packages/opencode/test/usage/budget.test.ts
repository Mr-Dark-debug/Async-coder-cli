import { describe, expect, test, afterEach } from "bun:test"
import { Effect, Layer } from "effect"
import { Database } from "../../src/storage"
import { MessageTable, SessionTable, PartTable } from "../../src/session/session.sql"
import { ProjectTable } from "../../src/project/project.sql"
import * as Budget from "../../src/usage/budget"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import { Instance } from "../../src/project/instance"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"

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

describe("budget.evaluate", () => {
  test("no caps yields nothing", () => {
    expect(Budget.evaluate(undefined, { session: 100 })).toEqual([])
    expect(Budget.evaluate({}, { session: 100 })).toEqual([])
  })

  test("under the warn threshold is silent", () => {
    expect(Budget.evaluate({ per_session_usd: 1 }, { session: 0.5 })).toEqual([])
  })

  test("crossing warn_at warns (default 0.8)", () => {
    const [verdict] = Budget.evaluate({ per_session_usd: 1 }, { session: 0.85 })
    expect(verdict?.action).toBe("warn")
    expect(verdict?.scope).toBe("session")
  })

  test("custom warn_at moves the threshold", () => {
    expect(Budget.evaluate({ per_session_usd: 1, warn_at: 0.5 }, { session: 0.55 })[0]?.action).toBe("warn")
  })

  test("reaching a cap stops by default", () => {
    const [verdict] = Budget.evaluate({ per_session_usd: 0.01 }, { session: 0.01 })
    expect(verdict?.action).toBe("stop")
    expect(verdict?.message).toContain("per-session")
    expect(verdict?.message).toContain("Stopping")
  })

  test("default_action warn never stops", () => {
    const [verdict] = Budget.evaluate({ daily_usd: 1, default_action: "warn" }, { daily: 5 })
    expect(verdict?.action).toBe("warn")
    expect(verdict?.message).not.toContain("Stopping")
  })

  test("scopes without a measurement are ignored", () => {
    expect(Budget.evaluate({ daily_usd: 1, per_agent_usd: 1 }, { agent: 2 }).map((v) => v.scope)).toEqual(["agent"])
  })

  test("decisive prefers stop over warn", () => {
    const verdicts = Budget.evaluate({ per_session_usd: 1, daily_usd: 10 }, { session: 1.5, daily: 9 })
    expect(Budget.decisive(verdicts)?.scope).toBe("session")
    expect(Budget.decisive([])).toBeUndefined()
  })

  test("a large warning overrun cannot suppress an agent hard stop", () => {
    const verdicts = [
      ...Budget.evaluate({ daily_usd: 0.01, default_action: "warn" }, { daily: 100 }),
      ...Budget.evaluate({ per_agent_usd: 1 }, { agent: 1 }),
    ]
    expect(Budget.decisive(verdicts)?.action).toBe("stop")
    expect(Budget.decisive(verdicts)?.scope).toBe("agent")
  })

  test("downgrade action continues on the lite tier and ranks between warn and stop", () => {
    const [down] = Budget.evaluate({ daily_usd: 1, default_action: "downgrade" }, { daily: 2 })
    expect(down?.action).toBe("downgrade")
    expect(down?.message).toContain("lite")
    const mixed = [
      ...Budget.evaluate({ daily_usd: 1, default_action: "downgrade" }, { daily: 2 }),
      ...Budget.evaluate({ per_session_usd: 10 }, { session: 9 }),
    ]
    expect(Budget.decisive(mixed)?.action).toBe("downgrade")
    expect(Budget.decisive([...mixed, ...Budget.evaluate({ per_agent_usd: 1 }, { agent: 5 })])?.action).toBe("stop")
  })

  test("period starts are local midnight and first of month", () => {
    const now = new Date(2026, 9, 15, 13, 45).getTime()
    expect(Budget.startOfDay(now)).toBe(new Date(2026, 9, 15).getTime())
    expect(Budget.startOfMonth(now)).toBe(new Date(2026, 9, 1).getTime())
  })
})

describe("budget.measure", () => {
  it.live("sums assistant cost per session, agent and period", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const now = Date.now()
        const old = new Date(2026, 0, 1).getTime()
        Database.use((db) => {
          db.insert(ProjectTable)
            .values({
              id: "proj_1",
              worktree: "/tmp",
              sandboxes: [] as any,
              time_created: now,
              time_updated: now,
            } as any)
            .run()
          for (const id of ["ses_1", "ses_2"])
            db.insert(SessionTable)
              .values({
                id: id as any,
                project_id: "proj_1" as any,
                slug: id,
                directory: "/tmp",
                title: "t",
                version: "1",
                time_created: now,
                time_updated: now,
              })
              .run()
          const row = (id: string, session: string, agent: string, role: string, cost: number, at: number) =>
            db
              .insert(MessageTable)
              .values({
                id: id as any,
                session_id: session as any,
                agent_id: agent,
                data: { role, cost } as any,
                time_created: at,
                time_updated: at,
              })
              .run()
          row("m1", "ses_1", "main", "assistant", 0.25, now)
          row("m2", "ses_1", "main", "user", 99, now)
          row("m3", "ses_1", "explore-1", "assistant", 0.5, now)
          row("m4", "ses_2", "main", "assistant", 1, now)
          row("m5", "ses_2", "main", "assistant", 10, old)
        })
        const spend = Budget.measure(
          { per_session_usd: 1, per_agent_usd: 1, daily_usd: 1, monthly_usd: 1 },
          { sessionID: "ses_1" as any, agentID: "main", now },
        )
        expect(spend.session).toBeCloseTo(0.75)
        expect(spend.agent).toBeCloseTo(0.25)
        expect(spend.daily).toBeCloseTo(1.75)
        expect(spend.monthly).toBeCloseTo(1.75)
        expect(Budget.measure({ per_session_usd: 1 }, { sessionID: "ses_1" as any, agentID: "main", now })).toEqual({
          session: spend.session,
        })
        expect(Budget.measure(undefined, { sessionID: "ses_1" as any, agentID: "main" })).toEqual({})
      }),
    ),
  )
})
