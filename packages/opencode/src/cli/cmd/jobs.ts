import { cmd } from "./cmd"
import { createOpencodeClient } from "@async-coder/sdk/v2"

const DEFAULT_SERVER = "http://127.0.0.1:4096"

export const JobsCommand = cmd({
  command: "jobs <action> [arg]",
  describe: "run and manage background jobs on a running async-coder server",
  builder: (yargs) =>
    yargs
      .positional("action", { type: "string", choices: ["ls", "run", "get", "cancel", "team", "team-status", "team-merge", "team-reassign"], demandOption: true })
      .positional("arg", { type: "string", describe: "prompt for run; job id for get/cancel/team-reassign; manifest name for team; team id for team-status/team-merge" })
      .option("attach", { type: "string", default: DEFAULT_SERVER, describe: "server URL (start one with `async-coder serve`)" })
      .option("password", { type: "string", describe: "server password" })
      .option("dir", { type: "string", describe: "project directory on the server (defaults to the current directory)" })
      .option("budget", { type: "number", describe: "spend cap in USD for run" })
      .option("agent", { type: "string" })
      .option("model", { type: "string", describe: "provider/model" })
      .option("no-worktree", { type: "boolean", describe: "run in the project directory instead of an isolated worktree" }),
  handler: async (args) => {
    const password = args.password ?? process.env.ASYNC_CODER_SERVER_PASSWORD
    const headers = password
      ? {
          Authorization: `Basic ${Buffer.from(`${process.env.ASYNC_CODER_SERVER_USERNAME ?? "async-coder"}:${password}`).toString("base64")}`,
        }
      : undefined
    const client = createOpencodeClient({ baseUrl: args.attach, directory: args.dir ?? process.cwd(), headers })
    const need = (what: string) => {
      if (!args.arg) throw new Error(`${what} is required`)
      return args.arg
    }
    const result = await (async () => {
      if (args.action === "run")
        return client.job.create({
          prompt: need("A prompt"),
          agent: args.agent,
          model: args.model,
          budget_usd: args.budget,
          worktree: !args["no-worktree"],
        })
      if (args.action === "team") return client.team.start({ manifest: need("A team manifest name"), budget_usd: args.budget })
      if (args.action === "team-status") return client.team.status({ teamID: need("A team id") })
      if (args.action === "team-merge") return client.team.merge({ teamID: need("A team id") })
      if (args.action === "team-reassign") return client.team.reassign({ jobID: need("A job id") })
      if (args.action === "get") return client.job.get({ jobID: need("A job id") })
      if (args.action === "cancel") return client.job.cancel({ jobID: need("A job id") })
      return client.job.list()
    })().catch((error) => {
      throw new Error(`Could not reach a server at ${args.attach}. Start one with \`async-coder serve\`. (${String(error)})`)
    })
    if (result.error) throw new Error(JSON.stringify(result.error))
    if (args.action === "ls") {
      for (const job of result.data as { id: string; status: string; name: string; cost_usd: number }[])
        process.stdout.write(`${job.id}  ${job.status.padEnd(9)} $${job.cost_usd.toFixed(4)}  ${job.name}\n`)
      return
    }
    process.stdout.write(JSON.stringify(result.data, null, 2) + "\n")
  },
})
