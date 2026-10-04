import { Effect } from "effect"
import { ConfigHooks } from "@/config/hooks"
import { InstanceState } from "@/effect"
import { isRecord } from "@/util/record"
import { Log } from "@/util"
import { spawn } from "node:child_process"
import { text } from "node:stream/consumers"
import { killTree } from "@/shell/shell"

const log = Log.create({ service: "shell-hooks" })
const edits = new Set(["edit", "write", "apply_patch", "multiedit"])

export function events(name: string, input: unknown): ConfigHooks.Info["event"][] {
  const tool = isRecord(input) && typeof input.tool === "string" ? input.tool : undefined
  if (name === "tool.execute.before") return ["pre_tool_use", ...(tool === "bash" ? ["pre_command" as const] : []), ...(tool && edits.has(tool) ? ["pre_file_edit" as const] : [])]
  if (name === "tool.execute.after") return ["post_tool_use", ...(tool === "bash" ? ["post_command" as const] : []), ...(tool && edits.has(tool) ? ["post_file_edit" as const] : [])]
  if (name === "chat.message") return ["message_sent", "agent_start"]
  if (name === "experimental.text.complete") return ["message_received"]
  if (name === "session.created") return ["session_start"]
  if (name === "session.deleted") return ["session_end"]
  if (name === "session.idle") return ["agent_end"]
  if (name === "actor.status" && isRecord(input)) {
    if (input.status === "running") return ["agent_start"]
    if (input.status === "idle") return ["agent_end", ...(input.lastOutcome === "failure" ? ["error" as const] : [])]
  }
  if (name === "session.error") return ["error"]
  return []
}

export function matches(condition: string | undefined, input: unknown) {
  if (!condition) return true
  const match = /^tool\s*(===|==|!==|!=)\s*["']([^"']+)["']$/.exec(condition.trim())
  if (!match || !isRecord(input)) return false
  return match[1].startsWith("!") ? input.tool !== match[2] : input.tool === match[2]
}

export const run = Effect.fn("ShellHooks.run")(function* (
  hooks: readonly ConfigHooks.Info[] | undefined,
  name: string,
  input: unknown,
  output?: unknown,
) {
  const selected = (hooks ?? []).filter((hook) => events(name, input).includes(hook.event) && matches(hook.condition, input))
  if (!selected.length) return
  const cwd = yield* InstanceState.directory
  const args = isRecord(output) && isRecord(output.args) ? output.args : isRecord(input) && isRecord(input.args) ? input.args : input
  for (const hook of selected) {
    const before = hook.event.startsWith("pre_")
    const result = yield* Effect.tryPromise({
      try: async () => {
        const child = spawn(process.platform === "win32" ? "powershell.exe" : "/bin/sh", process.platform === "win32" ? ["-NoProfile", "-NonInteractive", "-Command", hook.command] : ["-c", hook.command], {
          cwd,
          windowsHide: true,
          detached: process.platform !== "win32",
          env: {
            ...process.env,
            ASYNC_CODER_HOOK_EVENT: hook.event,
            TOOL_INPUT: JSON.stringify(args),
            ...(isRecord(args) && typeof args.filePath === "string" ? { FILE_PATH: args.filePath } : {}),
            ASYNC_CODER_HOOK_INPUT: JSON.stringify(input),
            ASYNC_CODER_HOOK_OUTPUT: JSON.stringify(output ?? {}),
          },
          stdio: "pipe",
        })
        child.stdin.end(JSON.stringify({ event: hook.event, input, output }))
        const exited = new Promise<number>((resolve, reject) => {
          child.once("error", reject)
          child.once("close", (code) => resolve(code ?? 1))
        })
        const timer = setTimeout(() => { void killTree(child) }, hook.timeout ?? 10000)
        return Promise.all([text(child.stdout), text(child.stderr), exited])
          .then(([stdout, stderr, code]) => ({ stdout, stderr, code }))
          .finally(() => clearTimeout(timer))
      },
      catch: (error) => error instanceof Error ? error : new Error(String(error)),
    }).pipe(Effect.catch((error) => {
      if (before) return Effect.die(error)
      log.warn("hook failed", { event: hook.event, error: error.message })
      return Effect.succeed(undefined)
    }))
    if (!result) continue
    if (result.code !== 0) {
      const message = `Hook ${hook.id ?? hook.event} failed (${result.code}): ${result.stderr.trim() || "command failed or timed out"}`
      if (before) return yield* Effect.die(new Error(message))
      log.warn(message)
      continue
    }
    const parsed: unknown = yield* Effect.try({ try: () => JSON.parse(result.stdout) as unknown, catch: (error) => error }).pipe(Effect.orElseSucceed(() => undefined))
    if (before && isRecord(parsed) && parsed.decision === "block") {
      return yield* Effect.die(new Error(typeof parsed.reason === "string" ? parsed.reason : `Blocked by hook ${hook.id ?? hook.event}`))
    }
    const context = isRecord(parsed) && typeof parsed.context === "string" ? parsed.context : result.stdout.trim()
    if (!context || !isRecord(output)) continue
    if (typeof output.output === "string") output.output += `\n\nHook context (${hook.event}):\n${context}`
    if (Array.isArray(output.system)) output.system.push(context)
    if (typeof output.text === "string") output.text += `\n\n${context}`
  }
})
