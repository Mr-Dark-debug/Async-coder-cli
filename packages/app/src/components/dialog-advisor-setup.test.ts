import { describe, expect, test } from "bun:test"

const setup = await import("./dialog-advisor-setup-state").catch(() => undefined)

describe("desktop advisor setup", () => {
  test("detects first-use consult commands", () => {
    expect(setup).toBeDefined()
    expect(setup!.needsAdvisorSetup("/consult review this", undefined)).toBe(true)
    expect(setup!.needsAdvisorSetup("/consult", { model: "openai/gpt-5" })).toBe(false)
    expect(setup!.needsAdvisorSetup("normal prompt", undefined)).toBe(false)
  })

  test("creates the global config patch", () => {
    expect(setup).toBeDefined()
    expect(setup!.advisorConfig("anthropic", "claude-opus", "high")).toEqual({
      advisor: { model: "anthropic/claude-opus", variant: "high" },
    })
    expect(setup!.advisorConfig("openai", "gpt-5", "default")).toEqual({
      advisor: { model: "openai/gpt-5" },
    })
  })

  test("limits reasoning choices to model variants", () => {
    expect(setup).toBeDefined()
    expect(setup!.advisorVariantOptions({ medium: {}, high: {} })).toEqual(["default", "high", "medium"])
    expect(setup!.advisorVariantOptions(undefined)).toEqual(["default"])
  })
})
