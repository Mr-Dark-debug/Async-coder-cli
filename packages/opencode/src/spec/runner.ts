import { Spec } from "."

/**
 * Executes the ready tasks of a spec as verified background jobs.
 *
 * Every task runs as its own job (its own worktree and branch). A task is marked done in tasks.md only
 * after its job finished, its gate passed and its branch merged cleanly into the project. Merging happens
 * in task order, so later tasks always start from a tree that contains the earlier ones. The runner stops
 * at the first failed job or merge conflict and reports why; it never marks unverified work as done.
 */

export type JobStatus = "queued" | "running" | "done" | "failed" | "cancelled"

export type JobLike = {
  id: string
  status: JobStatus
  branch: string | null
  error: string | null
  verify_result?: { pass: boolean } | null
}

export type StartInput = {
  prompt: string
  verify?: string[]
  verify_retries?: number
  budget_usd?: number
  model?: string
  agent?: string
}

export type Deps = {
  start(input: StartInput): Promise<JobLike>
  get(id: string): Promise<JobLike>
  merge(branch: string): Promise<{ ok: true } | { ok: false; reason: string }>
  read(): Promise<string>
  write(markdown: string): Promise<void>
  sleep(ms: number): Promise<void>
  log(message: string): void
}

export type Options = {
  name: string
  requirements: string
  design: string
  /** Run every independent ready task at once instead of one at a time. */
  wave?: boolean
  /** Restrict the run to one task id. */
  only?: string
  /** Gate commands that must pass in each task's worktree. */
  verify?: string[]
  verify_retries?: number
  budget_usd?: number
  model?: string
  agent?: string
  /** Upper bound on concurrently running jobs in a wave. */
  max_parallel?: number
  poll_ms?: number
}

export type Outcome = { id: string; title: string; status: "completed" | "failed" | "conflict" | "skipped"; detail?: string }

const LIMIT = 24_000
const clip = (text: string) => (text.length > LIMIT ? `${text.slice(0, LIMIT)}\n[truncated]` : text)

/** The instruction a task job receives. Spec documents are embedded: an uncommitted spec is not in a fresh worktree. */
export function taskPrompt(input: { name: string; task: Spec.Task; requirements: string; design: string }) {
  const refs = input.task.requirements.length ? `Requirements covered: ${input.task.requirements.join(", ")}.` : ""
  return [
    `You are implementing task ${input.task.id} of the spec "${input.name}": ${input.task.title}`,
    refs,
    "",
    "Implement only this task. Follow the design and keep the change focused on it; do not edit tasks.md or other spec documents.",
    "Run the relevant tests before you finish and report exactly what you ran and what failed.",
    "",
    "<requirements>",
    clip(input.requirements),
    "</requirements>",
    "",
    "<design>",
    clip(input.design),
    "</design>",
  ]
    .filter((line, index, all) => line !== "" || all[index - 1] !== "")
    .join("\n")
}

const terminal = (job: JobLike) => job.status === "done" || job.status === "failed" || job.status === "cancelled"

async function settle(ids: string[], deps: Deps, poll: number) {
  const jobs = new Map<string, JobLike>()
  while (jobs.size < ids.length) {
    for (const id of ids) {
      if (jobs.has(id)) continue
      const job = await deps.get(id)
      if (terminal(job)) jobs.set(id, job)
    }
    if (jobs.size < ids.length) await deps.sleep(poll)
  }
  return jobs
}

export async function run(options: Options, deps: Deps) {
  const outcomes: Outcome[] = []
  const poll = options.poll_ms ?? 2000

  for (;;) {
    const tasks = Spec.parseTasks(await deps.read())
    const ready = Spec.ready(tasks).filter((task) => !options.only || task.id === options.only)
    if (!ready.length) return { outcomes, stopped: undefined as string | undefined }

    const batch = options.wave ? ready.slice(0, Math.max(1, options.max_parallel ?? 3)) : ready.slice(0, 1)
    deps.log(`Starting ${batch.map((task) => task.id).join(", ")}`)

    const started = new Map<string, JobLike>()
    for (const task of batch) {
      started.set(
        task.id,
        await deps.start({
          prompt: taskPrompt({ name: options.name, task, requirements: options.requirements, design: options.design }),
          verify: options.verify,
          verify_retries: options.verify_retries,
          budget_usd: options.budget_usd,
          model: options.model,
          agent: options.agent,
        }),
      )
    }
    const finished = await settle([...started.values()].map((job) => job.id), deps, poll)

    let stopped: string | undefined
    for (const task of batch) {
      const job = finished.get(started.get(task.id)!.id)!
      if (stopped) {
        outcomes.push({ id: task.id, title: task.title, status: "skipped", detail: "an earlier task in this batch did not finish cleanly" })
        continue
      }
      if (job.status !== "done") {
        stopped = `Task ${task.id} ${job.status}${job.error ? `: ${job.error}` : ""}`
        outcomes.push({ id: task.id, title: task.title, status: "failed", detail: job.error ?? job.status })
        continue
      }
      if (job.verify_result && !job.verify_result.pass) {
        stopped = `Task ${task.id} finished but its verification gate did not pass`
        outcomes.push({ id: task.id, title: task.title, status: "failed", detail: "verification gate failed" })
        continue
      }
      if (job.branch) {
        const merged = await deps.merge(job.branch)
        if (!merged.ok) {
          stopped = `Task ${task.id} could not be merged: ${merged.reason}`
          outcomes.push({ id: task.id, title: task.title, status: "conflict", detail: merged.reason })
          continue
        }
      }
      await deps.write(Spec.complete(await deps.read(), task.id))
      // Guard against a task that cannot be marked (for example a hand-edited id): looping would never end.
      if (!Spec.parseTasks(await deps.read()).find((item) => item.id === task.id)?.done) {
        stopped = `Task ${task.id} finished but could not be marked done in tasks.md`
        outcomes.push({ id: task.id, title: task.title, status: "failed", detail: "tasks.md was not updated" })
        continue
      }
      outcomes.push({ id: task.id, title: task.title, status: "completed" })
    }
    if (stopped) return { outcomes, stopped }
    if (options.only) return { outcomes, stopped: undefined }
  }
}
