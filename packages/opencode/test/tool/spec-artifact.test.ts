import { afterEach, describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import path from "path"
import fs from "fs/promises"
import { SpecTool } from "../../src/tool/spec"
import { ArtifactTool } from "../../src/tool/artifact"
import { Instance } from "../../src/project/instance"
import { SessionID, MessageID } from "../../src/session/schema"
import { Tool, Truncate } from "../../src/tool"
import { Agent } from "../../src/agent/agent"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const ctx = {
  sessionID: SessionID.make("ses_test-spec-artifact"),
  messageID: MessageID.make(""),
  callID: "",
  agent: "build",
  abort: AbortSignal.any([]),
  messages: [],
  metadata: () => Effect.void,
  ask: () => Effect.void,
}

afterEach(async () => {
  await Instance.disposeAll()
})

const it = testEffect(Layer.mergeAll(CrossSpawnSpawner.defaultLayer, Truncate.defaultLayer, Agent.defaultLayer))

const spec = Effect.fn("SpecToolTest.run")(function* (args: Tool.InferParameters<typeof SpecTool>) {
  const tool = yield* (yield* SpecTool).init()
  return yield* tool.execute(args, ctx)
})
const artifact = Effect.fn("ArtifactToolTest.run")(function* (args: Tool.InferParameters<typeof ArtifactTool>) {
  const tool = yield* (yield* ArtifactTool).init()
  return yield* tool.execute(args, ctx)
})

const TASKS = "- [ ] 1 Build\n  - [ ] 1.1 Model\n    - _Requirements: 1.1_\n  - [ ] 1.2 API\n    - _Depends: 1.1_\n"

describe("tool.spec", () => {
  it.live("enforces document order and tracks task progress", () =>
    provideTmpdirInstance((dir) =>
      Effect.gen(function* () {
        const early = yield* spec({ operation: "write", name: "auth", doc: "design", content: "# design" })
        expect(early.output).toContain("Write requirements first")
        const designPath = path.join(dir, ".async-coder/specs/auth/design.md")
        expect(yield* Effect.promise(() => fs.access(designPath).then(() => true, () => false))).toBe(false)

        yield* spec({ operation: "write", name: "auth", doc: "requirements", content: "### Requirement 1\n1.1 WHEN a THEN the system SHALL b" })
        yield* spec({ operation: "write", name: "auth", doc: "design", content: "# design" })
        const tasks = yield* spec({ operation: "write", name: "auth", doc: "tasks", content: TASKS })
        expect(tasks.output).toContain("Parsed 3 tasks")

        const ready = yield* spec({ operation: "ready", name: "auth" })
        expect(ready.output).toContain("1.1 Model")
        expect(ready.output).not.toContain("1.2")

        const blocked = yield* spec({ operation: "complete", name: "auth", task_id: "1.2" })
        expect(blocked.output).toContain("depends on unfinished tasks: 1.1")
        yield* spec({ operation: "complete", name: "auth", task_id: "1.1" })
        const progress = yield* spec({ operation: "tasks", name: "auth" })
        expect(progress.output).toContain("1/2 required tasks done")
        expect(yield* Effect.promise(() => Bun.file(path.join(dir, ".async-coder/specs/auth/tasks.md")).text())).toContain("- [x] 1.1 Model")

        expect((yield* spec({ operation: "list" })).output).toContain("auth: requirements, design, tasks (1/2 tasks done)")
      }),
    ),
  )

  it.live("rejects names that could escape the specs directory", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const out = yield* spec({ operation: "write", name: "../evil", doc: "requirements", content: "x" })
        expect(out.metadata).toMatchObject({ error: true })
      }),
    ),
  )
})

describe("tool.artifact", () => {
  it.live("keeps revisions and resets review on each write", () =>
    provideTmpdirInstance((dir) =>
      Effect.gen(function* () {
        yield* artifact({ operation: "write", name: "implementation_plan", content: "# v1", summary: "first" })
        const second = yield* artifact({ operation: "write", name: "implementation_plan", content: "# v2", summary: "second" })
        expect(second.metadata).toMatchObject({ revision: 2, review: "pending" })
        const base = path.join(dir, ".async-coder/artifacts", ctx.sessionID)
        expect(yield* Effect.promise(() => Bun.file(path.join(base, "implementation_plan.rev.1.md")).text())).toBe("# v1")
        expect((yield* artifact({ operation: "read", name: "implementation_plan" })).output).toBe("# v2")
        expect((yield* artifact({ operation: "list" })).output).toContain("implementation_plan (rev 2")
      }),
    ),
  )
})
