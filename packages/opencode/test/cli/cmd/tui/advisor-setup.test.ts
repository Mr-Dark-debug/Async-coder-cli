import { describe, expect, test } from "bun:test"

const setup = await import("../../../../src/cli/cmd/tui/component/dialog-advisor-setup").catch(() => undefined)
const provider = await import("../../../../src/cli/cmd/tui/component/dialog-provider").catch(() => undefined)

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

  test("lists every enabled provider with its connection status", () => {
    expect(
      setup!.advisorProviderOptions(
        [
          { id: "openai", name: "OpenAI" },
          { id: "groq", name: "Groq" },
        ],
        ["openai"],
      ),
    ).toEqual([
      { id: "openai", name: "OpenAI", status: "connected" },
      { id: "groq", name: "Groq", status: "setup_required" },
    ])
  })

  test("resumes model selection after setup and returns to providers on cancel", () => {
    expect(setup!.advisorResume("groq", "connected")).toEqual({ providerID: "groq", step: "model" })
    expect(setup!.advisorResume("groq", "cancelled")).toEqual({ step: "provider" })
  })

  test("uses the sanitized discovery message for provider setup errors", () => {
    expect(provider).toBeDefined()
    expect(provider!.providerSetupError({ message: "The provider rejected this API key." })).toBe(
      "The provider rejected this API key.",
    )
    expect(provider!.providerSetupError({ data: { message: "Invalid API key. Check the key and try again." } })).toBe(
      "Invalid API key. Check the key and try again.",
    )
    expect(provider!.providerSetupError(undefined)).toBe(
      "Could not verify this provider. Check your key and try again.",
    )
  })

  test("validates candidate keys only for a Sage destination", () => {
    expect(provider!.providerDestination()).toBeUndefined()
    expect(provider!.shouldDiscoverProvider(provider!.providerDestination())).toBe(false)
    expect(provider!.shouldDiscoverProvider(provider!.providerDestination({ onConnected() {} }))).toBe(true)
  })

  test("omits unrelated provider actions when setup is scoped", () => {
    expect(provider!.showProviderExtras()).toBe(true)
    expect(provider!.showProviderExtras("groq")).toBe(false)
  })

  test("keeps a hidden provider when Sage explicitly scopes it", () => {
    expect(provider!.showInferenceProvider("opencode")).toBe(false)
    expect(provider!.showInferenceProvider("opencode", "opencode")).toBe(true)
    expect(provider!.showInferenceProvider("groq")).toBe(true)
  })

  test("provides an Ollama preset and maps discovered models into the wizard", () => {
    expect(setup!.advisorOllamaPreset()).toEqual({
      providerID: "ollama",
      name: "Ollama",
      baseURL: "http://localhost:11434/v1",
    })
    expect(provider!.discoveredModelIDs({ models: [{ id: "qwen3:8b" }, { id: "llama3.2:3b" }] })).toBe(
      "qwen3:8b, llama3.2:3b",
    )
  })

  test("returns Sage setup failures to the provider picker without changing normal connect", () => {
    expect(provider!.cancelProviderFailure()).toBe(false)
    expect(provider!.cancelProviderFailure({ onCancel() {} })).toBe(true)
  })
})
