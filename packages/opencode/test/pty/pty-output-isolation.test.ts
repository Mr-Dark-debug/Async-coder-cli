import { describe, expect, test } from "bun:test"
import { AppRuntime } from "../../src/effect/app-runtime"
import { Effect } from "effect"
import { Instance } from "../../src/project/instance"
import { Pty } from "../../src/pty"
import { tmpdir } from "../fixture/fixture"
import { setTimeout as sleep } from "node:timers/promises"

const echo = {
  command: process.execPath,
  args: ["-e", 'process.stdout.write("PTY_READY\\n"); process.stdin.on("data", data => process.stdout.write(data))'],
}
const newline = process.platform === "win32" ? "\r" : "\n"
async function waitFor(fn: () => boolean) {
  const deadline = Date.now() + 5000
  while (!fn()) {
    if (Date.now() >= deadline) throw new Error("Timed out waiting for real PTY output")
    await sleep(25)
  }
}

describe("pty", () => {
  test("does not leak output when websocket objects are reused", async () => {
    await using dir = await tmpdir({ git: true })

    await Instance.provide({
      directory: dir.path,
      fn: () =>
        AppRuntime.runPromise(
          Effect.gen(function* () {
            const pty = yield* Pty.Service
            const a = yield* pty.create({ ...echo, title: "a" })
            const b = yield* pty.create({ ...echo, title: "b" })
            try {
              const outA: string[] = []
              const outB: string[] = []

              const ws = {
                readyState: 1,
                data: { events: { connection: "a" } },
                send: (data: unknown) => {
                  outA.push(typeof data === "string" ? data : Buffer.from(data as Uint8Array).toString("utf8"))
                },
                close: () => {
                  // no-op (simulate abrupt drop)
                },
              }

              yield* pty.connect(a.id, ws as any)
              yield* Effect.promise(() => waitFor(() => outA.join("").includes("PTY_READY")))

              ws.data = { events: { connection: "b" } }
              ws.send = (data: unknown) => {
                outB.push(typeof data === "string" ? data : Buffer.from(data as Uint8Array).toString("utf8"))
              }
              yield* pty.connect(b.id, ws as any)

              outA.length = 0
              outB.length = 0

              yield* pty.write(a.id, `AAA${newline}`)
              yield* Effect.promise(() => sleep(100))

              expect(outB.join("")).not.toContain("AAA")
            } finally {
              yield* pty.remove(a.id)
              yield* pty.remove(b.id)
            }
          }),
        ),
    })
  })

  test("does not leak output when Bun recycles websocket objects before re-connect", async () => {
    await using dir = await tmpdir({ git: true })

    await Instance.provide({
      directory: dir.path,
      fn: () =>
        AppRuntime.runPromise(
          Effect.gen(function* () {
            const pty = yield* Pty.Service
            const a = yield* pty.create({ ...echo, title: "a" })
            try {
              const outA: string[] = []
              const outB: string[] = []

              const ws = {
                readyState: 1,
                data: { events: { connection: "a" } },
                send: (data: unknown) => {
                  outA.push(typeof data === "string" ? data : Buffer.from(data as Uint8Array).toString("utf8"))
                },
                close: () => {
                  // no-op (simulate abrupt drop)
                },
              }

              yield* pty.connect(a.id, ws as any)
              yield* Effect.promise(() => waitFor(() => outA.join("").includes("PTY_READY")))
              outA.length = 0

              ws.data = { events: { connection: "b" } }
              ws.send = (data: unknown) => {
                outB.push(typeof data === "string" ? data : Buffer.from(data as Uint8Array).toString("utf8"))
              }

              yield* pty.write(a.id, `AAA${newline}`)
              yield* Effect.promise(() => sleep(100))

              expect(outB.join("")).not.toContain("AAA")
            } finally {
              yield* pty.remove(a.id)
            }
          }),
        ),
    })
  })

  test("treats in-place socket data mutation as the same connection", async () => {
    await using dir = await tmpdir({ git: true })

    await Instance.provide({
      directory: dir.path,
      fn: () =>
        AppRuntime.runPromise(
          Effect.gen(function* () {
            const pty = yield* Pty.Service
            const a = yield* pty.create({ ...echo, title: "a" })
            try {
              const out: string[] = []

              const ctx = { connId: 1 }
              const ws = {
                readyState: 1,
                data: ctx,
                send: (data: unknown) => {
                  out.push(typeof data === "string" ? data : Buffer.from(data as Uint8Array).toString("utf8"))
                },
                close: () => {
                  // no-op
                },
              }

              yield* pty.connect(a.id, ws as any)
              yield* Effect.promise(() => waitFor(() => out.join("").includes("PTY_READY")))
              out.length = 0

              ctx.connId = 2

              yield* pty.write(a.id, `AAA${newline}`)
              yield* Effect.promise(() => waitFor(() => out.join("").includes("AAA")))

              expect(out.join("")).toContain("AAA")
            } finally {
              yield* pty.remove(a.id)
            }
          }),
        ),
    })
  })
})
