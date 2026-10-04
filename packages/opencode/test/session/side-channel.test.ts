import { describe, expect, test } from "bun:test"
import * as SideChannel from "../../src/session/side-channel"

describe("side channel", () => {
  test("drain returns notes oldest first and empties the mailbox", () => {
    SideChannel.push({ sessionID: "s1", text: "first" })
    SideChannel.push({ sessionID: "s1", text: "second", steer: true })
    expect(SideChannel.pending("s1")).toBe(2)
    expect(SideChannel.drain("s1").map((note) => note.text)).toEqual(["first", "second"])
    expect(SideChannel.drain("s1")).toEqual([])
  })

  test("mailboxes are isolated per session and per agent", () => {
    SideChannel.push({ sessionID: "s2", text: "main note" })
    SideChannel.push({ sessionID: "s2", agentID: "explore-1", text: "sub note" })
    expect(SideChannel.drain("s3")).toEqual([])
    expect(SideChannel.drain("s2", "explore-1").map((note) => note.text)).toEqual(["sub note"])
    expect(SideChannel.drain("s2").map((note) => note.text)).toEqual(["main note"])
  })

  test("blank notes are rejected", () => {
    expect(SideChannel.push({ sessionID: "s4", text: "   " })).toBe(false)
    expect(SideChannel.pending("s4")).toBe(0)
  })

  test("render frames steering as a course correction", () => {
    const text = SideChannel.render([
      { text: "use pnpm", steer: false, time: 0 },
      { text: "stop editing tests", steer: true, time: 0 },
    ])
    expect(text).toContain("Side note from the user")
    expect(text).toContain("COURSE CORRECTION from the user (apply it to your next action): stop editing tests")
    expect(text.startsWith("<system-reminder>")).toBe(true)
  })
})
