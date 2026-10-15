import { describe, expect, test } from "bun:test"
import path from "path"
import { Effect } from "effect"
import * as Steering from "../../src/session/steering"
import { Instruction } from "../../src/session/instruction"
import { Instance } from "../../src/project/instance"
import { MessageID } from "../../src/session/schema"
import { tmpdir } from "../fixture/fixture"

const run = <A>(effect: Effect.Effect<A, any, Instruction.Service>) =>
  Effect.runPromise(effect.pipe(Effect.provide(Instruction.defaultLayer)))

describe("steering frontmatter", () => {
  test("defaults to always and tolerates broken frontmatter", () => {
    expect(Steering.parse("# Standards\nuse tabs")).toEqual({ inclusion: "always", patterns: [] })
    expect(Steering.parse("---\ninclusion: [oops\n---\nbody").inclusion).toBe("always")
    expect(Steering.parse("---\ninclusion: sometimes\n---\nbody").inclusion).toBe("always")
  })

  test("reads inclusion and single or list patterns", () => {
    expect(Steering.parse('---\ninclusion: fileMatch\nfileMatchPattern: "src/api/**/*.ts"\n---\nx')).toEqual({
      inclusion: "fileMatch",
      patterns: ["src/api/**/*.ts"],
    })
    expect(Steering.parse("---\ninclusion: fileMatch\nfileMatchPattern:\n  - '*.md'\n  - docs/**\n---\nx").patterns).toEqual(["*.md", "docs/**"])
    expect(Steering.parse("---\ninclusion: manual\n---\nx").inclusion).toBe("manual")
  })

  test("only fileMatch rules apply to a path", () => {
    const rule = Steering.parse('---\ninclusion: fileMatch\nfileMatchPattern: "src/api/**/*.ts"\n---\nx')
    expect(Steering.applies(rule, "src/api/users/get.ts")).toBe(true)
    expect(Steering.applies(rule, "src/web/app.ts")).toBe(false)
    expect(Steering.applies({ inclusion: "always", patterns: ["**"] }, "a.ts")).toBe(false)
  })

  test("body strips frontmatter", () => {
    expect(Steering.body("---\ninclusion: always\n---\n\nUse tabs.\n")).toBe("Use tabs.")
  })
})

describe("steering in instruction assembly", () => {
  test("always joins the system prompt, fileMatch attaches on read, manual never does", async () => {
    await using tmp = await tmpdir({
      init: async (dir) => {
        const steering = path.join(dir, ".async-coder", "steering")
        await Bun.write(path.join(steering, "standards.md"), "# Standards\nAlways write tests.")
        await Bun.write(path.join(steering, "api.md"), '---\ninclusion: fileMatch\nfileMatchPattern: "src/api/**/*.ts"\n---\nAPI routes return problem+json.')
        await Bun.write(path.join(steering, "secret.md"), "---\ninclusion: manual\n---\nOnly when mentioned.")
        await Bun.write(path.join(dir, "src", "api", "users.ts"), "export {}")
        await Bun.write(path.join(dir, "src", "web", "app.ts"), "export {}")
      },
    })
    await Instance.provide({
      directory: tmp.path,
      fn: () =>
        run(
          Instruction.Service.use((svc) =>
            Effect.gen(function* () {
              const system = yield* svc.systemPaths()
              const steering = path.join(tmp.path, ".async-coder", "steering")
              expect(system.has(path.join(steering, "standards.md"))).toBe(true)
              expect(system.has(path.join(steering, "api.md"))).toBe(false)
              expect(system.has(path.join(steering, "secret.md"))).toBe(false)

              const api = yield* svc.resolve([], path.join(tmp.path, "src", "api", "users.ts"), MessageID.make("message-steer-1"))
              expect(api).toHaveLength(1)
              expect(api[0].content).toContain("API routes return problem+json.")
              expect(api[0].content).not.toContain("inclusion:")

              // claimed once per message
              const again = yield* svc.resolve([], path.join(tmp.path, "src", "api", "users.ts"), MessageID.make("message-steer-1"))
              expect(again).toHaveLength(0)

              const web = yield* svc.resolve([], path.join(tmp.path, "src", "web", "app.ts"), MessageID.make("message-steer-2"))
              expect(web).toHaveLength(0)
            }),
          ),
        ),
    })
  })
})
