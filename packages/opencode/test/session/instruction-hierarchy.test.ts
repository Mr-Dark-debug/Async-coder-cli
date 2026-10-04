import { describe, expect } from "bun:test"
import path from "path"
import { Effect, Layer } from "effect"
import { Instruction } from "../../src/session/instruction"
import { MessageID } from "../../src/session/schema"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"

const it = testEffect(Layer.mergeAll(Instruction.defaultLayer, CrossSpawnSpawner.defaultLayer))

describe("instruction hierarchy", () => {
  it.live("loads project instructions and local overrides in order and attaches nested guidance", () => provideTmpdirInstance((dir) => Effect.gen(function* () {
    yield* Effect.promise(() => Promise.all([
      Bun.write(path.join(dir, "AGENTS.md"), "Root guidance"),
      Bun.write(path.join(dir, ".async-coder", "AGENTS.md"), "Project guidance"),
      Bun.write(path.join(dir, ".async-coder", "AGENTS.local.md"), "Local override"),
      Bun.write(path.join(dir, "src", "AGENTS.md"), "Directory guidance"),
      Bun.write(path.join(dir, "src", "nested", "AGENTS.md"), "Nested override"),
      Bun.write(path.join(dir, "src", "nested", "file.ts"), "export {}"),
    ]))
    const instruction = yield* Instruction.Service
    const system = yield* instruction.system()
    const paths = [...system.paths]
    expect(paths.indexOf(path.join(dir, ".async-coder", "AGENTS.local.md"))).toBeGreaterThan(paths.indexOf(path.join(dir, ".async-coder", "AGENTS.md")))
    expect(system.content.join("\n")).toContain("Project guidance")
    expect(system.content.join("\n")).toContain("Local override")
    const nested = yield* instruction.resolve([], path.join(dir, "src", "nested", "file.ts"), MessageID.make("hierarchy"))
    expect(nested.map((entry) => entry.filepath)).toEqual([path.join(dir, "src", "AGENTS.md"), path.join(dir, "src", "nested", "AGENTS.md")])
    expect(yield* instruction.resolve([], path.join(dir, "src", "nested", "file.ts"), MessageID.make("hierarchy"))).toEqual([])
  })))
})
