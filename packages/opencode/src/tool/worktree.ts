import z from "zod"
import { Effect } from "effect"
import * as Tool from "./tool"
import { WorktreeManage } from "@/worktree/manage"
import { InstanceState } from "@/effect"
import { Instance } from "@/project/instance"

const parameters = z.object({ action: z.enum(["create", "list", "status", "remove", "merge", "switch"]), name: z.string().optional(), branch: z.string().optional(), base: z.string().optional() })

export const WorktreeTool = Tool.define("worktree", Effect.succeed({
  description: "Create and inspect isolated Git worktrees, merge committed changes, or get the directory to switch to in a new session. Switching returns a directory; it never redirects the current session's file tools.",
  parameters,
  execute: (args: z.infer<typeof parameters>, ctx: Tool.Context) => Effect.gen(function* () {
    if (!["list", "status", "switch"].includes(args.action)) yield* ctx.ask({ permission: "worktree", patterns: [args.name ?? args.action], always: ["*"], metadata: args })
    const instance = yield* InstanceState.context
    const result = yield* Effect.promise(() => Instance.restore(instance, async () => {
      if (args.action === "create") return WorktreeManage.create({ name: args.name, branch: args.branch, baseBranch: args.base })
      if (args.action === "list" || args.action === "status") return WorktreeManage.list()
      if (!args.name) throw new Error("Worktree name or directory is required")
      if (args.action === "switch") return { directory: (await WorktreeManage.locate(args.name)).directory, instruction: "Open a new session in this directory to switch. Existing session context stays isolated." }
      return WorktreeManage[args.action](args.name)
    }))
    return { title: `Worktree ${args.action}`, metadata: {}, output: JSON.stringify(result, null, 2) }
  }),
}))
