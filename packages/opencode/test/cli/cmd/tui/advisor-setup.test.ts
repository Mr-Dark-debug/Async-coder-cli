import { describe, expect, test } from "bun:test"

const setup = await import("../../../../src/cli/cmd/tui/component/dialog-advisor-setup").catch(() => undefined)

describe("TUI advisor setup", () => {
  test("intercepts only consult commands when Sage is not configured", () => {
    expect(setup).toBeDefined()
    expect(setup!.needsAdvisorSetup("/consult compare these", undefined)).toBe(true)
    expect(setup!.needsAdvisorSetup("/consult", { model: "openai/gpt-5" })).toBe(false)
    expect(setup!.needsAdvisorSetup("/background", undefined)).toBe(false)
  })

  test("builds a patch without changing the active model", () => {
    expect(setup).toBeDefined()
    expect(setup!.advisorConfig("anthropic", "claude-opus", "high")).toEqual({
      advisor: { model: "anthropic/claude-opus", variant: "high" },
    })
    expect(setup!.advisorConfig("openai", "gpt-5", "default")).toEqual({
      advisor: { model: "openai/gpt-5" },
    })
  })

  test("offers only advertised reasoning variants plus Default", () => {
    expect(setup).toBeDefined()
    expect(setup!.advisorVariantOptions({ high: {}, low: {} })).toEqual(["default", "high", "low"])
    expect(setup!.advisorVariantOptions(undefined)).toEqual(["default"])
  })
})
