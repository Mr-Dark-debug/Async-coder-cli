import { describe, expect, test } from "bun:test"
import { Config } from "../../src/config"

describe("advisor config", () => {
  test("parses a model and reasoning variant", () => {
    expect(
      Config.Info.parse({
        advisor: { model: "anthropic/claude-opus", variant: "high" },
      }).advisor,
    ).toEqual({ model: "anthropic/claude-opus", variant: "high" })
  })

  test("allows the model default reasoning variant", () => {
    expect(Config.Info.parse({ advisor: { model: "openai/gpt-5" } }).advisor).toEqual({ model: "openai/gpt-5" })
  })

  test("requires an advisor model", () => {
    expect(() => Config.Info.parse({ advisor: { variant: "high" } })).toThrow()
  })
})
