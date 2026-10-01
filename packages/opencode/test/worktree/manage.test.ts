import { afterEach, expect, test } from "bun:test"
import { $ } from "bun"
import path from "node:path"
import { tmpdir } from "../fixture/fixture"
import { Instance } from "@/project/instance"
import { WorktreeManage } from "@/worktree/manage"
import { Session } from "@/session"
import { makeRuntime } from "@/effect/run-service"

const sessions = makeRuntime(Session.Service, Session.defaultLayer)
afterEach(() => Instance.disposeAll())

test("parallel worktrees use dev base, isolate files and session context, refuse dirty removal, then merge clean commits", async () => {
  await using tmp = await tmpdir({ git: true })
  await Bun.write(path.join(tmp.path, "code.txt"), "base")
  await $`git add .`.cwd(tmp.path).quiet()
  await $`git commit -m code`.cwd(tmp.path).quiet()
  await $`git branch dev`.cwd(tmp.path).quiet()
  await Instance.provide({ directory: tmp.path, fn: async () => {
    const worktrees = await Promise.all([WorktreeManage.create({ name: "parallel-a" }), WorktreeManage.create({ name: "parallel-b" })])
    expect(worktrees.every((worktree) => worktree.baseBranch === "dev")).toBe(true)
    expect((await WorktreeManage.list()).filter((worktree) => worktree.managed)).toHaveLength(2)
    await Bun.write(path.join(worktrees[0]!.directory, "code.txt"), "agent-a")
    expect(await Bun.file(path.join(worktrees[1]!.directory, "code.txt")).text()).toBe("base")
    expect(await Bun.file(path.join(tmp.path, "code.txt")).text()).toBe("base")
    const contexts = await Promise.all(worktrees.map((worktree) => Instance.provide({ directory: worktree.directory, fn: () => sessions.runPromise((svc) => svc.create()) })))
    expect(contexts.map((session) => session.directory)).toEqual(worktrees.map((worktree) => worktree.directory))
    expect(contexts[0]!.id).not.toBe(contexts[1]!.id)
    await expect(WorktreeManage.remove(worktrees[0]!.directory)).rejects.toThrow("uncommitted")
    await expect(WorktreeManage.remove(tmp.path)).rejects.toThrow("primary")
    await $`git add .`.cwd(worktrees[0]!.directory).quiet()
    await $`git commit -m agent-a`.cwd(worktrees[0]!.directory).quiet()
    await expect(WorktreeManage.remove(worktrees[0]!.directory)).rejects.toThrow()
    await WorktreeManage.merge(worktrees[0]!.directory)
    expect(await Bun.file(path.join(tmp.path, "code.txt")).text()).toBe("agent-a")
    await WorktreeManage.remove(worktrees[0]!.directory)
    await WorktreeManage.remove(worktrees[1]!.directory)
    expect((await WorktreeManage.list()).filter((worktree) => worktree.managed)).toEqual([])
  } })
}, 60_000)

test("rejects nonexistent or option-like base refs without creating a worktree", async () => {
  await using tmp = await tmpdir({ git: true })
  await Instance.provide({ directory: tmp.path, fn: async () => {
    await expect(WorktreeManage.create({ baseBranch: "--force" })).rejects.toThrow("option")
    await expect(WorktreeManage.create({ baseBranch: "not-a-ref" })).rejects.toThrow()
    expect(await WorktreeManage.list()).toHaveLength(1)
  } })
}, 30_000)
