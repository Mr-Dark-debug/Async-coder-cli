import path from "path"
import fs from "fs/promises"
import { cmd } from "./cmd"
import { createOpencodeClient } from "@async-coder/sdk/v2"
import { BestOf } from "@/best-of"
import { run, pick, type JobLike, type Stat } from "@/best-of/runner"

const DEFAULT_SERVER = "http://127.0.0.1:4096"

const git = async (cwd: string, args: string[]) => {
  const proc = Bun.spawn(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe" })
  const [stdout, stderr, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited])
  return { stdout, stderr, code }
}

const receiptDir = (root: string) => path.join(root, ".async-coder", "best-of")
const receiptFile = (root: string, id: string) => path.join(receiptDir(root), `${id}.json`)

const load = async (root: string, id: string) => {
  const text = await fs.readFile(receiptFile(root, id), "utf8").catch(() => undefined)
  if (text === undefined) throw new Error(`No best-of receipt "${id}" in ${receiptDir(root)}.`)
  return JSON.parse(text) as BestOf.Receipt
}

const save = async (root: string, receipt: BestOf.Receipt) => {
  await fs.mkdir(receiptDir(root), { recursive: true })
  await fs.writeFile(receiptFile(root, receipt.id), JSON.stringify(receipt, null, 2), "utf8")
}

/** Accept `--models a,b` and repeated `--models a --models b`. */
const split = (value: unknown) =>
  (Array.isArray(value) ? value : [value])
    .flatMap((item) => String(item ?? "").split(","))
    .map((item) => item.trim())
    .filter(Boolean)

export const BestOfCommand = cmd({
  command: "best-of <action> [arg]",
  describe: "run one task on several models in separate worktrees and compare the results",
  builder: (yargs) =>
    yargs
      .positional("action", { type: "string", choices: ["run", "show", "promote"], demandOption: true })
      .positional("arg", { type: "string", describe: "run: the task prompt. show/promote: the receipt id" })
      .option("models", { type: "array", string: true, describe: "provider/model list, comma separated (run)" })
      .option("budget", { type: "number", describe: "spend cap in USD for EACH candidate (run, required)" })
      .option("max-candidates", { type: "number", default: BestOf.MAX_CANDIDATES, describe: "raise the candidate limit (run)" })
      .option("verify", { type: "array", string: true, describe: "gate command that must pass in every candidate (repeatable)" })
      .option("retries", { type: "number", default: 1, describe: "times a failing gate is fed back to the agent" })
      .option("timeout", { type: "number", describe: "minutes before unfinished candidates are cancelled" })
      .option("agent", { type: "string" })
      .option("winner", { type: "string", describe: "promote this model or job id instead of the recommendation" })
      .option("force", { type: "boolean", describe: "promote a candidate whose gate failed" })
      .option("attach", { type: "string", default: DEFAULT_SERVER, describe: "server URL (start one with `async-coder serve`)" })
      .option("password", { type: "string", describe: "server password" }),
  handler: async (args) => {
    const root = process.cwd()
    const out = (line: string) => process.stdout.write(`${line}\n`)
    const action = String(args.action)

    if (action === "show") {
      if (!args.arg) throw new Error("Pass the receipt id: async-coder best-of show <id>")
      const receipt = await load(root, String(args.arg))
      out(`${receipt.id}  ${receipt.prompt.split("\n")[0].slice(0, 100)}`)
      out(BestOf.table(receipt))
      out(receipt.promoted ? `Promoted: ${receipt.promoted.model} (${receipt.promoted.branch})` : `Recommended: ${receipt.recommended ?? "none"}`)
      return
    }

    if (action === "promote") {
      if (!args.arg) throw new Error("Pass the receipt id: async-coder best-of promote <id>")
      const receipt = await load(root, String(args.arg))
      if (receipt.promoted) throw new Error(`Already promoted: ${receipt.promoted.model} (${receipt.promoted.branch}).`)
      const choice = pick(receipt, args.winner)
      let candidate = choice.ok ? choice.candidate : undefined
      if (!candidate && args.force && args.winner) {
        candidate = receipt.candidates.find((c) => c.model === args.winner || c.job_id === args.winner)
        if (!candidate || candidate.status !== "done" || !candidate.branch) candidate = undefined
      }
      if (!candidate) throw new Error(choice.ok ? "Nothing to promote." : choice.reason)
      const branch = candidate.branch!
      const fast = await git(root, ["merge", "--ff-only", branch])
      if (fast.code !== 0) {
        const merged = await git(root, ["merge", "--no-edit", branch])
        if (merged.code !== 0) {
          await git(root, ["merge", "--abort"])
          throw new Error(`Could not merge ${branch}: ${(merged.stderr || merged.stdout).trim().split("\n").slice(-3).join(" ")}`)
        }
      }
      receipt.promoted = { model: candidate.model, branch, at: Date.now() }
      await save(root, receipt)
      out(`Promoted ${candidate.model}: merged ${branch} into the current branch.`)
      out(`The other candidates' branches are untouched; delete them with \`git branch -D <branch>\` when you are done.`)
      return
    }

    // run
    const prompt = args.arg ? String(args.arg).trim() : ""
    if (!prompt) throw new Error("Pass the task: async-coder best-of run \"<task>\" --models a,b --budget 1.5")
    const verdict = BestOf.check(split(args.models), args["max-candidates"])
    if (!verdict.ok) throw new Error(verdict.reason)
    if (!(typeof args.budget === "number" && args.budget > 0)) {
      throw new Error("--budget is required: it is the spend cap in USD for each candidate, so total spend is at most budget x candidates.")
    }

    const password = args.password ?? process.env.ASYNC_CODER_SERVER_PASSWORD
    const headers = password
      ? { Authorization: `Basic ${Buffer.from(`${process.env.ASYNC_CODER_SERVER_USERNAME ?? "async-coder"}:${password}`).toString("base64")}` }
      : undefined
    const client = createOpencodeClient({ baseUrl: args.attach, directory: root, headers })
    const asJob = (value: unknown) => value as JobLike

    out(`Best-of-${verdict.models.length}: ${verdict.models.join(", ")} at up to $${args.budget} each ($${(args.budget * verdict.models.length).toFixed(2)} total).`)
    const receipt = await run(
      {
        prompt,
        models: verdict.models,
        budget_usd: args.budget,
        verify: args.verify?.length ? args.verify.map(String) : undefined,
        verify_retries: args.retries,
        agent: args.agent,
        timeout_ms: args.timeout ? args.timeout * 60_000 : undefined,
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
        cancel: async (id) => {
          await client.job.cancel({ jobID: id })
        },
        stat: async (branch): Promise<Stat | null> => {
          const result = await git(root, ["diff", "--shortstat", `HEAD...${branch}`])
          if (result.code !== 0) return null
          const number = (re: RegExp) => Number(result.stdout.match(re)?.[1] ?? 0)
          return { files: number(/(\d+) files? changed/), insertions: number(/(\d+) insertions?\(\+\)/), deletions: number(/(\d+) deletions?\(-\)/) }
        },
        sleep: (ms) => Bun.sleep(ms),
        now: () => Date.now(),
        log: out,
      },
    )
    await save(root, receipt)
    out("")
    out(BestOf.table(receipt))
    out("")
    if (receipt.recommended) out(`Recommended: ${receipt.recommended}. Promote with: async-coder best-of promote ${receipt.id}`)
    else {
      out("No candidate finished cleanly, so nothing is recommended.")
      process.exitCode = 1
    }
    out(`Receipt: ${path.relative(root, receiptFile(root, receipt.id))}`)
  },
})
