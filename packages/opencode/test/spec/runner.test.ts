import { describe, expect, test } from "bun:test"
import { Spec } from "../../src/spec"
import { run, taskPrompt, type Deps, type JobLike } from "../../src/spec/runner"

const TASKS = [
  "- [ ] 1 Build",
  "  - [ ] 1.1 Model",
  "    - _Requirements: 1.1_",
  "  - [ ] 1.2 API",
  "    - _Depends: 1.1_",
  "  - [ ] 1.3 Docs",
  "  - [ ]* 1.4 Property tests",
].join("\n")

type Behaviour = (prompt: string) => Partial<JobLike>

function harness(initial = TASKS, behave: Behaviour = () => ({}), merge: Deps["merge"] = async () => ({ ok: true })) {
  let markdown = initial
  const started: string[] = []
  const merged: string[] = []
  const jobs = new Map<string, JobLike>()
  const deps: Deps = {
    start: async (input) => {
      started.push(input.prompt)
      const id = `job-${jobs.size + 1}`
      const job: JobLike = { id, status: "done", branch: `branch-${id}`, error: null, verify_result: { pass: true }, ...behave(input.prompt) }
      jobs.set(id, job)
      return { ...job, status: "queued" }
    },
    get: async (id) => jobs.get(id)!,
    merge: async (branch) => {
      merged.push(branch)
      return merge(branch)
    },
    read: async () => markdown,
    write: async (next) => {
      markdown = next
    },
    sleep: async () => {},
    log: () => {},
  }
  return { deps, started, merged, markdown: () => markdown }
}

const options = { name: "auth", requirements: "### Requirement 1\n1.1 WHEN a THEN the system SHALL b", design: "# Design" }
const titleOf = (prompt: string) => /task ([\d.]+) of/.exec(prompt)?.[1]

describe("spec runner", () => {
  test("runs one task at a time in dependency order, merging and marking each", async () => {
    const h = harness()
    const result = await run(options, h.deps)
    expect(h.started.map(titleOf)).toEqual(["1.1", "1.2", "1.3"])
    expect(result.stopped).toBeUndefined()
    expect(result.outcomes.map((o) => `${o.id}:${o.status}`)).toEqual(["1.1:completed", "1.2:completed", "1.3:completed"])
    expect(h.merged).toEqual(["branch-job-1", "branch-job-2", "branch-job-3"])
    const tasks = Spec.parseTasks(h.markdown())
    expect(tasks.filter((t) => t.done).map((t) => t.id)).toEqual(["1.1", "1.2", "1.3"])
    // the optional property-test task is never run
    expect(tasks.find((t) => t.id === "1.4")?.done).toBe(false)
  })

  test("wave mode starts independent tasks together, then the dependent one", async () => {
    const h = harness()
    const result = await run({ ...options, wave: true }, h.deps)
    expect(h.started.slice(0, 2).map(titleOf).sort()).toEqual(["1.1", "1.3"])
    expect(h.started.map(titleOf)).toContain("1.2")
    expect(result.outcomes.filter((o) => o.status === "completed")).toHaveLength(3)
  })

  test("a failed job stops the run and leaves the task open", async () => {
    const h = harness(TASKS, (prompt) => (titleOf(prompt) === "1.1" ? { status: "failed", error: "tests failed" } : {}))
    const result = await run(options, h.deps)
    expect(result.stopped).toContain("Task 1.1 failed: tests failed")
    expect(h.started).toHaveLength(1)
    expect(Spec.parseTasks(h.markdown()).find((t) => t.id === "1.1")?.done).toBe(false)
  })

  test("a finished job whose gate failed is not marked done or merged", async () => {
    const h = harness(TASKS, () => ({ verify_result: { pass: false } }))
    const result = await run(options, h.deps)
    expect(result.stopped).toContain("verification gate did not pass")
    expect(h.merged).toEqual([])
    expect(Spec.parseTasks(h.markdown()).some((t) => t.done)).toBe(false)
  })

  test("a merge conflict stops the run with the reason", async () => {
    const h = harness(TASKS, () => ({}), async () => ({ ok: false, reason: "CONFLICT in src/a.ts" }))
    const result = await run(options, h.deps)
    expect(result.outcomes[0]).toMatchObject({ id: "1.1", status: "conflict", detail: "CONFLICT in src/a.ts" })
    expect(result.stopped).toContain("could not be merged")
    expect(Spec.parseTasks(h.markdown()).some((t) => t.done)).toBe(false)
  })

  test("only restricts the run to one ready task", async () => {
    const h = harness()
    const result = await run({ ...options, only: "1.3" }, h.deps)
    expect(h.started.map(titleOf)).toEqual(["1.3"])
    expect(result.outcomes).toHaveLength(1)
  })

  test("only a task that is not ready runs nothing", async () => {
    const h = harness()
    const result = await run({ ...options, only: "1.2" }, h.deps)
    expect(result.outcomes).toEqual([])
    expect(h.started).toEqual([])
  })

  test("nothing ready returns immediately", async () => {
    const h = harness("- [x] 1 Done\n")
    expect((await run(options, h.deps)).outcomes).toEqual([])
  })
})

describe("task prompt", () => {
  test("embeds the documents, the task and the guardrails", () => {
    const task = Spec.parseTasks("- [ ] 2.1 Wire login\n    - _Requirements: 1.1, 1.2_")[0]
    const prompt = taskPrompt({ name: "auth", task, requirements: "REQ TEXT", design: "DESIGN TEXT" })
    expect(prompt).toContain('task 2.1 of the spec "auth": Wire login')
    expect(prompt).toContain("Requirements covered: 1.1, 1.2.")
    expect(prompt).toContain("REQ TEXT")
    expect(prompt).toContain("DESIGN TEXT")
    expect(prompt).toContain("do not edit tasks.md")
  })

  test("long documents are truncated", () => {
    const task = Spec.parseTasks("- [ ] 1 A")[0]
    const prompt = taskPrompt({ name: "x", task, requirements: "r".repeat(40_000), design: "" })
    expect(prompt).toContain("[truncated]")
    expect(prompt.length).toBeLessThan(26_000)
  })
})
