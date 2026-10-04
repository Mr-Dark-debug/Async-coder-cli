import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { Database } from "../../src/storage"
import { PairedDeviceTable } from "../../src/server/pairing.sql"
import * as Pairing from "../../src/server/pairing"

beforeEach(() => Pairing.reset())
afterEach(() => Database.use((db) => db.delete(PairedDeviceTable).run()))

describe("device pairing", () => {
  test("a code is exchanged once for a token that then verifies", () => {
    const { code } = Pairing.createCode()
    expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/)
    const first = Pairing.exchange({ code, name: "phone" })
    if (!first.ok) throw new Error("expected ok")
    expect(first.token).toHaveLength(64)
    expect(Pairing.verify(first.token)).toEqual({ id: first.id, name: "phone" })
    // single use
    expect(Pairing.exchange({ code, name: "again" })).toEqual({ ok: false, reason: "invalid" })
  })

  test("codes are accepted regardless of case and separators", () => {
    const { code } = Pairing.createCode()
    expect(Pairing.exchange({ code: code.toLowerCase().replace("-", " "), name: "x" }).ok).toBe(true)
  })

  test("expired codes are rejected", () => {
    const now = 1_000_000
    const { code } = Pairing.createCode(now)
    expect(Pairing.exchange({ code, name: "x", now: now + 5 * 60_000 + 1 })).toEqual({ ok: false, reason: "expired" })
  })

  test("repeated wrong codes lock the endpoint, even for a valid code", () => {
    const now = 5_000_000
    const { code } = Pairing.createCode(now)
    for (let i = 0; i < 5; i++) expect(Pairing.exchange({ code: "ZZZZ-ZZZZ", name: "x", now })).toEqual({ ok: false, reason: "invalid" })
    expect(Pairing.exchange({ code, name: "x", now })).toEqual({ ok: false, reason: "locked" })
    // the lock clears after the window
    expect(Pairing.exchange({ code, name: "x", now: now + 61_000 }).ok).toBe(true)
  })

  test("only the hash is stored and a revoked device is rejected", () => {
    const result = Pairing.exchange({ code: Pairing.createCode().code, name: "tablet" })
    if (!result.ok) throw new Error("expected ok")
    const stored = Database.use((db) => db.select().from(PairedDeviceTable).all())
    expect(stored).toHaveLength(1)
    expect(stored[0].token_hash).not.toBe(result.token)
    expect(JSON.stringify(stored)).not.toContain(result.token)
    expect(Pairing.list()[0].name).toBe("tablet")
    expect(Pairing.revoke(result.id)).toBe(true)
    expect(Pairing.verify(result.token)).toBeUndefined()
    expect(Pairing.revoke("dev_missing")).toBe(false)
  })

  test("unknown tokens do not verify", () => {
    expect(Pairing.verify("nope")).toBeUndefined()
  })
})
