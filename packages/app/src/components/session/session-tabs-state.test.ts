import { describe, expect, test } from "bun:test"
import { closeSessionTab, openSessionTab } from "./session-tabs-state"

describe("session tabs", () => {
  test("opens independent sessions once and preserves order when switching", () => {
    const tabs = openSessionTab(openSessionTab([], "one"), "two")
    expect(openSessionTab(tabs, "one")).toEqual(["one", "two"])
    expect(tabs).toEqual(["one", "two"])
  })
  test("closing the active session selects its neighbour without deleting the session", () => {
    expect(closeSessionTab(["one", "two", "three"], "two", "two")).toEqual({ tabs: ["one", "three"], active: "one" })
    expect(closeSessionTab(["one", "two"], "one", "one").active).toBe("two")
    expect(closeSessionTab(["one"], "one", "one").active).toBeUndefined()
    expect(closeSessionTab(["one", "two"], "two", "one").active).toBe("one")
  })
})
