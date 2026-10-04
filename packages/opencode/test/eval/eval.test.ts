import { describe, expect, test } from "bun:test"
import { mkdtempSync } from "fs"
import { tmpdir } from "os"
import path from "path"
import { Eval } from "../../src/eval"

const task = "---\nverify:\n  - bun test\nbudget_usd: 0.5\nretries: 1\n---\nFix the failing test.\n"

describe("eval tasks", () => {
  test("parseTask reads the gate, limits and prompt", () => {
    const parsed = Eval.parseTask("fix-test.md", task)
    expect(parsed).toEqual({ name: "fix-test", prompt: "Fix the failing test.", verify: ["bun test"], budget_usd: 0.5, retries: 1 })
  })

  test("a task without a gate is rejected: success must be deterministic", () => {
    expect(() => Eval.parseTask("t.md", "---\nname: x\n---\nDo it")).toThrow("verify")
    expect(() => Eval.parseTask("t.md", "---\nverify: []\n---\nDo it")).toThrow("verify")
    expect(() => Eval.parseTask("t.md", "---\nverify: [a]\n---\n")).toThrow("prompt")
  })

  test("loadSuite loads every markdown task in order", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "suite-"))
    await Bun.write(path.join(dir, "b.md"), task)
    await Bun.write(path.join(dir, "a.md"), task.replace("Fix the failing test.", "Other"))
    expect((await Eval.loadSuite(dir)).map((t) => t.name)).toEqual(["a", "b"])
    await expect(Eval.loadSuite(mkdtempSync(path.join(tmpdir(), "empty-")))).rejects.toThrow("No task files")
  })
})

const result = (task: string, model: string, pass: boolean, cost = 0.1, ms = 1000): Eval.Result => ({
  task, model, pass, status: pass ? "done" : "failed", cost_usd: cost, duration_ms: ms, attempts: 1,
})

describe("eval scoring and comparison", () => {
  test("score passes only when the job is done and its gate passed", () => {
    const job = { status: "done", cost_usd: 0.2, time_started: 1000, time_finished: 5000, error: null, verify_result: { pass: true, attempts: 2 } }
    expect(Eval.score({ task: "t", model: "m", job })).toMatchObject({ pass: true, duration_ms: 4000, attempts: 2 })
    expect(Eval.score({ task: "t", model: "m", job: { ...job, verify_result: { pass: false, attempts: 1 } } }).pass).toBe(false)
    expect(Eval.score({ task: "t", model: "m", job: { ...job, status: "failed", error: "boom" } })).toMatchObject({ pass: false, error: "boom" })
    expect(Eval.score({ task: "t", model: "m", job: { ...job, verify_result: null } }).pass).toBe(false)
  })

  test("summarize computes pass rate and percentiles per model", () => {
    const rows = Eval.summarize([
      result("a", "cheap", true, 0.01),
      result("b", "cheap", false, 0.03),
      result("c", "cheap", true, 0.02),
      result("a", "deep", true, 1),
      result("b", "deep", true, 2),
    ])
    const cheap = rows.find((r) => r.model === "cheap")!
    expect(cheap).toMatchObject({ runs: 3, passed: 2 })
    expect(cheap.rate).toBeCloseTo(2 / 3)
    expect(cheap.cost_p50).toBeCloseTo(0.02)
    expect(cheap.cost_p95).toBeCloseTo(0.03)
    expect(cheap.cost_total).toBeCloseTo(0.06)
    expect(rows.find((r) => r.model === "deep")!.rate).toBe(1)
  })

  test("table renders a markdown comparison", () => {
    const text = Eval.table(Eval.summarize([result("a", "m", true, 0.5, 2000)]))
    expect(text).toContain("| Model | Pass | Rate |")
    expect(text).toContain("| m | 1/1 | 100% | $0.5000 | $0.5000 | 2s | $0.5000 |")
  })

  test("regressions are tasks that passed before and do not now", () => {
    const base: Eval.Run = { suite: "s", time: 0, results: [result("a", "m", true), result("b", "m", true), result("c", "m", false)] }
    const now: Eval.Run = { suite: "s", time: 1, results: [result("a", "m", true), result("b", "m", false), result("c", "m", true)] }
    expect(Eval.regressions(base, now)).toEqual([{ task: "b", model: "m", was: "pass", now: "failed" }])
    expect(Eval.regressions(base, { ...now, results: [result("a", "m", true)] }).map((r) => r.task)).toEqual(["b"])
    expect(Eval.regressions(base, base)).toEqual([])
  })
})
