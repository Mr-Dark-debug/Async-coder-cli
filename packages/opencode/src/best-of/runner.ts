import { BestOf } from "."

export type JobLike = {
  id: string
  status: BestOf.Candidate["status"]
  branch: string | null
  error: string | null
  cost_usd: number
  time_started: number | null
  time_finished: number | null
  verify_result?: { pass: boolean } | null
}

export type Stat = { files: number; insertions: number; deletions: number }

export type Deps = {
  start(input: { prompt: string; model: string; budget_usd: number; verify?: string[]; verify_retries?: number; agent?: string }): Promise<JobLike>
  get(id: string): Promise<JobLike>
  cancel(id: string): Promise<void>
  /** Size of a candidate's change relative to the project. null when it cannot be measured. */
  stat(branch: string): Promise<Stat | null>
  sleep(ms: number): Promise<void>
  now(): number
  log(message: string): void
}

export type Options = {
  prompt: string
  models: string[]
  budget_usd: number
  verify?: string[]
  verify_retries?: number
  agent?: string
  poll_ms?: number
  /** Give up waiting and cancel unfinished candidates after this long. */
  timeout_ms?: number
}

const terminal = (job: JobLike) => job.status === "done" || job.status === "failed" || job.status === "cancelled"

/** Start every candidate, wait for all of them, and produce the ranked receipt. */
export async function run(options: Options, deps: Deps): Promise<BestOf.Receipt> {
  const poll = options.poll_ms ?? 2000
  const started = deps.now()
  const jobs = new Map<string, { model: string; job: JobLike }>()

  for (const model of options.models) {
    const job = await deps.start({
      prompt: options.prompt,
      model,
      budget_usd: options.budget_usd,
      verify: options.verify,
      verify_retries: options.verify_retries,
      agent: options.agent,
    })
    jobs.set(job.id, { model, job })
    deps.log(`started ${model} as ${job.id}`)
  }

  const settled = new Map<string, JobLike>()
  while (settled.size < jobs.size) {
    for (const [id] of jobs) {
      if (settled.has(id)) continue
      const job = await deps.get(id)
      if (terminal(job)) {
        settled.set(id, job)
        deps.log(`${jobs.get(id)!.model}: ${job.status}`)
      }
    }
    if (settled.size >= jobs.size) break
    if (options.timeout_ms !== undefined && deps.now() - started > options.timeout_ms) {
      for (const [id] of jobs) {
        if (settled.has(id)) continue
        await deps.cancel(id)
        settled.set(id, { ...(await deps.get(id)), status: "cancelled" })
      }
      break
    }
    await deps.sleep(poll)
  }

  const candidates: BestOf.Candidate[] = []
  for (const [id, entry] of jobs) {
    const job = settled.get(id)!
    const stat = job.status === "done" && job.branch ? await deps.stat(job.branch) : null
    candidates.push({
      model: entry.model,
      job_id: id,
      branch: job.branch,
      status: job.status,
      passed: job.verify_result ? job.verify_result.pass : options.verify?.length ? false : null,
      cost_usd: job.cost_usd,
      duration_ms: job.time_started !== null && job.time_finished !== null ? job.time_finished - job.time_started : null,
      files: stat?.files ?? null,
      insertions: stat?.insertions ?? null,
      deletions: stat?.deletions ?? null,
      error: job.error,
    })
  }

  return {
    id: BestOf.newID(started),
    created_at: started,
    prompt: options.prompt,
    verify: options.verify ?? [],
    budget_usd: options.budget_usd,
    candidates,
    recommended: BestOf.recommend(candidates),
    promoted: null,
  }
}

/** Choose the candidate to promote: an explicit model or job id, else the recommendation. */
export function pick(receipt: BestOf.Receipt, choice?: string) {
  const wanted = choice ?? receipt.recommended
  if (!wanted) return { ok: false as const, reason: "No candidate finished cleanly; pass --winner <model|job id> to promote one anyway." }
  const found = receipt.candidates.find((c) => c.model === wanted || c.job_id === wanted)
  if (!found) return { ok: false as const, reason: `No candidate "${wanted}". Candidates: ${receipt.candidates.map((c) => c.model).join(", ")}.` }
  if (found.status !== "done" || !found.branch) return { ok: false as const, reason: `${found.model} did not finish (${found.status}); there is nothing to promote.` }
  if (found.passed === false) return { ok: false as const, reason: `${found.model} failed its verification gate; promote it only with --force.` }
  return { ok: true as const, candidate: found }
}
