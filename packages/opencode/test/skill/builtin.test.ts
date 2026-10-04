import { describe, expect } from "bun:test"
import path from "path"
import { Effect, Layer } from "effect"
import { Skill } from "../../src/skill"
import { Command } from "../../src/command"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"

const it = testEffect(Layer.mergeAll(Skill.defaultLayer, Command.defaultLayer, CrossSpawnSpawner.defaultLayer))

describe("bundled skills", () => {
  it.live("loads standard workflows and lets project skills override a built-in", () => provideTmpdirInstance((dir) => Effect.gen(function* () {
    const previous = process.env.ASYNC_CODER_DISABLE_COMPOSE_SKILLS
    process.env.ASYNC_CODER_DISABLE_COMPOSE_SKILLS = "false"
    yield* Effect.addFinalizer(() => Effect.sync(() => {
      if (previous === undefined) delete process.env.ASYNC_CODER_DISABLE_COMPOSE_SKILLS
      else process.env.ASYNC_CODER_DISABLE_COMPOSE_SKILLS = previous
    }))
    yield* Effect.promise(() => Bun.write(path.join(dir, ".async-coder", "skills", "code-review", "SKILL.md"), "---\nname: code-review\ndescription: Project review override\ntools: [read, lsp]\nmodel: test/review-model\ntriggers: [review changes]\n---\nProject-specific review rules."))
    const skills = yield* Skill.Service
    const names = (yield* skills.all()).map((skill) => skill.name)
    for (const name of ["commit-message", "code-review", "write-tests", "explain-code", "refactor", "debug"]) expect(names).toContain(name)
    expect((yield* skills.get("code-review"))?.content.trim()).toBe("Project-specific review rules.")
    expect(yield* skills.get("code-review")).toMatchObject({ tools: ["read", "lsp"], model: "test/review-model", triggers: ["review changes"] })
    const commands = yield* Command.Service
    expect((yield* commands.get("code-review"))?.model).toBe("test/review-model")
    expect((yield* skills.get("code-review"))?.location).toBe(path.join(dir, ".async-coder", "skills", "code-review", "SKILL.md"))
  })))
})
