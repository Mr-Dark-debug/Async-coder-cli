import { describe, expect, test } from "bun:test"
import { Zen } from "../../src/zen"
import type { Provider, ModelsDev } from "../../src/provider"
import { ModelID, ProviderID } from "../../src/provider/schema"

function model(id: string, input = 0, output = 0): Provider.Model {
  return { id: ModelID.make(id), providerID: ProviderID.openrouter, name: id, api: { id, url: "https://openrouter.ai/api/v1", npm: "@openrouter/ai-sdk-provider" }, capabilities: { toolcall: true, temperature: true, reasoning: id.includes("reason"), attachment: false, input: { text: true, image: false, audio: false, video: false, pdf: false }, output: { text: true, image: false, audio: false, video: false, pdf: false }, interleaved: false }, cost: { input, output, cache: { read: 0, write: 0 } }, limit: { context: 128000, output: 8192 }, status: "active", options: {}, headers: {}, release_date: "2026-10-01" }
}
const catalog = { openrouter: { id: "openrouter", name: "OpenRouter", env: ["OPENROUTER_API_KEY"], models: { "coder:free": { id: "coder:free", name: "Coder", release_date: "2026-10-01", attachment: false, reasoning: false, temperature: true, tool_call: true, cost: { input: 0, output: 0 }, limit: { context: 128000, output: 8192 } } } } } satisfies Record<string, ModelsDev.Provider>

describe("Zen model selection", () => {
  test("does not label unknown prices, zero-input paid outputs or deprecated models free", () => {
    expect(Zen.isFree(model("coder:free"), catalog)).toBe(true)
    expect(Zen.isFree(model("unknown"), catalog)).toBe(false)
    expect(Zen.isFree(model("coder:free", 0, 1), catalog)).toBe(false)
    expect(Zen.isFree({ ...model("coder:free"), status: "deprecated" }, catalog)).toBe(false)
  })
  test("routes coding/reasoning/quick tasks and respects context requirements", () => {
    const models = [model("reasoner"), model("coder:free"), model("flash")]
    expect(String(Zen.recommend(models, { task: "coding" })[0].id)).toBe("coder:free")
    expect(String(Zen.recommend(models, { task: "planning" })[0].id)).toBe("reasoner")
    expect(String(Zen.recommend(models, { task: "quick" })[0].id)).toBe("flash")
    expect(Zen.recommend(models, { context: 200000 })).toHaveLength(0)
  })
  test("falls back without inventing availability", () => {
    expect(Zen.route({}, catalog, {})).toBeUndefined()
    expect(String(Zen.route({}, catalog, {}, model("fallback"))?.id)).toBe("fallback")
  })
  test("calculates actual known pricing and rejects invalid estimates", () => {
    expect(Zen.estimate(model("paid", 2, 10), 1000000, 100000)).toBe(3)
    expect(() => Zen.estimate(model("paid"), -1, 2)).toThrow()
    expect(() => Zen.estimate(model("paid"), Infinity, 2)).toThrow()
  })
})
