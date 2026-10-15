import path from "path"
import fs from "fs/promises"
import { cmd } from "./cmd"
import { createOpencodeClient } from "@async-coder/sdk/v2"
import { Spec } from "@/spec"
import { run, type JobLike } from "@/spec/runner"

const DEFAULT_SERVER = "http://127.0.0.1:4096"

const exists = (file: string) =>
  fs.access(file).then(
    () => true,
    () => false,
  )

const git = async (cwd: string, args: string[]) => {
  const proc = Bun.spawn(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe" })
  const [stdout, stderr, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited])
  return { stdout, stderr, code }
}

export const SpecCommand = cmd({
  command: "spec <action> <name>",
  describe: "inspect a spec or execute its ready tasks as verified background jobs",
  builder: (yargs) =>
    yargs
      .positional("action", { type: "string", choices: ["status", "run"], demandOption: true })
      .positional("name", { type: "string", demandOption: true, describe: "spec name (.async-coder/specs/<name>)" })
      .option("task", { type: "string", describe: "run only this task id" })
      .option("wave", { type: "boolean", describe: "run every independent ready task at once (merged in order)" })
      .option("verify", { type: "array", string: true, describe: "gate command that must pass in each task's worktree (repeatable)" })
      .option("retries", { type: "number", default: 1, describe: "times a failing gate is fed back to the agent" })
      .option("budget", { type: "number", describe: "spend cap in USD per task" })
      .option("max-parallel", { type: "number", default: 3 })
      .option("agent", { type: "string" })
      .option("model", { type: "string", describe: "provider/model" })
      .option("attach", { type: "string", default: DEFAULT_SERVER, describe: "server URL (start one with `async-coder serve`)" })
      .option("password", { type: "string", describe: "server password" }),
  handler: async (args) => {
    const name = String(args.name)
    if (!Spec.NAME.test(name)) throw new Error(`Invalid spec name "${name}"`)
    const root = process.cwd()
    const dir = path.join(root, ".async-coder", "specs", name)
    const file = (doc: Spec.Doc) => path.join(dir, `${doc}.md`)
    const out = (line: string) => process.stdout.write(`${line}\n`)

    if (!(await exists(file("tasks")))) {
      throw new Error(`No tasks.md for spec "${name}" in ${dir}. Create the spec with the \`spec\` skill first.`)
    }

    const read = () => fs.readFile(file("tasks"), "utf8")
    const tasks = Spec.parseTasks(await read())

    if (args.action === "status") {
      const progress = Spec.progress(tasks)
      out(`${name}: ${progress.done}/${progress.total} required tasks done`)
      for (const task of tasks) out(`${task.done ? "[x]" : "[ ]"}${task.optional ? "*" : " "} ${task.id} ${task.title}${task.depends.length ? ` (after ${task.depends.join(", ")})` : ""}`)
      const ready = Spec.ready(tasks).map((task) => task.id)
      out(ready.length ? `Ready: ${ready.join(", ")}` : "Ready: none")
      if (await exists(file("requirements"))) {
        const gaps = Spec.uncovered(Spec.requirementIds(await fs.readFile(file("requirements"), "utf8")), tasks)
        if (gaps.length) out(`Requirements without a task: ${gaps.join(", ")}`)
      }
      return
    }

    const password = args.password ?? process.env.ASYNC_CODER_SERVER_PASSWORD
    const headers = password
      ? { Authorization: `Basic ${Buffer.from(`${process.env.ASYNC_CODER_SERVER_USERNAME ?? "async-coder"}:${password}`).toString("base64")}` }
      : undefined
    const client = createOpencodeClient({ baseUrl: args.attach, directory: root, headers })
    const asJob = (value: unknown) => value as JobLike

    const result = await run(
      {
        name,
        requirements: (await exists(file("requirements"))) ? await fs.readFile(file("requirements"), "utf8") : "",
        design: (await exists(file("design"))) ? await fs.readFile(file("design"), "utf8") : "",
        wave: args.wave,
        only: args.task,
        verify: args.verify?.length ? args.verify.map(String) : undefined,
        verify_retries: args.retries,
        budget_usd: args.budget,
        model: args.model,
        agent: args.agent,
        max_parallel: args["max-parallel"],
      },
      {
        start: async (input) => {
          const res = await client.job.create({ ...input, worktree: true })
          if (res.error || !res.data) throw new Error(`Could not start a job at ${args.attach}: ${JSON.stringify(res.error)}`)
          return asJob(res.data)
        },
        get: async (id) => {
          const res = await client.job.get({ jobID: id })
          if (res.error || !res.data) throw new Error(`Could not read job ${id}: ${JSON.stringify(res.error)}`)
          return asJob(res.data)
        },
        merge: async (branch) => {
          const fast = await git(root, ["merge", "--ff-only", branch])
          if (fast.code === 0) return { ok: true }
          const merged = await git(root, ["merge", "--no-edit", branch])
          if (merged.code === 0) return { ok: true }
          await git(root, ["merge", "--abort"])
          return { ok: false, reason: (merged.stderr || merged.stdout).trim().split("\n").slice(-3).join(" ") }
        },
        read,
        write: (markdown) => fs.writeFile(file("tasks"), markdown, "utf8"),
        sleep: (ms) => Bun.sleep(ms),
        log: out,
      },
    )

    for (const item of result.outcomes) out(`${item.status.padEnd(9)} ${item.id} ${item.title}${item.detail ? ` — ${item.detail}` : ""}`)
    if (!result.outcomes.length) out("Nothing is ready to run (all done, or waiting on dependencies).")
    if (result.stopped) {
      out(`Stopped: ${result.stopped}`)
      process.exitCode = 1
    }
  },
})
