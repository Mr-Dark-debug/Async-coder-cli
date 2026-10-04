import { describe, expect, test } from "bun:test"
import { isAlias, isLocal, pick, type Candidate } from "../../src/provider/alias"

const model = (over: Partial<Candidate> & { id: string }): Candidate => ({
  providerID: "p",
  toolcall: true,
  context: 100_000,
  cost: { input: 1, output: 1 },
  local: false,
  ...over,
})

describe("capability aliases", () => {
  test("only the three capability aliases are recognised (tiers stay with model groups)", () => {
    expect(isAlias("cheap")).toBe(true)
    expect(isAlias("local")).toBe(true)
    expect(isAlias("long-context")).toBe(true)
    expect(isAlias("fast")).toBe(false)
    expect(isAlias("ultra")).toBe(false)
  })

  test("cheap picks the lowest-priced tool-capable model", () => {
    const picked = pick("cheap", [
      model({ id: "big", cost: { input: 15, output: 75 } }),
      model({ id: "mid", cost: { input: 3, output: 15 } }),
      model({ id: "tiny", cost: { input: 0.1, output: 0.4 } }),
      model({ id: "cheapest-no-tools", cost: { input: 0, output: 0 }, toolcall: false }),
    ])
    expect(picked?.model.id).toBe("tiny")
    expect(picked?.why).toContain("lowest price")
  })

  test("a free model wins cheap and says so; ties prefer more context", () => {
    const picked = pick("cheap", [model({ id: "a", cost: { input: 0, output: 0 }, context: 8_000 }), model({ id: "b", cost: { input: 0, output: 0 }, context: 128_000 })])
    expect(picked?.model.id).toBe("b")
    expect(picked?.why).toContain("free or local")
  })

  test("deprecated models are never picked", () => {
    expect(pick("cheap", [model({ id: "old", status: "deprecated", cost: { input: 0, output: 0 } }), model({ id: "ok" })])?.model.id).toBe("ok")
  })

  test("local only considers local models and returns nothing when there are none", () => {
    expect(pick("local", [model({ id: "remote" })])).toBeUndefined()
    const picked = pick("local", [model({ id: "small", local: true, context: 8_000 }), model({ id: "large", local: true, context: 32_000 }), model({ id: "remote" })])
    expect(picked?.model.id).toBe("large")
  })

  test("long-context picks the largest tool-capable window, then the cheaper one", () => {
    const picked = pick("long-context", [
      model({ id: "a", context: 1_000_000, cost: { input: 5, output: 5 } }),
      model({ id: "b", context: 1_000_000, cost: { input: 1, output: 1 } }),
      model({ id: "c", context: 2_000_000, toolcall: false }),
    ])
    expect(picked?.model.id).toBe("b")
    expect(picked?.why).toContain("1,000,000")
  })

  test("nothing usable yields undefined rather than guessing", () => {
    expect(pick("cheap", [])).toBeUndefined()
    expect(pick("long-context", [model({ id: "x", toolcall: false })])).toBeUndefined()
  })

  test("local detection by provider id and by loopback base URL", () => {
    expect(isLocal({ providerID: "ollama" })).toBe(true)
    expect(isLocal({ providerID: "custom", baseURL: "http://localhost:1234/v1" })).toBe(true)
    expect(isLocal({ providerID: "custom", baseURL: "http://127.0.0.1:8080" })).toBe(true)
    expect(isLocal({ providerID: "openai", baseURL: "https://api.openai.com/v1" })).toBe(false)
    expect(isLocal({ providerID: "x", baseURL: "http://localhost.evil.com/v1" })).toBe(false)
  })
})
