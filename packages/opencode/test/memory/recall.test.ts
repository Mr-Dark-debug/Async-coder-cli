import { afterEach, describe, expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import * as fs from "fs/promises"
import path from "path"
import { Database } from "../../src/storage"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { MemoryFtsTable } from "../../src/memory/fts.sql"
import { Memory } from "../../src/memory"
import * as Recall from "../../src/memory/recall"
import { Instance } from "../../src/project/instance"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

afterEach(async () => {
  Database.use((db) => db.delete(MemoryFtsTable).run())
  await Instance.disposeAll()
})

const hit = (n: number, snippet = "word ".repeat(20)): Recall.Hit => ({
  path: `/m/${n}.md`,
  snippet,
  score: 10 - n,
  scope: "global",
  scope_id: "",
  type: "note",
})

describe("recall.fit", () => {
  test("respects the count limit", () => {
    expect(Recall.fit([hit(1), hit(2), hit(3)], { limit: 2 }).map((h) => h.path)).toEqual(["/m/1.md", "/m/2.md"])
  })

  test("never exceeds the token budget", () => {
    const hits = Array.from({ length: 12 }, (_, i) => hit(i))
    const fitted = Recall.fit(hits, { tokenBudget: 100 })
    expect(fitted.length).toBeGreaterThan(0)
    expect(fitted.length).toBeLessThan(12)
    expect(Recall.render(fitted).length / 4).toBeLessThan(100 + 80)
  })

  test("skips an oversize hit but keeps smaller later ones", () => {
    const fitted = Recall.fit([hit(1, "x".repeat(4000)), hit(2, "small")], { tokenBudget: 50 })
    expect(fitted.map((h) => h.path)).toEqual(["/m/2.md"])
  })
})

describe("recall.render", () => {
  test("is empty without hits and strips FTS markers", () => {
    expect(Recall.render([])).toBe("")
    const text = Recall.render([hit(1, "use <<Postgres>>,\n not SQLite")])
    expect(text).toContain("use Postgres, not SQLite")
    expect(text).not.toContain("<<")
    expect(text.startsWith("<memory-recall>")).toBe(true)
  })

  test("query keeps the leading characters", () => {
    expect(Recall.query("  hello ".padEnd(1000, "x")).length).toBe(300)
  })
})

const it = testEffect(Layer.mergeAll(Memory.defaultLayer, CrossSpawnSpawner.defaultLayer))

describe("Memory.recall", () => {
  it.live("recalls a stored preference for a later question", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const memory = yield* Memory.Service
        const root = yield* memory.root()
        yield* Effect.promise(() => fs.rm(root, { recursive: true, force: true }))
        yield* Effect.promise(() => fs.mkdir(path.join(root, "global"), { recursive: true }))
        yield* Effect.promise(() =>
          fs.writeFile(path.join(root, "global", "db.md"), "Preference: use Postgres, not SQLite, for storage"),
        )
        yield* Effect.promise(() => fs.writeFile(path.join(root, "global", "ui.md"), "button colors are lavender"))
        const hits = yield* memory.recall({ query: "which storage database should I use, Postgres?", limit: 5 })
        expect(hits.map((h) => path.basename(h.path))).toContain("db.md")
        expect(Recall.render(hits)).toContain("Postgres")
        expect(yield* memory.recall({ query: "", limit: 5 })).toEqual([])
      }),
    ),
  )
})

describe("Memory management (audit, pin, forget)", () => {
  it.live("lists notes, recalls a pinned note without a query match, and forgets on request", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const memory = yield* Memory.Service
        const root = yield* memory.root()
        yield* Effect.promise(() => fs.rm(root, { recursive: true, force: true }))
        yield* Effect.promise(() => fs.mkdir(path.join(root, "global"), { recursive: true }))
        const style = path.join(root, "global", "style.md")
        const infra = path.join(root, "global", "infra.md")
        yield* Effect.promise(() => fs.writeFile(style, "Always write tests before code"))
        yield* Effect.promise(() => fs.writeFile(infra, "Deploys go through the staging cluster"))
        yield* memory.reconcile()

        const notes = yield* memory.list()
        expect(notes.map((n) => path.basename(n.path)).sort()).toEqual(["infra.md", "style.md"])
        expect(notes.every((n) => !n.pinned)).toBe(true)

        // unrelated question: nothing recalled until the note is pinned
        expect(yield* memory.recall({ query: "kubernetes rollout plan" })).toEqual([])
        expect(yield* memory.pin(style, true)).toBe(true)
        const recalled = yield* memory.recall({ query: "kubernetes rollout plan" })
        expect(recalled.map((h) => path.basename(h.path))).toEqual(["style.md"])
        expect((yield* memory.list()).find((n) => n.path === style)?.pinned).toBe(true)

        // reading is confined to the memory root
        expect(yield* memory.read(style)).toContain("tests before code")
        expect(yield* memory.read(path.join(root, "..", "secrets.txt"))).toBeUndefined()
        expect(yield* memory.read("/etc/hosts")).toBeUndefined()

        // forgetting deletes the file, the index row and the pin
        expect(yield* memory.forget(style)).toBe(true)
        expect(yield* Effect.promise(() => Bun.file(style).exists())).toBe(false)
        expect((yield* memory.list()).map((n) => path.basename(n.path))).toEqual(["infra.md"])
        expect(yield* memory.recall({ query: "kubernetes rollout plan" })).toEqual([])
        expect(yield* memory.forget(path.join(root, "..", "x"))).toBe(false)
      }),
    ),
  )
})
