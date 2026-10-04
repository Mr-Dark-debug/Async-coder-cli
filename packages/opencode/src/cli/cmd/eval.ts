import path from "path"
import { mkdir } from "fs/promises"
import { createOpencodeClient } from "@async-coder/sdk/v2"
import { cmd } from "./cmd"
import { Eval } from "@/eval"

const wait = async (client: ReturnType<typeof createOpencodeClient>, jobID: string, timeoutMs: number) => {
  const end = Date.now() + timeoutMs
  while (Date.now() < end) {
    const job = (await client.job.get({ jobID })).data
    if (job && ["done", "failed", "cancelled"].includes(job.status)) return job
    await Bun.sleep(1500)
  }
  await client.job.cancel({ jobID })
  throw new Error(`Timed out waiting for ${jobID}`)
}

export const EvalCommand = cmd({
  command: "eval <action> [arg]",
  describe: "run golden tasks across models and compare (run <suite-dir>, compare <baseline.json> <current.json>)",
  builder: (yargs) =>
    yargs
      .positional("action", { type: "string", choices: ["run", "compare"], demandOption: true })
      .positional("arg", { type: "string" })
      .positional("arg2", { type: "string" })
      .option("models", { type: "string", describe: "comma-separated provider/model list", default: "" })
      .option("attach", { type: "string", default: "http://127.0.0.1:4096", describe: "server URL (async-coder serve)" })
      .option("password", { type: "string" })
      .option("dir", { type: "string", describe: "project directory on the server (defaults to the current directory)" })
      .option("timeout", { type: "number", default: 900, describe: "seconds per task" })
      .option("out", { type: "string", describe: "write the run as JSON here" })
      .option("baseline", { type: "string", describe: "baseline run JSON; exit non-zero on regressions" }),
  handler: async (args) => {
    if (args.action === "compare") {
      const [a, b] = [args.arg, (args as { _: string[] })._[2]].map((file) => {
        if (!file) throw new Error("compare needs two run files")
        return file
      })
      const regressions = Eval.regressions(await Bun.file(a).json(), await Bun.file(b).json())
      for (const r of regressions) process.stdout.write(`REGRESSION ${r.task} on ${r.model}: passed before, now ${r.now}\n`)
      process.stdout.write(regressions.length ? "" : "no regressions\n")
      process.exitCode = regressions.length ? 1 : 0
      return
    }
    const dir = path.resolve(args.arg ?? "")
    const tasks = await Eval.loadSuite(dir)
    const models = args.models.split(",").map((m) => m.trim()).filter(Boolean)
    if (models.length === 0) throw new Error("--models is required (for example --models groq/kimi-k2,ollama/qwen3)")
    const password = args.password ?? process.env.ASYNC_CODER_SERVER_PASSWORD
    const headers = password
      ? { Authorization: `Basic ${Buffer.from(`${process.env.ASYNC_CODER_SERVER_USERNAME ?? "async-coder"}:${password}`).toString("base64")}` }
      : undefined
    const client = createOpencodeClient({ baseUrl: args.attach, directory: args.dir ?? process.cwd(), headers })
    const results: Eval.Result[] = []
    for (const model of models)
      for (const task of tasks) {
        process.stderr.write(`${task.name} on ${model} ... `)
        const created = await client.job.create({ prompt: task.prompt, model, budget_usd: task.budget_usd, worktree: true, verify: task.verify, verify_retries: task.retries })
        if (!created.data) throw new Error(`Could not start a job: ${JSON.stringify(created.error)}`)
        const job = await wait(client, created.data.id, args.timeout * 1000)
        const result = Eval.score({ task: task.name, model, job: job as never })
        process.stderr.write(`${result.pass ? "pass" : "FAIL"} ($${result.cost_usd.toFixed(4)})\n`)
        results.push(result)
      }
    const run: Eval.Run = { suite: path.basename(dir), time: Date.now(), results }
    process.stdout.write(Eval.table(Eval.summarize(results)) + "\n")
    if (args.out) {
      await mkdir(path.dirname(path.resolve(args.out)), { recursive: true })
      await Bun.write(args.out, JSON.stringify(run, null, 2))
    }
    if (args.baseline) {
      const regressions = Eval.regressions(await Bun.file(args.baseline).json(), run)
      for (const r of regressions) process.stdout.write(`REGRESSION ${r.task} on ${r.model}: passed before, now ${r.now}\n`)
      process.exitCode = regressions.length ? 1 : 0
    }
  },
})
