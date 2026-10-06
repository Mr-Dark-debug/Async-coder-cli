import { describe, expect, spyOn, test } from "bun:test"
import { matches, next, parse } from "../../src/routines/cron"
import { Routines } from "../../src/routines"
import { Instance } from "../../src/project/instance"
import { tmpdir } from "../fixture/fixture"

const at = (y: number, mo: number, d: number, h: number, mi: number) => new Date(y, mo - 1, d, h, mi)

describe("cron", () => {
  test("every minute and fixed times", () => {
    expect(matches(parse("* * * * *"), at(2026, 10, 4, 13, 7))).toBe(true)
    const nightly = parse("0 3 * * *")
    expect(matches(nightly, at(2026, 10, 4, 3, 0))).toBe(true)
    expect(matches(nightly, at(2026, 10, 4, 3, 1))).toBe(false)
    expect(matches(nightly, at(2026, 10, 4, 4, 0))).toBe(false)
  })

  test("lists, ranges and steps", () => {
    const cron = parse("*/15 9-17 * * 1-5")
    expect(cron.minute).toEqual([0, 15, 30, 45])
    expect(cron.hour).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17])
    // 2026-10-05 is a Monday, 2026-10-04 a Sunday
    expect(matches(cron, at(2026, 10, 5, 9, 30))).toBe(true)
    expect(matches(cron, at(2026, 10, 4, 9, 30))).toBe(false)
    expect(parse("0,30 * * * *").minute).toEqual([0, 30])
    expect(parse("5/20 * * * *").minute).toEqual([5, 25, 45])
  })

  test("7 means Sunday as well as 0", () => {
    expect(parse("0 0 * * 7").dow).toEqual([0])
    expect(matches(parse("0 0 * * 7"), at(2026, 10, 4, 0, 0))).toBe(true)
  })

  test("when both day fields are restricted either may match", () => {
    const cron = parse("0 0 13 * 5") // the 13th OR any Friday
    expect(matches(cron, at(2026, 10, 13, 0, 0))).toBe(true) // Tuesday the 13th
    expect(matches(cron, at(2026, 10, 9, 0, 0))).toBe(true) // a Friday
    expect(matches(cron, at(2026, 10, 8, 0, 0))).toBe(false)
  })

  test("rejects malformed expressions", () => {
    expect(() => parse("* * * *")).toThrow("5 fields")
    expect(() => parse("60 * * * *")).toThrow("Invalid minute")
    expect(() => parse("* 24 * * *")).toThrow("Invalid hour")
    expect(() => parse("*/0 * * * *")).toThrow("Invalid step")
    expect(() => parse("5-1 * * * *")).toThrow("Invalid minute")
    expect(() => parse("a * * * *")).toThrow("Invalid minute")
  })

  test("next finds the following firing, across a day boundary", () => {
    expect(next(parse("30 2 * * *"), at(2026, 10, 4, 3, 0))).toEqual(at(2026, 10, 5, 2, 30))
    expect(next(parse("*/10 * * * *"), at(2026, 10, 4, 3, 7))).toEqual(at(2026, 10, 4, 3, 10))
    expect(next(parse("0 0 31 2 *"), at(2026, 1, 1, 0, 0))).toBeUndefined()
  })
})

describe("routine scheduling", () => {
  const routines = {
    nightly: { cron: "0 3 * * *", prompt: "audit deps" },
    paused: { cron: "* * * * *", prompt: "x", enabled: false },
    broken: { cron: "nope", prompt: "x" },
  }

  test("only matching, enabled, valid routines are due", () => {
    expect(Routines.due(routines, at(2026, 10, 4, 3, 0), new Map())).toEqual(["nightly"])
    expect(Routines.due(routines, at(2026, 10, 4, 3, 1), new Map())).toEqual([])
  })

  test("a routine fires at most once per minute", () => {
    const fired = new Map<string, number>()
    expect(Routines.due(routines, at(2026, 10, 4, 3, 0), fired)).toEqual(["nightly"])
    // the scheduler ticks several times inside the same minute
    expect(Routines.due(routines, new Date(at(2026, 10, 4, 3, 0).getTime() + 30_000), fired)).toEqual([])
    // and fires again the next day
    expect(Routines.due(routines, at(2026, 10, 5, 3, 0), fired)).toEqual(["nightly"])
  })

  test("problems reports bad schedules", () => {
    expect(Routines.problems(routines)).toEqual([expect.stringContaining("broken")])
    expect(Routines.problems(undefined)).toEqual([])
  })

  test("disposing an instance clears its real scheduler timer", async () => {
    await using dir = await tmpdir({
      config: { routines: { fixture: { cron: "* * * * *", prompt: "fixture", worktree: false } } },
    })
    const clear = spyOn(globalThis, "clearInterval")
    try {
      await Instance.provide({
        directory: dir.path,
        fn: async () => {
          await Routines.arm()
          const before = clear.mock.calls.length
          await Instance.dispose()
          expect(clear.mock.calls.length).toBeGreaterThan(before)
          const after = clear.mock.calls.length
          Routines.disarm(dir.path)
          expect(clear.mock.calls.length).toBe(after)
        },
      })
    } finally {
      clear.mockRestore()
    }
  })
})
