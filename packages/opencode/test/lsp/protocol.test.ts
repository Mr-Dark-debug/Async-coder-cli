import { describe, expect } from "bun:test"
import path from "path"
import { Effect, Layer } from "effect"
import { LSP } from "../../src/lsp"
import { discover, installHint } from "../../src/lsp/discovery"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"

const it = testEffect(Layer.mergeAll(LSP.defaultLayer, CrossSpawnSpawner.defaultLayer))
const config = { lsp: { fixture: { command: [process.execPath, path.join(import.meta.dir, "../fixture/lsp/fake-lsp-server.js")], extensions: [".fixture"] } } }

describe("LSP real protocol fixture", () => {
  it.live("collects diagnostics on open and change and provides code intelligence", () => provideTmpdirInstance((dir) => Effect.gen(function* () {
    const file = path.join(dir, "source.fixture")
    yield* Effect.promise(() => Bun.write(file, "BROKEN"))
    const lsp = yield* LSP.Service
    yield* lsp.touchFile(file, true)
    expect((yield* lsp.diagnostics())[file]?.[0]?.message).toBe("Fixture syntax error")
    expect(yield* lsp.hover({ file, line: 0, character: 1 })).toMatchObject([{ contents: { value: "Fixture hover" } }])
    expect(yield* lsp.definition({ file, line: 0, character: 1 })).toHaveLength(1)
    expect(yield* lsp.references({ file, line: 0, character: 1 })).toHaveLength(1)
    expect((yield* lsp.workspaceSymbol("searched"))[0]?.name).toBe("searched")
    yield* Effect.promise(() => Bun.write(file, "FIXED"))
    yield* lsp.touchFile(file, true)
    expect((yield* lsp.diagnostics())[file]).toEqual([])
  }), { config }))

  it.live("discovers local executables and provides missing-server installation hints", () => provideTmpdirInstance((dir) => Effect.gen(function* () {
    const file = path.join(dir, "node_modules", ".bin", process.platform === "win32" ? "pyright-langserver.cmd" : "pyright-langserver")
    yield* Effect.promise(async () => {
      await Bun.write(file, process.platform === "win32" ? "@echo off\r\nexit /b 0" : "#!/bin/sh\nexit 0\n")
      if (process.platform !== "win32") await (await import("node:fs/promises")).chmod(file, 0o755)
    })
    const found = discover(dir).find((server) => server.id === "pyright")?.command
    expect(process.platform === "win32" ? found?.toLowerCase() : found).toBe(process.platform === "win32" ? file.toLowerCase() : file)
    expect(installHint("example.rs")).toContain("rustup component add rust-analyzer")
    expect(installHint("example.py")).toContain("pip install python-lsp-server")
  })))
})
