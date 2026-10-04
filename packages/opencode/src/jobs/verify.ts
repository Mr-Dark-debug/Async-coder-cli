import type { GateResult, VerifyResult } from "./job.sql"
import type { Job } from "./store"

const TAIL = 4000

const tail = (text: string) => (text.length > TAIL ? `…${text.slice(-TAIL)}` : text)

/** Run one gate command through the platform shell. Never throws: a failure to start is a failed gate. */
export async function gate(command: string, cwd: string, timeoutMs = 10 * 60_000): Promise<GateResult> {
  const started = Date.now()
  const argv = process.platform === "win32" ? ["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", command] : ["/bin/sh", "-c", command]
  try {
    const child = Bun.spawn(argv, { cwd, stdout: "pipe", stderr: "pipe", stdin: "ignore" })
    const timer = setTimeout(() => child.kill(), timeoutMs)
    const [out, err, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited])
    clearTimeout(timer)
    return { command, code, ms: Date.now() - started, output: tail(`${out}${err ? `\n${err}` : ""}`.trim()) }
  } catch (error) {
    return { command, code: 127, ms: Date.now() - started, output: String(error) }
  }
}

/** Run gates in order, stopping at the first failure (later gates would only add noise). */
export async function run(commands: string[], cwd: string, attempts = 1): Promise<VerifyResult> {
  const gates: GateResult[] = []
  for (const command of commands) {
    const result = await gate(command, cwd)
    gates.push(result)
    if (result.code !== 0) break
  }
  return { pass: gates.length === commands.length && gates.every((g) => g.code === 0), attempts, gates }
}

/** The follow-up prompt sent to the agent when a gate fails and retries remain. */
export function retryPrompt(result: VerifyResult, critique?: string) {
  const failed = result.gates.find((g) => g.code !== 0)
  if (!failed) return ""
  return [
    "Verification failed. Fix the problem so this command passes, then stop.",
    `Command: ${failed.command}`,
    `Exit code: ${failed.code}`,
    "Output:",
    failed.output || "(no output)",
    ...(critique ? ["", "A reviewer looked at this failure and says:", critique] : []),
  ].join("\n")
}

const money = (value: number) => `$${value.toFixed(value < 1 ? 4 : 2)}`

const duration = (ms: number) => {
  const seconds = Math.round(ms / 1000)
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m${String(seconds % 60).padStart(2, "0")}s`
}

/** A deterministic markdown cost-and-gate receipt for a job. Same job row in, same text out. */
export function receipt(job: Job, sage: { stage: string; reason: string; cost_usd: number }[] = []) {
  const lines = [
    `## Job receipt: ${job.name}`,
    "",
    `- Status: ${job.status}`,
    `- Cost: ${money(job.cost_usd)}${job.budget_usd ? ` of ${money(job.budget_usd)} budget` : ""}`,
    `- Tokens: ${job.tokens_in.toLocaleString("en-US")} in / ${job.tokens_out.toLocaleString("en-US")} out`,
    ...(job.time_started && job.time_finished ? [`- Duration: ${duration(job.time_finished - job.time_started)}`] : []),
    ...(job.branch ? [`- Branch: ${job.branch}`] : []),
  ]
  if (job.verify_result) {
    lines.push("", `### Verification: ${job.verify_result.pass ? "passed" : "failed"} (attempt ${job.verify_result.attempts})`)
    for (const g of job.verify_result.gates) lines.push(`- ${g.code === 0 ? "PASS" : "FAIL"} \`${g.command}\` (${duration(g.ms)})`)
  } else if (job.verify?.length) lines.push("", "### Verification: not run")
  if (sage.length)
    lines.push("", `### Sage: ${sage.length} ${sage.length === 1 ? "review" : "reviews"} (${money(sage.reduce((sum, item) => sum + item.cost_usd, 0))})`, ...sage.map((item) => `- ${item.stage}: ${item.reason}`))
  else lines.push("", "### Sage: not consulted (no extra model cost)")
  return lines.join("\n")
}
