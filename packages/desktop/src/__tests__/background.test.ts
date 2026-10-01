import { describe, expect, test } from "bun:test"
import { createBackgroundState } from "../main/background"

describe("desktop background lifecycle", () => {
  test("hides with an available tray but permits explicit quit", () => {
    const state = createBackgroundState()
    expect(state.shouldHide(true)).toBe(true)
    expect(state.shouldHide(false)).toBe(false)
    state.quit()
    expect(state.shouldHide(true)).toBe(false)
  })
  test("counts running sessions across projects, retries and completion", () => {
    const state = createBackgroundState()
    const event = (directory: string, type: string) => ({ directory, payload: { type: "session.status", properties: { sessionID: "session", status: { type } } } })
    state.update(event("one", "busy"))
    state.update(event("one", "retry"))
    state.update(event("two", "busy"))
    expect(state.count).toBe(2)
    state.update({ payload: { type: "server.heartbeat" } })
    expect(state.count).toBe(2)
    state.update(event("one", "idle"))
    expect(state.tooltip).toBe("async-coder · 1 agent running")
    state.update(event("two", "idle"))
    expect(state.tooltip).toBe("async-coder · Ready")
  })
})
