import { git } from "./git"
import { receipt } from "./verify"
import { sageInvocations } from "./store"
import type { Job } from "./store"

export type Exec = (argv: string[], cwd: string) => Promise<{ code: number; out: string; err: string }>

export const exec: Exec = async (argv, cwd) => {
  try {
    const child = Bun.spawn(argv, { cwd, stdout: "pipe", stderr: "pipe", stdin: "ignore" })
    const [out, err, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited])
    return { code, out: out.trim(), err: err.trim() }
  } catch (error) {
    return { code: 127, out: "", err: String(error) }
  }
}

/**
 * Push a finished job's branch and open a draft pull request whose body is the job receipt.
 * This is only ever called from an explicit user action. Credentials come from the user's own
 * git credential helper and `gh` login; nothing is stored on the job.
 */
export async function open(job: Job, run: Exec = exec) {
  if (job.status !== "done") throw new Error(`Only finished jobs can open a pull request (status: ${job.status})`)
  if (!job.branch || !job.directory) throw new Error("This job did not run on its own branch, so there is nothing to push")
  if (job.verify_result && !job.verify_result.pass) throw new Error("Verification did not pass; refusing to open a pull request")
  const dirty = await git(job.directory, ["status", "--porcelain=v1"])
  if (dirty) throw new Error("The job worktree has uncommitted changes; commit them first")
  const push = await run(["git", "push", "-u", "origin", job.branch], job.directory)
  if (push.code !== 0) throw new Error(`git push failed: ${push.err || push.out}`)
  const pr = await run(
    ["gh", "pr", "create", "--draft", "--head", job.branch, "--title", job.name, "--body", receipt(job, sageInvocations(job.id))],
    job.directory,
  )
  if (pr.code !== 0) throw new Error(`gh pr create failed: ${pr.err || pr.out}`)
  return { url: pr.out.split("\n").at(-1) ?? pr.out, branch: job.branch }
}
