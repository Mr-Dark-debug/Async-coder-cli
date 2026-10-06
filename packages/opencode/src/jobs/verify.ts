import type { GateResult, VerifyResult } from "./job.sql"
import type { Job } from "./store"
import { spawn } from "node:child_process"
import type { Readable } from "node:stream"
import { StringDecoder } from "node:string_decoder"

const TAIL = 4000

const tail = (text: string) => (text.length > TAIL ? `…${text.slice(-TAIL)}` : text)

async function output(stream: Readable) {
  const decoder = new StringDecoder("utf8")
  let text = ""
  for await (const chunk of stream) text = (text + decoder.write(chunk)).slice(-TAIL - 1)
  return tail(text + decoder.end())
}

/** Run one gate command through the platform shell. Never throws: a failure to start is a failed gate. */
export async function gate(
  command: string,
  cwd: string,
  timeoutMs = 10 * 60_000,
  signal?: AbortSignal,
): Promise<GateResult> {
  const started = Date.now()
  if (signal?.aborted) return { command, code: 130, ms: 0, output: "Verification cancelled" }
  const argv =
    process.platform === "win32"
      ? ["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", command]
      : ["/bin/sh", "-c", command]
  try {
    const child = spawn(argv[0], argv.slice(1), {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      detached: process.platform !== "win32",
    })
    const exited = new Promise<number>((resolve, reject) => {
      child.once("error", reject)
      child.once("close", (code) => resolve(code ?? 1))
    })
    let stopped: Promise<void> | undefined
    let timedOut = false
    const stop = () =>
      (stopped ??= (async () => {
        if (!child.pid || child.exitCode !== null || child.signalCode !== null) return
        if (process.platform === "win32") {
          const kill = Bun.spawn(["taskkill", "/PID", String(child.pid), "/T", "/F"], {
            stdout: "ignore",
            stderr: "ignore",
            stdin: "ignore",
          })
          if ((await kill.exited) !== 0 && child.exitCode === null && child.signalCode === null)
            throw new Error("Failed to stop verification process tree")
          return
        }
        process.kill(-child.pid, "SIGKILL")
      })())
    const timer = setTimeout(() => {
      timedOut = true
      void stop().catch(() => child.kill("SIGKILL"))
    }, timeoutMs)
    const abort = () => {
      void stop().catch(() => child.kill("SIGKILL"))
    }
    signal?.addEventListener("abort", abort, { once: true })
    try {
      const [out, err, code] = await Promise.all([output(child.stdout!), output(child.stderr!), exited])
      await stopped
      return {
        command,
        code: signal?.aborted ? 130 : timedOut ? 124 : code,
        ms: Date.now() - started,
        output: signal?.aborted
          ? "Verification cancelled"
          : timedOut
            ? "Verification timed out"
            : tail(`${out}${err.length ? `\n${err}` : ""}`.trim()),
      }
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener("abort", abort)
    }
  } catch (error) {
    return { command, code: 127, ms: Date.now() - started, output: String(error) }
  }
}

/** Run gates in order, stopping at the first failure (later gates would only add noise). */
export async function run(commands: string[], cwd: string, attempts = 1, signal?: AbortSignal): Promise<VerifyResult> {
  const gates: GateResult[] = []
  for (const command of commands) {
    const result = await gate(command, cwd, undefined, signal)
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
    lines.push(
      "",
      `### Verification: ${job.verify_result.pass ? "passed" : "failed"} (attempt ${job.verify_result.attempts})`,
    )
    for (const g of job.verify_result.gates)
      lines.push(`- ${g.code === 0 ? "PASS" : "FAIL"} \`${g.command}\` (${duration(g.ms)})`)
  } else if (job.verify?.length) lines.push("", "### Verification: not run")
  if (sage.length)
    lines.push(
      "",
      `### Sage: ${sage.length} ${sage.length === 1 ? "review" : "reviews"} (${money(sage.reduce((sum, item) => sum + item.cost_usd, 0))})`,
      ...sage.map((item) => `- ${item.stage}: ${item.reason}`),
    )
  else lines.push("", "### Sage: not consulted (no extra model cost)")
  return lines.join("\n")
}
