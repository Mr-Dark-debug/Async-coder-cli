import { createHash, randomBytes, randomInt, timingSafeEqual } from "crypto"
import { Database, eq, and, desc } from "@/storage"
import { PairedDeviceTable } from "./pairing.sql"

const CODE_TTL_MS = 5 * 60_000
const MAX_FAILURES = 5
const WINDOW_MS = 60_000
// Unambiguous characters: no 0/O or 1/I/L.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"

type Pending = { expires: number }
const codes = new Map<string, Pending>()
let failures: number[] = []

const hash = (token: string) => createHash("sha256").update(token).digest("hex")

export function reset() {
  codes.clear()
  failures = []
}

/** A short-lived, single-use pairing code. Show it to the user to type on the new device. */
export function createCode(now = Date.now()) {
  for (const [code, pending] of codes) if (pending.expires <= now) codes.delete(code)
  const code = Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("")
  codes.set(code, { expires: now + CODE_TTL_MS })
  return { code: `${code.slice(0, 4)}-${code.slice(4)}`, expires: now + CODE_TTL_MS }
}

export type Exchange = { ok: true; id: string; token: string } | { ok: false; reason: "invalid" | "expired" | "locked" }

/**
 * Trade a pairing code for a long-lived device token. The raw token is returned once; only its hash is stored.
 * Repeated bad codes lock the endpoint for a minute so a code cannot be guessed.
 */
export function exchange(input: { code: string; name: string; now?: number }): Exchange {
  const now = input.now ?? Date.now()
  failures = failures.filter((at) => now - at < WINDOW_MS)
  if (failures.length >= MAX_FAILURES) return { ok: false, reason: "locked" }
  const code = input.code.replace(/[^A-Za-z0-9]/g, "").toUpperCase()
  const pending = codes.get(code)
  if (!pending) {
    failures.push(now)
    return { ok: false, reason: "invalid" }
  }
  codes.delete(code)
  if (pending.expires <= now) {
    failures.push(now)
    return { ok: false, reason: "expired" }
  }
  const token = randomBytes(32).toString("hex")
  const id = `dev_${randomBytes(6).toString("hex")}`
  Database.use((db) =>
    db
      .insert(PairedDeviceTable)
      .values({ id, name: input.name.slice(0, 80) || "device", token_hash: hash(token), time_created: now, time_updated: now })
      .run(),
  )
  return { ok: true, id, token }
}

/** The device a bearer token belongs to, or undefined when unknown or revoked. */
export function verify(token: string, now = Date.now()) {
  const row = Database.use((db) =>
    db.select().from(PairedDeviceTable).where(and(eq(PairedDeviceTable.token_hash, hash(token)), eq(PairedDeviceTable.revoked, false))).get(),
  )
  if (!row) return undefined
  // Constant-time confirmation of the hash match (the lookup already used it as the key).
  if (!timingSafeEqual(Buffer.from(row.token_hash), Buffer.from(hash(token)))) return undefined
  Database.use((db) => db.update(PairedDeviceTable).set({ time_last_seen: now, time_updated: now }).where(eq(PairedDeviceTable.id, row.id)).run())
  return { id: row.id, name: row.name }
}

export function list() {
  return Database.use((db) =>
    db
      .select({ id: PairedDeviceTable.id, name: PairedDeviceTable.name, created: PairedDeviceTable.time_created, last_seen: PairedDeviceTable.time_last_seen, revoked: PairedDeviceTable.revoked })
      .from(PairedDeviceTable)
      .orderBy(desc(PairedDeviceTable.time_created))
      .all(),
  )
}

export function revoke(id: string) {
  const exists = Database.use((db) => db.select({ id: PairedDeviceTable.id }).from(PairedDeviceTable).where(eq(PairedDeviceTable.id, id)).get())
  if (!exists) return false
  Database.use((db) => db.update(PairedDeviceTable).set({ revoked: true, time_updated: Date.now() }).where(eq(PairedDeviceTable.id, id)).run())
  return true
}
