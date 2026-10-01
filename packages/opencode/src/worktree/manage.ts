import path from "node:path"
import { Instance } from "@/project/instance"
import { Project } from "@/project"
import { Worktree } from "."
import { makeRuntime } from "@/effect/run-service"

const runtime = makeRuntime(Worktree.Service, Worktree.defaultLayer)
const projects = makeRuntime(Project.Service, Project.defaultLayer)

async function git(directory: string, args: string[]) {
  const child = Bun.spawn(["git", "-c", "core.fsmonitor=false", ...args], { cwd: directory, stdout: "pipe", stderr: "pipe" })
  const [output, error, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited])
  if (code !== 0) throw new Error(error.trim() || output.trim() || `git ${args[0]} failed (${code})`)
  return output.trim()
}

export async function list() {
  const sandboxes = await projects.runPromise((svc) => svc.sandboxes(Instance.project.id))
  const entries = (await git(Instance.worktree, ["worktree", "list", "--porcelain", "-z"]))
    .split("\0\0")
    .filter(Boolean)
    .map((block) => Object.fromEntries(block.split("\0").filter(Boolean).map((line) => {
      const index = line.indexOf(" ")
      return index < 0 ? [line, true] : [line.slice(0, index), line.slice(index + 1)]
    })))
  return Promise.all(entries.map(async (entry) => {
    const directory = String(entry.worktree)
    return {
      name: path.basename(directory),
      directory,
      branch: typeof entry.branch === "string" ? entry.branch.replace(/^refs\/heads\//, "") : undefined,
      head: String(entry.HEAD ?? ""),
      primary: path.resolve(directory) === path.resolve(Instance.project.worktree),
      locked: Boolean(entry.locked),
      managed: sandboxes.some((sandbox) => path.resolve(sandbox) === path.resolve(directory)),
      changes: await git(directory, ["status", "--porcelain=v1"]).catch(() => "unavailable"),
    }
  }))
}

export async function create(input: Worktree.CreateInput = {}) {
  if (Instance.project.vcs !== "git") throw new Error("Worktrees require a Git project")
  const info = await runtime.runPromise((svc) => svc.makeWorktreeInfo(input.name))
  const baseBranch = input.baseBranch ?? await git(Instance.worktree, ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"])
    .catch(() => git(Instance.worktree, ["rev-parse", "--verify", "origin/dev"]).then(() => "origin/dev"))
    .catch(() => git(Instance.worktree, ["rev-parse", "--verify", "dev"]).then(() => "dev"))
    .catch(() => "HEAD")
  if (baseBranch.startsWith("-")) throw new Error("Base branch cannot start with an option prefix")
  const branch = input.branch ?? info.branch
  await git(Instance.worktree, ["check-ref-format", "--branch", branch])
  await git(Instance.worktree, ["rev-parse", "--verify", `${baseBranch}^{commit}`])
  const result = { ...info, branch, baseBranch }
  await runtime.runPromise((svc) => svc.createFromInfo(result, input.startCommand))
  // createFromInfo boot reports lifecycle events; verify checkout also before returning.
  await git(result.directory, ["rev-parse", "--verify", "HEAD"])
  return result
}

export async function locate(name: string) {
  const entry = (await list()).find((entry) => entry.name === name || path.resolve(entry.directory).toLowerCase() === path.resolve(name).toLowerCase() || entry.branch === name)
  if (!entry) throw new Error(`Unknown worktree: ${name}`)
  return entry
}

export async function remove(name: string) {
  const entry = await locate(name)
  if (entry.primary || path.resolve(entry.directory) === path.resolve(Instance.worktree)) throw new Error("Cannot remove the primary or current worktree")
  if (!entry.managed) throw new Error("Only async-coder managed worktrees can be removed")
  if (entry.locked || entry.changes) throw new Error("Worktree is locked or has uncommitted changes; commit or move them before removal")
  // Let Git validate branch ancestry; never delete an unmerged branch or force-remove files.
  if (entry.branch) await git(Instance.worktree, ["merge-base", "--is-ancestor", entry.branch, "HEAD"])
  await git(Instance.worktree, ["worktree", "remove", entry.directory])
  await projects.runPromise((svc) => svc.removeSandbox(Instance.project.id, entry.directory))
  return { removed: entry.directory, branch: entry.branch }
}

export async function merge(name: string) {
  const entry = await locate(name)
  if (!entry.managed || !entry.branch) throw new Error("Merge requires a managed worktree with a branch")
  if (entry.changes || (await git(Instance.worktree, ["status", "--porcelain=v1"]))) throw new Error("Commit worktree changes and clean the destination before merging")
  await git(Instance.worktree, ["merge", "--ff-only", "--", entry.branch])
  return { merged: entry.branch, head: await git(Instance.worktree, ["rev-parse", "HEAD"]) }
}

export async function spawn(input: Worktree.CreateInput & { prompt?: string }) {
  const info = await create(input)
  const args = process.execPath.toLowerCase().endsWith("bun.exe") || path.basename(process.execPath) === "bun"
    ? [process.execPath, path.resolve(import.meta.dirname, "../index.ts")]
    : [process.execPath]
  const child = Bun.spawn([...args, ...(input.prompt ? ["run", input.prompt] : [])], { cwd: info.directory, stdin: "inherit", stdout: "inherit", stderr: "inherit" })
  return { ...info, pid: child.pid, exited: child.exited }
}

export * as WorktreeManage from "./manage"
