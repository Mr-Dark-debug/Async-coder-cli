import { cmd } from "./cmd"
import { bootstrap } from "../bootstrap"
import { WorktreeManage } from "@/worktree/manage"

export const WorktreeCommand = cmd({
  command: "worktree <action> [name]",
  describe: "manage isolated Git worktrees and launch agents",
  builder: (yargs) => yargs
    .positional("action", { type: "string", choices: ["create", "list", "status", "remove", "spawn", "merge"], demandOption: true })
    .positional("name", { type: "string" })
    .option("name", { type: "string", describe: "worktree name" })
    .option("branch", { type: "string", describe: "new branch name" })
    .option("base", { type: "string", describe: "base ref (defaults to remote default, origin/dev, dev, then HEAD)" })
    .option("prompt", { type: "string", describe: "headless task for spawn" }),
  handler: async (args) => {
    await bootstrap(process.cwd(), async () => {
      if (args.action === "spawn") {
        const result = await WorktreeManage.spawn({ name: args.name, branch: args.branch, baseBranch: args.base, prompt: args.prompt })
        process.stderr.write(`Agent ${result.pid}: ${result.directory}\n`)
        process.exitCode = await result.exited
        return
      }
      const result = args.action === "create"
        ? await WorktreeManage.create({ name: args.name, branch: args.branch, baseBranch: args.base })
        : args.action === "remove" || args.action === "merge"
          ? args.name ? await WorktreeManage[args.action](args.name) : (() => { throw new Error("A worktree name, branch or directory is required") })()
          : await WorktreeManage.list()
      process.stdout.write(JSON.stringify(result, null, 2) + "\n")
    })
  },
})
