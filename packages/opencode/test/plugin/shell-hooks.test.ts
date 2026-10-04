import { describe, expect } from "bun:test"
import { Effect } from "effect"
import path from "path"
import { events, matches, run } from "../../src/plugin/shell-hooks"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"

const it = testEffect(CrossSpawnSpawner.defaultLayer)

describe("shell lifecycle hooks", () => {
  it.live("runs a real shell command with structured input and appends returned context", () => provideTmpdirInstance((dir) => Effect.gen(function* () {
    yield* Effect.promise(() => Bun.write(path.join(dir, "hook.ts"), 'await Bun.write("observed.json", process.env.ASYNC_CODER_HOOK_INPUT!); console.log(JSON.stringify({context:"verified fixture context"}))'))
    const output = { output: "tool result" }
    yield* run([{ event: "post_command", command: 'bun hook.ts', condition: "tool === 'bash'" }], "tool.execute.after", { tool: "bash", sessionID: "fixture" }, output)
    expect(yield* Effect.promise(() => Bun.file(path.join(dir, "observed.json")).json())).toEqual({ tool: "bash", sessionID: "fixture" })
    expect(output.output).toContain("Hook context (post_command):\nverified fixture context")
  })))

  it.live("blocks pre-tool execution on structured hook decision", () => provideTmpdirInstance((dir) => Effect.gen(function* () {
    yield* Effect.promise(() => Bun.write(path.join(dir, "hook.ts"), 'console.log(JSON.stringify({decision:"block",reason:"fixture block reason"}))'))
    const result = yield* run([{ event: "pre_file_edit", command: "bun hook.ts" }], "tool.execute.before", { tool: "write" }).pipe(Effect.exit)
    expect(result._tag).toBe("Failure")
    if (result._tag === "Failure") expect(String(result.cause)).toContain("fixture block reason")
  })))

  it.live("passes file paths and tool arguments to edit hooks before and after execution", () => provideTmpdirInstance((dir) => Effect.gen(function* () {
    yield* Effect.promise(() => Bun.write(path.join(dir, "arguments.ts"), 'await Bun.write("arguments.json", JSON.stringify({file:process.env.FILE_PATH,args:JSON.parse(process.env.TOOL_INPUT!)}))'))
    const args = { filePath: path.join(dir, "example.ts"), content: "fixture" }
    yield* run([{ event: "pre_file_edit", command: "bun arguments.ts" }], "tool.execute.before", { tool: "write" }, { args })
    expect(yield* Effect.promise(() => Bun.file(path.join(dir, "arguments.json")).json())).toEqual({ file: args.filePath, args })
    yield* run([{ event: "post_file_edit", command: "bun arguments.ts" }], "tool.execute.after", { tool: "write", args }, { output: "done" })
    expect(yield* Effect.promise(() => Bun.file(path.join(dir, "arguments.json")).json())).toEqual({ file: args.filePath, args })
    expect(events("actor.status", { status: "running" })).toEqual(["agent_start"])
    expect(events("actor.status", { status: "idle", lastOutcome: "failure" })).toEqual(["agent_end", "error"])
  })))

  it.live("kills timed-out pre-command hooks and fails closed", () => provideTmpdirInstance((dir) => Effect.gen(function* () {
    yield* Effect.promise(() => Bun.write(path.join(dir, "wait.ts"), "await Bun.sleep(30000)"))
    const start = Date.now()
    const result = yield* run([{ event: "pre_command", command: "bun wait.ts", timeout: 600 }], "tool.execute.before", { tool: "bash" }).pipe(Effect.exit)
    expect(result._tag).toBe("Failure")
    expect(Date.now() - start).toBeLessThan(6000)
  })))

  it.live("skips unmatched conditions without evaluating arbitrary code", () => provideTmpdirInstance(() => Effect.gen(function* () {
    expect(matches("tool === 'bash'", { tool: "bash" })).toBe(true)
    expect(matches("tool !== 'bash'", { tool: "write" })).toBe(true)
    expect(matches("process.exit(1)", { tool: "bash" })).toBe(false)
    expect(events("tool.execute.before", { tool: "edit" })).toEqual(["pre_tool_use", "pre_file_edit"])
    yield* run([{ event: "pre_command", command: "exit 2", condition: "tool === 'write'" }], "tool.execute.before", { tool: "bash" })
  })))
})
