import { describe, expect, test } from "bun:test"
import * as LLM from "../../src/session/llm"

describe("Sage system instruction", () => {
  test("is present only for configured working agents", () => {
    expect("advisorSystemInstruction" in LLM).toBe(true)
    const instruction = (
      LLM as typeof LLM & {
        advisorSystemInstruction: (
          advisor: { model: string } | undefined,
          agent: string,
          mode?: "primary" | "subagent" | "all",
        ) => string | undefined
      }
    ).advisorSystemInstruction
    expect(instruction({ model: "anthropic/claude" }, "build")).toContain("consult")
    expect(instruction(undefined, "build")).toBeUndefined()
    expect(instruction({ model: "anthropic/claude" }, "advisor")).toBeUndefined()
    expect(instruction({ model: "anthropic/claude" }, "explore", "subagent")).toBeUndefined()
  })
})
