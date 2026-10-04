import path from "path"
import { Instance } from "@/project/instance"
import { Jobs } from "@/jobs"
import { git } from "@/jobs/git"
import { Identifier } from "@/id/id"
import { parse, workerPrompt, type Plan } from "./plan"

export async function loadManifest(name: string) {
  const file = path.join(Instance.directory, ".async-coder", "team", `${name}.md`)
  return parse(file, await Bun.file(file).text())
}

export async function listManifests() {
  const dir = path.join(Instance.directory, ".async-coder", "team")
  const names = await Array.fromAsync(new Bun.Glob("*.md").scan({ cwd: dir })).catch(() => [] as string[])
  return names.map((file) => path.basename(file, ".md")).sort()
}

/** Start every worker of a plan as its own detached job on its own worktree branch. */
export async function start(plan: Plan, input?: { budget_usd?: number }) {
  const teamID = `team_${Identifier.ascending("job").slice(3, 15)}`
  const jobs = []
  for (const worker of plan.workers)
    jobs.push(
      await Jobs.start({
        prompt: workerPrompt(plan, worker),
        agent: worker.agent,
        model: worker.model,
        budget_usd: worker.budget_usd ?? input?.budget_usd,
        worktree: true,
        team_id: teamID,
        role: worker.role,
      }),
    )
  return { teamID, jobs }
}

export function status(teamID: string) {
  const jobs = Jobs.Store.list({ team_id: teamID, limit: 500 }).toReversed()
  const live = jobs.filter((job) => job.status === "queued" || job.status === "running").length
  return { teamID, jobs, live, complete: jobs.length > 0 && live === 0 }
}

export type MergeResult = {
  merged: { role: string; branch: string }[]
  conflicted?: { role: string; branch: string; message: string }
  skipped: { role: string; reason: string }[]
}

/**
 * Merge finished workers into the current branch one at a time, in start order. Stops at the first
 * conflict (aborting that merge cleanly) so the lead can resolve it or reassign the worker.
 */
export async function merge(teamID: string): Promise<MergeResult> {
  const result: MergeResult = { merged: [], skipped: [] }
  const root = Instance.worktree
  if (await git(root, ["status", "--porcelain=v1"])) throw new Error("Commit or stash changes in the destination before merging a team")
  for (const job of Jobs.Store.list({ team_id: teamID, limit: 500 }).toReversed()) {
    const role = job.role ?? job.name
    if (job.status !== "done" || !job.branch) {
      result.skipped.push({ role, reason: job.status === "done" ? "no branch" : job.status })
      continue
    }
    try {
      await git(root, ["-c", "user.name=async-coder", "-c", "user.email=async-coder@localhost", "merge", "--no-ff", "-m", `Merge team worker ${role}`, "--", job.branch])
      result.merged.push({ role, branch: job.branch })
    } catch (error) {
      await git(root, ["merge", "--abort"]).catch(() => undefined)
      result.conflicted = { role, branch: job.branch, message: String(error instanceof Error ? error.message : error) }
      break
    }
  }
  return result
}

/** Replace a failed or cancelled worker with a fresh job carrying the same role and assignment. */
export async function reassign(jobID: string) {
  const old = Jobs.Store.get(jobID)
  if (!old?.team_id) throw new Error("Job is not part of a team")
  if (old.status === "running" || old.status === "queued") await Jobs.cancel(jobID)
  return Jobs.start({
    prompt: old.prompt,
    agent: old.agent ?? undefined,
    model: old.model ?? undefined,
    budget_usd: old.budget_usd ?? undefined,
    worktree: true,
    team_id: old.team_id,
    role: old.role ?? undefined,
  })
}
