import path from "path"
import matter from "gray-matter"

export type Worker = { role: string; prompt: string; agent?: string; model?: string; budget_usd?: number }
export type Plan = { name: string; goal?: string; workers: Worker[] }

/** Frame the worker prompt: what the team is doing, the worker's slice, and the commit contract. */
export function workerPrompt(plan: Plan, worker: Worker) {
  return [
    `You are the "${worker.role}" worker on team "${plan.name}".`,
    plan.goal ? `Team goal: ${plan.goal}` : "",
    "",
    `Your assignment:\n${worker.prompt}`,
    "",
    "Rules:",
    "- You are working in your own git worktree on your own branch. Touch only what your assignment needs; other workers own the rest.",
    "- Do not merge, rebase, or switch branches. Leave your changes in the working tree; they are committed for you when you finish.",
    "- Finish with a short summary of what you changed and anything the lead must double-check.",
  ]
    .filter((line, index, all) => line !== "" || all[index - 1] !== "")
    .join("\n")
}

const asWorkers = (value: unknown): Worker[] => {
  if (!Array.isArray(value)) throw new Error("A team needs a `workers` list")
  return value.map((item, index) => {
    if (typeof item !== "object" || item === null) throw new Error(`workers[${index}] must be an object`)
    const w = item as Record<string, unknown>
    if (typeof w.role !== "string" || !w.role) throw new Error(`workers[${index}] needs a role`)
    if (typeof w.prompt !== "string" || !w.prompt) throw new Error(`workers[${index}] (${w.role}) needs a prompt`)
    return {
      role: w.role,
      prompt: w.prompt,
      agent: typeof w.agent === "string" ? w.agent : undefined,
      model: typeof w.model === "string" ? w.model : undefined,
      budget_usd: typeof w.budget_usd === "number" ? w.budget_usd : undefined,
    }
  })
}

/** Parse a team manifest (.async-coder/team/<name>.md): frontmatter lists workers, the body is the goal. */
export function parse(file: string, text: string): Plan {
  const parsed = matter(text)
  const data = parsed.data as Record<string, unknown>
  const workers = asWorkers(data.workers)
  if (new Set(workers.map((w) => w.role)).size !== workers.length) throw new Error("Worker roles must be unique")
  return {
    name: typeof data.name === "string" && data.name ? data.name : path.basename(file, path.extname(file)),
    goal: parsed.content.trim() || undefined,
    workers,
  }
}
