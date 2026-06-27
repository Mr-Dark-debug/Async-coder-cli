import { describe, expect, test } from "bun:test"

const consult = await import("../../src/tool/consult").catch(() => undefined)

describe("consult tool contract", () => {
  test("exports a strict bounded input schema", () => {
    expect(consult).toBeDefined()
    expect(consult!.ConsultParameters.parse({ question: "Which design?", context: "Two options" })).toEqual({
      question: "Which design?",
      context: "Two options",
    })
    expect(() => consult!.ConsultParameters.parse({ question: "q".repeat(2_001), context: "context" })).toThrow()
    expect(() => consult!.ConsultParameters.parse({ question: "question", context: "c".repeat(12_001) })).toThrow()
    expect(() => consult!.ConsultParameters.parse({ question: "question", context: "context", hidden: true })).toThrow()
  })

  test("allows only one consultation for the same assistant message", () => {
    expect(consult).toBeDefined()
    expect(consult!.claimConsultation("session", "message-1")).toBe(true)
    expect(consult!.claimConsultation("session", "message-1")).toBe(false)
    expect(consult!.claimConsultation("session", "message-2")).toBe(true)
    consult!.releaseConsultation("session", "message-2")
    expect(consult!.claimConsultation("session", "message-2")).toBe(true)
  })
})
