import { Context, Effect, Layer } from "effect"
import path from "path"
import os from "os"
import { Global } from "../global"
import { Database } from "../storage"
import { Config } from "../config"
import { reconcileMemory } from "./reconcile"
import { buildFtsQuery } from "./fts-query"
import * as Recall from "./recall"

type SearchRow = {
  path: string
  scope: string
  scope_id: string
  type: string
  snippet: string
  score: number
}

export interface Interface {
  readonly root: () => Effect.Effect<string>
  readonly reconcile: () => Effect.Effect<{ indexed: number; pruned: number }>
  readonly search: (input: {
    query: string
    scope?: string
    scope_id?: string
    type?: string
    limit?: number
  }) => Effect.Effect<
    Array<{ path: string; snippet: string; score: number; scope: string; scope_id: string; type: string }>
  >
  /** Every indexed memory note, newest first, with whether it is pinned. */
  readonly list: () => Effect.Effect<Array<{ path: string; scope: string; scope_id: string; type: string; pinned: boolean; bytes: number }>>
  /** Read one note. Only files under the memory root can be read. */
  readonly read: (file: string) => Effect.Effect<string | undefined>
  /** Delete a note from disk and from the index. Never silent: callers surface it to the user. */
  readonly forget: (file: string) => Effect.Effect<boolean>
  readonly pin: (file: string, pinned: boolean) => Effect.Effect<boolean>
  /** Bounded recall for prompt injection: best matches that fit a count limit and token budget. */
  readonly recall: (input: {
    query: string
    limit?: number
    tokenBudget?: number
  }) => Effect.Effect<Recall.Hit[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/Memory") {}

export const layer: Layer.Layer<Service, never, Config.Service> = Layer.effect(
  Service,
  Effect.gen(function* () {
    const config = yield* Config.Service
    const root = path.join(Global.Path.data, "memory")
    const ccBase = path.join(os.homedir(), ".claude", "projects")

    const rootEff = Effect.fn("Memory.root")(function* () {
      return root
    })

    const reconcile = Effect.fn("Memory.reconcile")(function* () {
      const cfg = yield* config.get()
      const cc = cfg.memory?.cc_index ? ccBase : undefined
      return yield* Effect.promise(() => reconcileMemory({ asyncCoder: root, cc }))
    })

    const search = Effect.fn("Memory.search")(function* (input: {
      query: string
      scope?: string
      scope_id?: string
      type?: string
      limit?: number
    }) {
      // Lazy reconcile before search (covers off-tool writes); honour config flag.
      const cfg = yield* config.get()
      if (cfg.checkpoint?.memory_reconcile_on_search ?? true) {
        const cc = cfg.memory?.cc_index ? ccBase : undefined
        yield* Effect.promise(() => reconcileMemory({ asyncCoder: root, cc }))
      }

      const limit = input.limit ?? 10
      // Build a token-level FTS5 query: punctuation becomes separators,
      // each alphanumeric run becomes a phrase-quoted literal, OR-joined.
      // See packages/opencode/src/memory/fts-query.ts for the rationale.
      const ftsQuery = buildFtsQuery(input.query)
      if (!ftsQuery) return []

      // OR-join means a doc matching only a common word (e.g. every
      // checkpoint.md matches "checkpoint") still matches, but BM25 ranks it
      // far below a doc matching several rare query words. We drop the
      // common-word noise with a RELATIVE floor: keep results scoring at
      // least `ratio` of the top hit's score. Relative (not absolute)
      // because BM25 magnitudes are corpus-size-dependent — in a tiny corpus
      // every score collapses toward 0 (low IDF), so any fixed absolute floor
      // would wrongly wipe real hits. The #1 result is ALWAYS kept (a match
      // is a match even when BM25 can't discriminate). Default 0.15.
      // Configurable; 0 disables (keep all matches).
      const floorRatio = cfg.checkpoint?.memory_search_score_floor ?? 0.15

      // Construct WHERE clauses for scope/scope_id/type filtering
      const conditions: string[] = []
      const params: string[] = []
      if (input.scope) {
        conditions.push("memory_fts.scope = ?")
        params.push(input.scope)
      }
      if (input.scope_id) {
        conditions.push("memory_fts.scope_id = ?")
        params.push(input.scope_id)
      }
      if (input.type) {
        conditions.push("memory_fts.type = ?")
        params.push(input.type)
      }
      const whereClause = conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : ""

      const sql = `
        SELECT memory_fts.path, memory_fts.scope, memory_fts.scope_id, memory_fts.type,
               snippet(memory_fts_idx, 0, '<<', '>>', '...', 32) AS snippet,
               bm25(memory_fts_idx) AS score
        FROM memory_fts_idx
        JOIN memory_fts ON memory_fts.id = memory_fts_idx.rowid
        WHERE memory_fts_idx MATCH ?
        ${whereClause}
        ORDER BY score
        LIMIT ?
      `

      // Over-fetch (3x, capped) so the relative floor can trim common-word
      // noise without starving the list when there ARE enough real hits.
      const fetchLimit = Math.min(limit * 3, 50)
      const rows = Database.Client().$client.query(sql).all(ftsQuery, ...params, fetchLimit) as SearchRow[]

      // FTS5 bm25() returns lower = better; convert to higher = better for caller
      const mapped = rows.map((r) => ({
        path: r.path,
        snippet: r.snippet,
        score: -r.score,
        scope: r.scope,
        scope_id: r.scope_id,
        type: r.type,
      }))
      if (mapped.length === 0) return []
      // Rows are ORDER BY score (best first), so mapped[0] is the top hit.
      // Always keep it; drop trailing rows below `floorRatio` of its score.
      const topScore = mapped[0].score
      const cutoff = floorRatio > 0 ? topScore * floorRatio : -Infinity
      return mapped.filter((r, i) => i === 0 || r.score >= cutoff).slice(0, limit)
    })

    const pinsFile = path.join(root, ".pins.json")
    const readPins = () => Bun.file(pinsFile).json().then((v) => (Array.isArray(v) ? (v as string[]) : [])).catch(() => [] as string[])
    const inside = (file: string) => {
      const resolved = path.resolve(file)
      const rel = path.relative(root, resolved)
      return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel) ? resolved : undefined
    }

    const list = Effect.fn("Memory.list")(function* () {
      const pins = new Set(yield* Effect.promise(readPins))
      const rows = Database.Client().$client.query("SELECT path, scope, scope_id, type, length(body) AS bytes FROM memory_fts ORDER BY last_indexed_at DESC").all() as Array<{ path: string; scope: string; scope_id: string; type: string; bytes: number }>
      return rows.map((row) => ({ ...row, pinned: pins.has(row.path) }))
    })

    const readNote = Effect.fn("Memory.read")(function* (file: string) {
      const resolved = inside(file)
      if (!resolved) return undefined
      return yield* Effect.promise(() => Bun.file(resolved).text().catch(() => undefined))
    })

    const forget = Effect.fn("Memory.forget")(function* (file: string) {
      const resolved = inside(file)
      if (!resolved || !(yield* Effect.promise(() => Bun.file(resolved).exists()))) return false
      yield* Effect.promise(() => import("fs/promises").then((fs) => fs.rm(resolved)))
      yield* Effect.promise(async () => Bun.write(pinsFile, JSON.stringify((await readPins()).filter((item) => item !== resolved))))
      yield* reconcile()
      return true
    })

    const pin = Effect.fn("Memory.pin")(function* (file: string, pinned: boolean) {
      const resolved = inside(file)
      if (!resolved) return false
      const pins = new Set(yield* Effect.promise(readPins))
      if (pinned) pins.add(resolved)
      else pins.delete(resolved)
      yield* Effect.promise(() => Bun.write(pinsFile, JSON.stringify([...pins])))
      return true
    })

    const recall = Effect.fn("Memory.recall")(function* (input: { query: string; limit?: number; tokenBudget?: number }) {
      const hits = yield* search({ query: input.query, limit: (input.limit ?? Recall.DEFAULT_LIMIT) * 2 })
      // Pinned notes always lead, even when the question does not match them.
      const pinned = yield* Effect.forEach(yield* Effect.promise(readPins), (file) =>
        Effect.promise(() =>
          Bun.file(file).text().then((body): Recall.Hit => ({ path: file, snippet: body.slice(0, 400), score: Infinity, scope: "pinned", scope_id: "", type: "note" })).catch(() => undefined),
        ),
      )
      return Recall.fit(Recall.withPins(pinned.filter((hit): hit is Recall.Hit => hit !== undefined), hits), input)
    })

    return Service.of({
      root: rootEff,
      reconcile,
      search,
      list,
      read: readNote,
      forget,
      pin,
      recall,
    })
  }),
)

export const defaultLayer = Layer.suspend(() => layer.pipe(Layer.provide(Config.defaultLayer)))
