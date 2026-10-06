import { afterEach, describe, expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import path from "path"
import os from "os"
import { mkdtempSync } from "fs"
import { Database } from "../../src/storage"
import { JobTable } from "../../src/jobs/job.sql"
import * as Store from "../../src/jobs/store"
import * as Verify from "../../src/jobs/verify"
import * as Pr from "../../src/jobs/pr"
import { commitAll, git } from "../../src/jobs/git"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { provideTmpdirInstance, tmpdir } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import { Instance } from "../../src/project/instance"

afterEach(async () => {
  Database.use((db) => db.delete(JobTable).run())
  await Instance.disposeAll()
})

const cwd = os.tmpdir()
const ok = process.platform === "win32" ? "exit 0" : "true"
const bad = process.platform === "win32" ? "exit 3" : "exit 3"

describe("verify gates", () => {
  test("all gates passing yields pass", async () => {
    const result = await Verify.run([ok, "echo hello"], cwd)
    expect(result.pass).toBe(true)
    expect(result.gates).toHaveLength(2)
    expect(result.gates[1].output).toContain("hello")
  })

  test("stops at the first failing gate and reports its exit code", async () => {
    const result = await Verify.run([ok, bad, "echo never"], cwd, 2)
    expect(result.pass).toBe(false)
    expect(result.attempts).toBe(2)
    expect(result.gates.map((g) => g.code)).toEqual([0, 3])
  })

  test("a command that cannot start is a failed gate, not a crash", async () => {
    const result = await Verify.gate("definitely-not-a-real-binary-xyz", cwd)
    expect(result.code).not.toBe(0)
  })

  test("large output streams retain only the bounded UTF-8 tail", async () => {
    await using dir = await tmpdir()
    await Bun.write(
      path.join(dir.path, "loud.ts"),
      [
        'process.stdout.write("x".repeat(2 * 1024 * 1024) + "stdout-tail")',
        'process.stderr.write("y".repeat(2 * 1024 * 1024) + "stderr-tail ✓")',
      ].join("\n"),
    )
    const command =
      process.platform === "win32"
        ? `& '${process.execPath.replaceAll("'", "''")}' loud.ts`
        : `'${process.execPath.replaceAll("'", "'\\''")}' loud.ts`
    const result = await Verify.gate(command, dir.path)
    expect(result.code).toBe(0)
    expect(result.output.length).toBeLessThanOrEqual(4001)
    expect(result.output.startsWith("…")).toBe(true)
    expect(result.output.endsWith("stderr-tail ✓")).toBe(true)
  })

  test("retry prompt names the failing command and its output", () => {
    const text = Verify.retryPrompt({
      pass: false,
      attempts: 1,
      gates: [{ command: "bun test", code: 1, ms: 5, output: "1 failing" }],
    })
    expect(text).toContain("Command: bun test")
    expect(text).toContain("1 failing")
    expect(Verify.retryPrompt({ pass: true, attempts: 1, gates: [] })).toBe("")
  })

  for (const mode of ["cancel", "timeout"] as const) {
    test(`${mode} stops gate descendants before their delayed writes`, async () => {
      await using dir = await tmpdir()
      await Bun.write(
        path.join(dir.path, "worker.ts"),
        [
          'await Bun.write("started.txt", "started")',
          "await Bun.sleep(4000)",
          'await Bun.write("late.txt", "should not happen")',
          "setInterval(() => {}, 1000)",
        ].join("\n"),
      )
      const executable =
        process.platform === "win32"
          ? `& '${process.execPath.replaceAll("'", "''")}' worker.ts`
          : `'${process.execPath.replaceAll("'", "'\\''")}' worker.ts`
      const controller = new AbortController()
      const gate = Verify.gate(executable, dir.path, mode === "timeout" ? 2500 : 10000, controller.signal)
      const deadline = Date.now() + 8000
      while (!(await Bun.file(path.join(dir.path, "started.txt")).exists()) && Date.now() < deadline)
        await Bun.sleep(10)
      expect(await Bun.file(path.join(dir.path, "started.txt")).exists()).toBe(true)
      if (mode === "cancel") controller.abort()
      const result = await gate
      expect(result.code).toBe(mode === "cancel" ? 130 : 124)
      await Bun.sleep(4200)
      expect(await Bun.file(path.join(dir.path, "late.txt")).exists()).toBe(false)
    }, 15000)
  }
})

const it = testEffect(Layer.mergeAll(CrossSpawnSpawner.defaultLayer))

describe("receipt", () => {
  it.live("is deterministic and lists gate results", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const job = Store.create({
          name: "fix auth",
          prompt: "p",
          branch: "jobs/fix-auth",
          budget_usd: 0.5,
          verify: ["bun test"],
        })
        Store.move(job.id, "running")
        const done = Store.move(job.id, "done", {
          cost_usd: 0.0612,
          tokens_in: 18400,
          tokens_out: 9100,
          verify_result: { pass: true, attempts: 2, gates: [{ command: "bun test", code: 0, ms: 4000, output: "" }] },
        })
        const text = Verify.receipt(Store.patch(done.id, { time_started: 1_000, time_finished: 73_000 })!)
        expect(text).toBe(Verify.receipt(Store.get(done.id)!))
        expect(text).toContain("- Cost: $0.0612 of $0.5000 budget")
        expect(text).toContain("- Tokens: 18,400 in / 9,100 out")
        expect(text).toContain("- Duration: 1m12s")
        expect(text).toContain("### Verification: passed (attempt 2)")
        expect(text).toContain("- PASS `bun test` (4s)")
      }),
    ),
  )
})

describe("job -> gate -> PR (fixture repo with a local origin)", () => {
  it.live("opens a PR only after the gate passes; refuses when it failed", () =>
    provideTmpdirInstance(
      (dir) =>
        Effect.gen(function* () {
          const origin = mkdtempSync(path.join(os.tmpdir(), "origin-"))
          yield* Effect.promise(async () => {
            await git(origin, ["init", "-q", "--bare"])
            await Bun.write(path.join(dir, "a.txt"), "a")
            await git(dir, ["add", "-A"])
            await git(dir, ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", "base"])
            await git(dir, ["remote", "add", "origin", origin])
            await git(dir, ["checkout", "-q", "-b", "jobs/x"])
            await Bun.write(path.join(dir, "fix.txt"), "fix")
            expect(await commitAll(dir, "job: x")).toBeString()
            expect(await commitAll(dir, "job: nothing")).toBeUndefined()
          })
          const job = Store.create({ name: "x", prompt: "p", branch: "jobs/x", directory: dir, verify: ["echo ok"] })
          Store.move(job.id, "running")

          const failed = Store.move(job.id, "failed", { verify_result: { pass: false, attempts: 1, gates: [] } })
          expect(yield* Effect.exit(Effect.promise(() => Pr.open(failed)))).toMatchObject({ _tag: "Failure" })

          const passed = Store.patch(job.id, { status: "done", verify_result: { pass: true, attempts: 1, gates: [] } })!
          const calls: string[][] = []
          const result = yield* Effect.promise(() =>
            Pr.open(passed, async (argv) => {
              calls.push(argv)
              if (argv[0] === "git") return Pr.exec(argv, dir)
              return { code: 0, out: "https://example.test/pr/7", err: "" }
            }),
          )
          expect(result).toEqual({ url: "https://example.test/pr/7", branch: "jobs/x" })
          expect(calls[1].slice(0, 3)).toEqual(["gh", "pr", "create"])
          expect(calls[1]).toContain("--draft")
          expect(calls[1].join(" ")).toContain("Job receipt")
          expect(yield* Effect.promise(() => git(origin, ["branch", "--list", "jobs/x"]))).toContain("jobs/x")
        }),
      { git: true },
    ),
  )

  it.live("refuses a job that never had a branch", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const job = Store.create({ name: "n", prompt: "p" })
        Store.move(job.id, "running")
        const done = Store.move(job.id, "done")
        const exit = yield* Effect.exit(Effect.promise(() => Pr.open(done)))
        expect(String(exit)).toContain("own branch")
      }),
    ),
  )
})
