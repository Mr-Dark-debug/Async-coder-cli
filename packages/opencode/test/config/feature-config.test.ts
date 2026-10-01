import { describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import path from "path"
import { Config } from "../../src/config"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"

const it = testEffect(Layer.mergeAll(Config.defaultLayer, CrossSpawnSpawner.defaultLayer))

describe("feature configuration", () => {
  it.live("normalizes mcpServers while preserving native entries", () => provideTmpdirInstance(() => Effect.gen(function* () {
    const config = yield* Config.Service
    const value = yield* config.get()
    expect(value.mcp?.local).toEqual({ type: "local", command: ["bun", "server.ts"], environment: { TOKEN: "fixture" }, enabled: false, timeout: 1200 })
    expect(value.mcp?.remote).toEqual({ type: "remote", url: "http://localhost:9000/sse", transport: "sse", enabled: true })
    expect(value.mcp?.collision).toEqual({ type: "local", command: ["native"], enabled: false })
  }), { config: {
    mcpServers: {
      local: { command: "bun", args: ["server.ts"], env: { TOKEN: "fixture" }, autoStart: false, timeout: 1200 },
      remote: { url: "http://localhost:9000/sse", transport: "sse" },
      collision: { command: "alias" },
    },
    mcp: { collision: { type: "local", command: ["native"], enabled: false } },
  } }))

  it.live("loads project standalone MCP and lifecycle hook files", () => provideTmpdirInstance((dir) => Effect.gen(function* () {
    yield* Effect.promise(() => Promise.all([
      Bun.write(path.join(dir, ".async-coder", "mcp.json"), JSON.stringify({ fixture: { command: "bun", args: ["fixture.ts"] } })),
      Bun.write(path.join(dir, ".async-coder", "hooks.json"), JSON.stringify({ hooks: [{ event: "pre_command", command: "echo fixture", condition: "tool === 'bash'", timeout: 1000 }] })),
      Bun.write(path.join(dir, "async-coder.json"), JSON.stringify({ checkpoints: { enabled: false, retention: 3 } })),
    ]))
    const config = yield* Config.Service
    const value = yield* config.get()
    expect(value.mcp?.fixture).toEqual({ type: "local", command: ["bun", "fixture.ts"], enabled: true })
    expect(value.hooks).toEqual([{ event: "pre_command", command: "echo fixture", condition: "tool === 'bash'", timeout: 1000 }])
    expect(value.checkpoints).toEqual({ enabled: false, retention: 3 })
  })))
})
