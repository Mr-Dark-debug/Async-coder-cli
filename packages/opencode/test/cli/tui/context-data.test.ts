import { describe, expect, test } from "bun:test"
import { bar, breakdown, estimate, level, turnsLeft, used } from "../../../src/cli/cmd/tui/feature-plugins/sidebar/context-data"

const user = { id: "u1", role: "user" } as any
const assistant = { id: "a1", role: "assistant" } as any

describe("context inspector data", () => {
  test("used prefers the provider total", () => {
    expect(used({ total: 90, input: 1, output: 1, reasoning: 0, cache: { read: 0, write: 0 } })).toBe(90)
    expect(used({ input: 10, output: 5, reasoning: 2, cache: { read: 3, write: 1 } } as any)).toBe(21)
  })

  test("breakdown attributes parts and leaves the remainder to the system slice", () => {
    const parts: Record<string, any[]> = {
      u1: [{ type: "text", text: "x".repeat(400) }],
      a1: [
        { type: "text", text: "y".repeat(200) },
        { type: "reasoning", text: "z".repeat(80) },
        { type: "tool", state: { status: "completed", output: "o".repeat(800), input: {} } },
      ],
    }
    const slices = breakdown({ total: 1000, messages: [user, assistant], parts: (id) => parts[id] ?? [] })
    const by = Object.fromEntries(slices.map((slice) => [slice.key, slice.tokens]))
    expect(by.user).toBe(100)
    expect(by.assistant).toBe(50)
    expect(by.reasoning).toBe(20)
    expect(by.tools).toBe(200 + estimate("{}"))
    expect(slices.reduce((total, slice) => total + slice.tokens, 0)).toBe(1000)
  })

  test("system slice never goes negative when estimates exceed the reported total", () => {
    const slices = breakdown({ total: 1, messages: [user], parts: () => [{ type: "text", text: "x".repeat(4000) } as any] })
    expect(slices[0].tokens).toBe(0)
  })

  test("level thresholds", () => {
    expect([level(10), level(70), level(84), level(85), level(99)]).toEqual(["ok", "warn", "warn", "danger", "danger"])
  })

  test("turnsLeft projects from average growth", () => {
    expect(turnsLeft([100], 1000)).toBeUndefined()
    expect(turnsLeft([100, 100], 1000)).toBeUndefined()
    expect(turnsLeft([100, 200, 300], 1000)).toBe(7)
    expect(turnsLeft([100, 900], 500)).toBe(0)
  })

  test("bar scales and keeps tiny non-zero slices visible", () => {
    expect(bar(50, 100, 10)).toBe("█████")
    expect(bar(1, 10_000, 10)).toBe("█")
    expect(bar(0, 100)).toBe("")
  })
})
