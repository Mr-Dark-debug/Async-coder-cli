export * as Eval from "./index"

import path from "path"
import matter from "gray-matter"

export type Task = {
  name: string
  prompt: string
  verify: string[]
  budget_usd?: number
  retries: number
}

export type Result = {
  task: string
  model: string
  pass: boolean
  status: string
  cost_usd: number
  duration_ms: number
  attempts: number
  error?: string
}

export type Run = { suite: string; time: number; results: Result[] }

/** A task file is markdown: frontmatter holds the gate (`verify`) and limits, the body is the prompt. */
export function parseTask(file: string, text: string): Task {
  const parsed = matter(text)
  const data = parsed.data as Record<string, unknown>
  const prompt = parsed.content.trim()
  if (!prompt) throw new Error(`${file}: a task needs a prompt in its body`)
  const verify = data.verify
  if (!Array.isArray(verify) || verify.length === 0 || !verify.every((v) => typeof v === "string"))
    throw new Error(`${file}: a task needs a non-empty \`verify\` list; success is defined by the gate, not by the model`)
  return {
    name: typeof data.name === "string" ? data.name : path.basename(file, path.extname(file)),
    prompt,
    verify: verify as string[],
    budget_usd: typeof data.budget_usd === "number" ? data.budget_usd : undefined,
    retries: typeof data.retries === "number" ? data.retries : 0,
  }
}

export async function loadSuite(dir: string) {
  const files = (await Array.fromAsync(new Bun.Glob("*.md").scan({ cwd: dir }))).sort()
  if (files.length === 0) throw new Error(`No task files (*.md) found in ${dir}`)
  return Promise.all(files.map(async (file) => parseTask(file, await Bun.file(path.join(dir, file)).text())))
}

const percentile = (values: number[], p: number) => {
  if (values.length === 0) return 0
  const sorted = values.toSorted((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)]
}

export type Row = { model: string; runs: number; passed: number; rate: number; cost_p50: number; cost_p95: number; duration_p50: number; cost_total: number }

/** One row per model: pass rate, p50/p95 cost, p50 duration. */
export function summarize(results: Result[]): Row[] {
  const models = [...new Set(results.map((result) => result.model))]
  return models.map((model) => {
    const own = results.filter((result) => result.model === model)
    const passed = own.filter((result) => result.pass).length
    return {
      model,
      runs: own.length,
      passed,
      rate: own.length ? passed / own.length : 0,
      cost_p50: percentile(own.map((r) => r.cost_usd), 50),
      cost_p95: percentile(own.map((r) => r.cost_usd), 95),
      duration_p50: percentile(own.map((r) => r.duration_ms), 50),
      cost_total: own.reduce((sum, r) => sum + r.cost_usd, 0),
    }
  })
}

const money = (value: number) => `$${value.toFixed(value < 1 ? 4 : 2)}`

export function table(rows: Row[]) {
  return [
    "| Model | Pass | Rate | Cost p50 | Cost p95 | Duration p50 | Total cost |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map(
      (row) =>
        `| ${row.model} | ${row.passed}/${row.runs} | ${Math.round(row.rate * 100)}% | ${money(row.cost_p50)} | ${money(row.cost_p95)} | ${Math.round(row.duration_p50 / 1000)}s | ${money(row.cost_total)} |`,
    ),
  ].join("\n")
}

export type Regression = { task: string; model: string; was: "pass"; now: string }

/** Tasks that passed in the baseline run and no longer do. Used to gate a release. */
export function regressions(baseline: Run, current: Run): Regression[] {
  return baseline.results
    .filter((before) => before.pass)
    .flatMap((before) => {
      const after = current.results.find((r) => r.task === before.task && r.model === before.model)
      if (after?.pass) return []
      return [{ task: before.task, model: before.model, was: "pass" as const, now: after ? after.status : "missing" }]
    })
}

/** Reduce a finished job to an eval result. A task passes only when the job is done and its gate passed. */
export function score(input: {
  task: string
  model: string
  job: { status: string; cost_usd: number; time_started: number | null; time_finished: number | null; error: string | null; verify_result: { pass: boolean; attempts: number } | null }
}): Result {
  const { job } = input
  return {
    task: input.task,
    model: input.model,
    pass: job.status === "done" && job.verify_result?.pass === true,
    status: job.status,
    cost_usd: job.cost_usd,
    duration_ms: job.time_started && job.time_finished ? job.time_finished - job.time_started : 0,
    attempts: job.verify_result?.attempts ?? 1,
    error: job.error ?? undefined,
  }
}
