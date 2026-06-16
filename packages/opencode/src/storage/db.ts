export * from "drizzle-orm"
import { LocalContext } from "../util"
import { lazy } from "../util/lazy"
import { Global } from "../global"
import { Log } from "../util"
import { NamedError } from "@async-coder/shared/util/error"
import z from "zod"
import path from "path"
import { copyFileSync, readFileSync, readdirSync, existsSync } from "fs"
import { Flag } from "../flag/flag"
import { InstallationChannel } from "../installation/version"
import { InstanceState } from "@/effect"
import { iife } from "@/util/iife"
import { init } from "#db"

declare const OPENCODE_MIGRATIONS: { sql: string; timestamp: number; name: string }[] | undefined

export const NotFoundError = NamedError.create(
  "NotFoundError",
  z.object({
    message: z.string(),
  }),
)

const log = Log.create({ service: "db" })

export function getChannelPath() {
  if (["latest", "beta", "prod"].includes(InstallationChannel) || Flag.ASYNC_CODER_DISABLE_CHANNEL_DB)
    return path.join(Global.Path.data, "async-coder.db")
  const safe = InstallationChannel.replace(/[^a-zA-Z0-9._-]/g, "-")
  return path.join(Global.Path.data, `async-coder-${safe}.db`)
}

export const Path = iife(() => {
  if (Flag.ASYNC_CODER_DB) {
    if (Flag.ASYNC_CODER_DB === ":memory:" || path.isAbsolute(Flag.ASYNC_CODER_DB)) return Flag.ASYNC_CODER_DB
    return path.join(Global.Path.data, Flag.ASYNC_CODER_DB)
  }
  return getChannelPath()
})

function getLegacyChannelPath() {
  if (["latest", "beta", "prod"].includes(InstallationChannel) || Flag.ASYNC_CODER_DISABLE_CHANNEL_DB)
    return path.join(Global.Path.data, "mi" + "mo" + "code.db")
  const safe = InstallationChannel.replace(/[^a-zA-Z0-9._-]/g, "-")
  return path.join(Global.Path.data, "mi" + "mo" + `code-${safe}.db`)
}

function migrateLegacyDatabase() {
  if (Flag.ASYNC_CODER_DB) return
  const oldDb = getLegacyChannelPath()
  if (!existsSync(Path) && existsSync(oldDb)) {
    copyFileSync(oldDb, Path)
    log.info("migrated legacy database", { from: oldDb, to: Path })
  }
}

type Client = ReturnType<typeof init>

export type Transaction = Parameters<Parameters<Client["transaction"]>[0]>[0]

type Journal = { sql: string; timestamp: number; name: string }[]

function time(tag: string) {
  const match = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(tag)
  if (!match) return 0
  return Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6]),
  )
}

function migrations(dir: string): Journal {
  const dirs = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)

  const sql = dirs
    .map((name) => {
      const file = path.join(dir, name, "migration.sql")
      if (!existsSync(file)) return
      return {
        sql: readFileSync(file, "utf-8"),
        timestamp: time(name),
        name,
      }
    })
    .filter(Boolean) as Journal

  return sql.sort((a, b) => a.timestamp - b.timestamp)
}

function applyMigrations(db: Client, entries: Journal) {
  db.run(`
    CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      id integer PRIMARY KEY AUTOINCREMENT,
      hash text NOT NULL,
      created_at numeric
    )
  `)
  const last = db.values<[number, string, number]>(
    `SELECT id, hash, created_at FROM "__drizzle_migrations" ORDER BY created_at DESC LIMIT 1`,
  )[0]
  const pending = entries.filter((item) => !last || Number(last[2]) < item.timestamp)
  if (pending.length === 0) return
  db.transaction((tx) => {
    for (const item of pending) {
      for (const statement of item.sql.split("--> statement-breakpoint").filter((statement) => statement.trim())) {
        tx.run(statement)
      }
      tx.run(
        `INSERT INTO "__drizzle_migrations" ("hash", "created_at") VALUES('${item.name.replace(/'/g, "''")}', ${item.timestamp})`,
      )
    }
  })
}

export const Client = lazy(() => {
  migrateLegacyDatabase()
  log.info("opening database", { path: Path })

  const db = init(Path)

  db.run("PRAGMA journal_mode = WAL")
  db.run("PRAGMA synchronous = NORMAL")
  db.run("PRAGMA busy_timeout = 5000")
  db.run("PRAGMA cache_size = -64000")
  db.run("PRAGMA foreign_keys = ON")
  db.run("PRAGMA wal_checkpoint(PASSIVE)")

  // Apply schema migrations
  const entries =
    typeof OPENCODE_MIGRATIONS !== "undefined"
      ? OPENCODE_MIGRATIONS
      : migrations(path.join(import.meta.dirname, "../../migration"))
  if (entries.length > 0) {
    log.info("applying migrations", {
      count: entries.length,
      mode: typeof OPENCODE_MIGRATIONS !== "undefined" ? "bundled" : "dev",
    })
    if (Flag.ASYNC_CODER_SKIP_MIGRATIONS) {
      for (const item of entries) {
        item.sql = "select 1;"
      }
    }
    applyMigrations(db, entries)
  }

  return db
})

export function close() {
  Client().$client.close()
  Client.reset()
}

export type TxOrDb = Transaction | Client

const ctx = LocalContext.create<{
  tx: TxOrDb
  effects: (() => void | Promise<void>)[]
}>("database")

export function use<T>(callback: (trx: TxOrDb) => T): T {
  try {
    return callback(ctx.use().tx)
  } catch (err) {
    if (err instanceof LocalContext.NotFound) {
      const effects: (() => void | Promise<void>)[] = []
      const result = ctx.provide({ effects, tx: Client() }, () => callback(Client()))
      for (const effect of effects) effect()
      return result
    }
    throw err
  }
}

export function effect(fn: () => any | Promise<any>) {
  const bound = InstanceState.bind(fn)
  try {
    ctx.use().effects.push(bound)
  } catch {
    bound()
  }
}

type NotPromise<T> = T extends Promise<any> ? never : T

export function transaction<T>(
  callback: (tx: TxOrDb) => NotPromise<T>,
  options?: {
    behavior?: "deferred" | "immediate" | "exclusive"
  },
): NotPromise<T> {
  try {
    return callback(ctx.use().tx)
  } catch (err) {
    if (err instanceof LocalContext.NotFound) {
      const effects: (() => void | Promise<void>)[] = []
      const txCallback = InstanceState.bind((tx: TxOrDb) => ctx.provide({ tx, effects }, () => callback(tx)))
      const result = Client().transaction(txCallback, { behavior: options?.behavior })
      for (const effect of effects) effect()
      return result as NotPromise<T>
    }
    throw err
  }
}
