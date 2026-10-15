import { describe, expect, test } from "bun:test"
import { BestOf } from "../../src/best-of"
import { pick, run, type Deps, type JobLike } from "../../src/best-of/runner"

const candidate = (over: Partial<BestOf.Candidate>): BestOf.Candidate => ({
  model: "a/one",
  job_id: "job-1",
  branch: "branch-1",
  status: "done",
  passed: true,
  cost_usd: 0.5,
  duration_ms: 60_000,
  files: 2,
  insertions: 10,
  deletions: 1,
  error: null,
  ...over,
})

describe("BestOf.check", () => {
  test("needs two distinct models and dedupes", () => {
    expect(BestOf.check(["a/one"]).ok).toBe(false)
    expect(BestOf.check(["a/one", " a/one "]).ok).toBe(false)
    const ok = BestOf.check(["a/one", "b/two", "a/one"])
    expect(ok).toEqual({ ok: true, models: ["a/one", "b/two"] })
  })

  test("bounds the candidate count unless raised", () => {
    const five = ["a", "b", "c", "d", "e"]
    const refused = BestOf.check(five)
    expect(refused.ok).toBe(false)
    expect(refused.ok === false && refused.reason).toContain("--max-candidates")
    expect(BestOf.check(five, 5).ok).toBe(true)
  })
})

describe("BestOf.rank / recommend", () => {
  test("a passing gate beats a cheaper unverified result", () => {
    const list = [
      candidate({ model: "cheap", passed: null, cost_usd: 0.1 }),
      candidate({ model: "verified", passed: true, cost_usd: 0.9 }),
    ]
    expect(BestOf.recommend(list)).toBe("verified")
  })

  test("ties on the gate break by cost, then time", () => {
    const list = [
      candidate({ model: "slow", cost_usd: 0.4, duration_ms: 90_000 }),
      candidate({ model: "fast", cost_usd: 0.4, duration_ms: 30_000 }),
      candidate({ model: "dear", cost_usd: 0.8, duration_ms: 10_000 }),
    ]
    expect(BestOf.rank(list).map((c) => c.model)).toEqual(["fast", "slow", "dear"])
  })

  test("never recommends a failed gate or an unfinished job", () => {
    const list = [
      candidate({ model: "red", passed: false }),
      candidate({ model: "dead", status: "failed", passed: null, branch: null }),
    ]
    expect(BestOf.recommend(list)).toBeNull()
    expect(BestOf.recommend([])).toBeNull()
  })

  test("table marks the recommendation and shows the result", () => {
    const list = [candidate({ model: "red", passed: false, cost_usd: 0.2 }), candidate({ model: "green" })]
    const receipt: BestOf.Receipt = {
      id: "bon-test",
      created_at: 0,
      prompt: "x",
      verify: [],
      budget_usd: 1,
      candidates: list,
      recommended: BestOf.recommend(list),
      promoted: null,
    }
    const lines = BestOf.table(receipt).split("\n")
    expect(lines[1]).toMatch(/^\*\s+green/)
    expect(lines[1]).toContain("passed")
    expect(lines[2]).toContain("gate failed")
  })
})

function harness(behave: (model: string) => Partial<JobLike>) {
  const jobs = new Map<string, { model: string; job: JobLike; polls: number }>()
  const cancelled: string[] = []
  let clock = 0
  const deps: Deps = {
    start: async (input) => {
      const id = `job-${jobs.size + 1}`
      const job: JobLike = {
        id,
        status: "done",
        branch: `branch-${id}`,
        error: null,
        cost_usd: 0.25,
        time_started: 1_000,
        time_finished: 31_000,
        verify_result: { pass: true },
        ...behave(input.model),
      }
      jobs.set(id, { model: input.model, job, polls: 0 })
      return { ...job, status: "queued" }
    },
    get: async (id) => {
      const entry = jobs.get(id)!
      entry.polls++
      // Everything is still running on the first poll.
      return entry.polls === 1 && entry.job.status === "done" ? { ...entry.job, status: "running" } : entry.job
    },
    cancel: async (id) => {
      cancelled.push(id)
      jobs.get(id)!.job.status = "cancelled"
    },
    stat: async () => ({ files: 3, insertions: 20, deletions: 4 }),
    sleep: async (ms) => {
      clock += ms
    },
    now: () => clock,
    log: () => {},
  }
  return { deps, cancelled, jobs }
}

describe("best-of runner", () => {
  test("runs every model, waits for all, and ranks the receipt", async () => {
    const { deps } = harness((model) => (model === "b/red" ? { verify_result: { pass: false } } : model === "c/dear" ? { cost_usd: 2 } : {}))
    const receipt = await run({ prompt: "fix it", models: ["a/green", "b/red", "c/dear"], budget_usd: 3, verify: ["bun test"], poll_ms: 10 }, deps)
    expect(receipt.candidates.map((c) => c.model)).toEqual(["a/green", "b/red", "c/dear"])
    expect(receipt.recommended).toBe("a/green")
    expect(receipt.candidates.find((c) => c.model === "b/red")?.passed).toBe(false)
    expect(receipt.candidates[0]).toMatchObject({ files: 3, insertions: 20, deletions: 4, duration_ms: 30_000 })
  })

  test("a gate that was requested but never reported counts as failed", async () => {
    const { deps } = harness(() => ({ verify_result: null }))
    const receipt = await run({ prompt: "x", models: ["a/one", "b/two"], budget_usd: 1, verify: ["bun test"], poll_ms: 1 }, deps)
    expect(receipt.candidates.every((c) => c.passed === false)).toBe(true)
    expect(receipt.recommended).toBeNull()
  })

  test("without a gate, finished candidates are unverified but still recommendable", async () => {
    const { deps } = harness(() => ({ verify_result: null }))
    const receipt = await run({ prompt: "x", models: ["a/one", "b/two"], budget_usd: 1, poll_ms: 1 }, deps)
    expect(receipt.candidates.every((c) => c.passed === null)).toBe(true)
    expect(receipt.recommended).not.toBeNull()
  })

  test("cancels unfinished candidates at the timeout", async () => {
    const { deps, cancelled } = harness((model) => (model === "b/stuck" ? { status: "running", branch: null } : {}))
    const receipt = await run({ prompt: "x", models: ["a/ok", "b/stuck"], budget_usd: 1, poll_ms: 100, timeout_ms: 250 }, deps)
    expect(cancelled).toHaveLength(1)
    expect(receipt.candidates.find((c) => c.model === "b/stuck")?.status).toBe("cancelled")
    expect(receipt.recommended).toBe("a/ok")
  })
})

describe("best-of pick", () => {
  const receipt = (candidates: BestOf.Candidate[]): BestOf.Receipt => ({
    id: "bon-1",
    created_at: 0,
    prompt: "x",
    verify: [],
    budget_usd: 1,
    candidates,
    recommended: BestOf.recommend(candidates),
    promoted: null,
  })

  test("defaults to the recommendation and accepts model or job id", () => {
    const r = receipt([candidate({ model: "a/one", job_id: "j1" }), candidate({ model: "b/two", job_id: "j2", cost_usd: 2 })])
    expect(pick(r)).toMatchObject({ ok: true, candidate: { model: "a/one" } })
    expect(pick(r, "b/two")).toMatchObject({ ok: true, candidate: { model: "b/two" } })
    expect(pick(r, "j2")).toMatchObject({ ok: true, candidate: { job_id: "j2" } })
  })

  test("refuses unknown, unfinished and gate-failed choices with a reason", () => {
    const r = receipt([
      candidate({ model: "a/ok" }),
      candidate({ model: "b/red", passed: false }),
      candidate({ model: "c/dead", status: "failed", branch: null, passed: null }),
    ])
    expect(pick(r, "nope")).toMatchObject({ ok: false })
    expect(pick(r, "b/red")).toMatchObject({ ok: false, reason: expect.stringContaining("--force") })
    expect(pick(r, "c/dead")).toMatchObject({ ok: false, reason: expect.stringContaining("did not finish") })
    expect(pick(receipt([candidate({ passed: false })]))).toMatchObject({ ok: false })
  })
})
