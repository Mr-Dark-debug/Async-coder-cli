import { afterEach, describe, expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import path from "path"
import { Database } from "../../src/storage"
import { JobTable } from "../../src/jobs/job.sql"
import * as Store from "../../src/jobs/store"
import { git } from "../../src/jobs/git"
import * as Team from "../../src/team/run"
import { parse, workerPrompt } from "../../src/team/plan"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import { Instance } from "../../src/project/instance"

afterEach(async () => {
  Database.use((db) => db.delete(JobTable).run())
  await Instance.disposeAll()
})

describe("team manifest", () => {
  test("parses workers and uses the body as the goal", () => {
    const plan = parse(
      "/x/.async-coder/team/ship.md",
      `---\nworkers:\n  - role: backend\n    prompt: add the endpoint\n  - role: tests\n    prompt: cover it\n    agent: build\n    budget_usd: 0.5\n---\nShip the export feature.\n`,
    )
    expect(plan.name).toBe("ship")
    expect(plan.goal).toBe("Ship the export feature.")
    expect(plan.workers.map((w) => w.role)).toEqual(["backend", "tests"])
    expect(plan.workers[1].budget_usd).toBe(0.5)
  })

  test("rejects malformed manifests", () => {
    expect(() => parse("a.md", "---\nname: x\n---\nbody")).toThrow("workers")
    expect(() => parse("a.md", "---\nworkers:\n  - role: a\n---\n")).toThrow("needs a prompt")
    expect(() => parse("a.md", "---\nworkers:\n  - {role: a, prompt: p}\n  - {role: a, prompt: q}\n---\n")).toThrow("unique")
  })

  test("worker prompt carries the goal, assignment and ownership rules", () => {
    const text = workerPrompt({ name: "t", goal: "G", workers: [] }, { role: "api", prompt: "do api" })
    expect(text).toContain('"api" worker on team "t"')
    expect(text).toContain("Team goal: G")
    expect(text).toContain("do api")
    expect(text).toContain("own git worktree")
  })
})

const it = testEffect(Layer.mergeAll(CrossSpawnSpawner.defaultLayer))

async function branch(root: string, name: string, file: string, content: string) {
  await git(root, ["checkout", "-q", "-b", name])
  await Bun.write(path.join(root, file), content)
  await git(root, ["add", "-A"])
  await git(root, ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", name])
  await git(root, ["checkout", "-q", "-"])
}

describe("team merge", () => {
  it.live("merges non-overlapping workers sequentially", () =>
    provideTmpdirInstance(
      (dir) =>
        Effect.gen(function* () {
          yield* Effect.promise(async () => {
            await Bun.write(path.join(dir, "base.txt"), "base\n")
            await git(dir, ["add", "-A"])
            await git(dir, ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", "base"])
            await branch(dir, "w-a", "a.txt", "a\n")
            await branch(dir, "w-b", "b.txt", "b\n")
          })
          for (const [role, b] of [["a", "w-a"], ["b", "w-b"]] as const) {
            const job = Store.create({ name: role, prompt: "p", team_id: "team_1", role, branch: b })
            Store.move(job.id, "running")
            Store.move(job.id, "done")
          }
          const failed = Store.create({ name: "c", prompt: "p", team_id: "team_1", role: "c", branch: "w-c" })
          Store.move(failed.id, "cancelled")
          const result = yield* Effect.promise(() => Team.merge("team_1"))
          expect(result.merged.map((m) => m.role)).toEqual(["a", "b"])
          expect(result.skipped).toEqual([{ role: "c", reason: "cancelled" }])
          expect(result.conflicted).toBeUndefined()
          expect((yield* Effect.promise(() => Bun.file(path.join(dir, "a.txt")).text())).trim()).toBe("a")
          expect((yield* Effect.promise(() => Bun.file(path.join(dir, "b.txt")).text())).trim()).toBe("b")
          expect(Team.status("team_1").complete).toBe(true)
        }),
      { git: true },
    ),
  )

  it.live("stops at the first conflict and leaves the tree clean", () =>
    provideTmpdirInstance(
      (dir) =>
        Effect.gen(function* () {
          yield* Effect.promise(async () => {
            await Bun.write(path.join(dir, "shared.txt"), "base\n")
            await git(dir, ["add", "-A"])
            await git(dir, ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", "base"])
            await branch(dir, "w-1", "shared.txt", "one\n")
            await branch(dir, "w-2", "shared.txt", "two\n")
            await branch(dir, "w-3", "other.txt", "three\n")
          })
          for (const [role, b] of [["one", "w-1"], ["two", "w-2"], ["three", "w-3"]] as const) {
            const job = Store.create({ name: role, prompt: "p", team_id: "team_2", role, branch: b })
            Store.move(job.id, "running")
            Store.move(job.id, "done")
          }
          const result = yield* Effect.promise(() => Team.merge("team_2"))
          expect(result.merged.map((m) => m.role)).toEqual(["one"])
          expect(result.conflicted?.role).toBe("two")
          expect(yield* Effect.promise(() => git(dir, ["status", "--porcelain=v1"]))).toBe("")
        }),
      { git: true },
    ),
  )

  it.live("refuses to merge into a dirty destination", () =>
    provideTmpdirInstance(
      (dir) =>
        Effect.gen(function* () {
          yield* Effect.promise(() => Bun.write(path.join(dir, "dirty.txt"), "x"))
          const exit = yield* Effect.exit(Effect.promise(() => Team.merge("team_3")))
          expect(exit._tag).toBe("Failure")
        }),
      { git: true },
    ),
  )
})
