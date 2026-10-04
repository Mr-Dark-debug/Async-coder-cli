import { describe, expect, test } from "bun:test"
import { affordable, critiquePrompt, plan, risk } from "../../src/sage/pipeline"

const small = { files: ["src/util/format.ts"], lines: 12 }

describe("sage risk scoring", () => {
  test("a small, unremarkable change scores zero", () => {
    expect(risk({ change: small })).toEqual({ score: 0, reasons: [] })
  })

  test("size, breadth, sensitive paths and prior failures all raise the score", () => {
    expect(risk({ change: { files: ["a.ts"], lines: 900 } }).score).toBeGreaterThanOrEqual(0.4)
    expect(risk({ change: { files: Array.from({ length: 20 }, (_, i) => `f${i}.ts`), lines: 10 } }).reasons[0]).toContain("20 files")
    const auth = risk({ change: { files: ["src/auth/login.ts"], lines: 10 } })
    expect(auth.score).toBe(0.3)
    expect(auth.reasons[0]).toContain("authentication")
    expect(risk({ change: { files: ["db/migrations/001.sql"], lines: 5 } }).reasons[0]).toContain("schema")
    expect(risk({ change: { files: [".github/workflows/ci.yml"], lines: 5 } }).reasons[0]).toContain("CI")
    expect(risk({ change: { files: ["package.json"], lines: 2 } }).reasons[0]).toContain("dependencies")
    expect(risk({ change: small, failures: 2 }).score).toBe(0.3)
  })

  test("each sensitive class counts once and the score is capped at 1", () => {
    const heavy = risk({ change: { files: ["src/auth/a.ts", "src/auth/b.ts", "db/migrations/1.sql", ".env", ".github/workflows/x.yml", "package.json"], lines: 2000 }, failures: 5 })
    expect(heavy.score).toBe(1)
    expect(heavy.reasons.filter((r) => r.includes("authentication"))).toHaveLength(1)
  })
})

describe("sage stage planning", () => {
  const low = { score: 0.1, reasons: [] }
  const high = { score: 0.7, reasons: ["touches authentication, security or session code"] }

  test("cost-guard invariant: a green gate on a low-risk change involves no model", () => {
    expect(plan({ cfg: { enabled: true }, gate: "pass", risk: low })).toEqual({ type: "none" })
    expect(plan({ cfg: { enabled: true }, gate: "none", risk: low })).toEqual({ type: "none" })
  })

  test("disabled or unconfigured Sage never runs", () => {
    expect(plan({ cfg: undefined, gate: "fail", risk: high })).toEqual({ type: "none" })
    expect(plan({ cfg: { enabled: false }, gate: "fail", risk: high })).toEqual({ type: "none" })
    expect(plan({ cfg: { enabled: true, critique_on: "never" }, gate: "fail", risk: high })).toEqual({ type: "none" })
  })

  test("a failed gate triggers a critique", () => {
    const stage = plan({ cfg: { enabled: true }, gate: "fail", risk: low })
    expect(stage).toEqual({ type: "critique", reason: "the verification gate failed" })
  })

  test("a high-risk change triggers a critique even when the gate is green", () => {
    const stage = plan({ cfg: { enabled: true }, gate: "pass", risk: high })
    expect(stage.type).toBe("critique")
    if (stage.type === "critique") expect(stage.reason).toContain("high-risk change")
  })

  test("critique_on narrows the triggers; the threshold is configurable", () => {
    expect(plan({ cfg: { enabled: true, critique_on: "gate-fail" }, gate: "pass", risk: high }).type).toBe("none")
    expect(plan({ cfg: { enabled: true, critique_on: "high-risk" }, gate: "fail", risk: low }).type).toBe("none")
    expect(plan({ cfg: { enabled: true, risk_threshold: 0.8 }, gate: "pass", risk: high }).type).toBe("none")
    expect(plan({ cfg: { enabled: true, risk_threshold: 0.05 }, gate: "pass", risk: { score: 0.1, reasons: [] } }).type).toBe("critique")
  })
})

describe("sage budget share and prompt", () => {
  test("sage may spend at most its share of the job budget", () => {
    expect(affordable({ cfg: undefined, budget: 1, spent: 0.2 })).toBe(true)
    expect(affordable({ cfg: undefined, budget: 1, spent: 0.25 })).toBe(false)
    expect(affordable({ cfg: { budget_share: 0.5 }, budget: 1, spent: 0.25 })).toBe(true)
    expect(affordable({ cfg: undefined, budget: null, spent: 99 })).toBe(true)
  })

  test("the critique prompt carries the task, failing gate and a bounded diff, not the session", () => {
    const text = critiquePrompt({
      task: "make tests pass",
      reason: "the verification gate failed",
      gate: { command: "bun test", code: 1, output: "1 failing" },
      change: { files: ["a.ts", "b.ts"], lines: 30 },
      diff: "x".repeat(50_000),
    })
    expect(text).toContain("make tests pass")
    expect(text).toContain("$ bun test")
    expect(text).toContain("1 failing")
    expect(text).toContain('<change files="2" lines="30">')
    expect(text.length).toBeLessThan(14_000)
    expect(text).toContain("Do not rewrite the code")
  })
})
