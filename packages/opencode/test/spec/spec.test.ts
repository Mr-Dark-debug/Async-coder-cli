import { describe, expect, test } from "bun:test"
import { Spec } from "../../src/spec"

const TASKS = [
  "# Implementation Plan",
  "",
  "- [ ] 1 Core model",
  "  - [x] 1.1 Define types",
  "    - _Requirements: 1.1, 1.2_",
  "  - [ ] 1.2 Persistence",
  "    - _Requirements: 2.1_",
  "    - _Depends: 1.1_",
  "  - [ ]* 1.3 Write property tests",
  "- [ ] 2 API",
  "  - [ ] 2.1 Routes",
  "    - _Requirements: 3.1_",
  "    - _Depends: 1.2_",
].join("\n")

describe("spec ordering", () => {
  test("requirements are always writable", () => {
    expect(Spec.canWrite("requirements", new Set())).toEqual({ ok: true })
  })
  test("design needs requirements, tasks need both", () => {
    expect(Spec.canWrite("design", new Set())).toMatchObject({ ok: false })
    expect(Spec.canWrite("design", new Set<Spec.Doc>(["requirements"]))).toEqual({ ok: true })
    const refused = Spec.canWrite("tasks", new Set<Spec.Doc>(["requirements"]))
    expect(refused.ok).toBe(false)
    if (!refused.ok) expect(refused.reason).toContain("design")
  })
  test("spec names are directory-safe", () => {
    expect(Spec.NAME.test("user-auth")).toBe(true)
    for (const bad of ["../x", "A", "a/b", "", "-x", "a".repeat(64)]) expect(Spec.NAME.test(bad)).toBe(false)
  })
})

describe("tasks.md parsing", () => {
  const tasks = Spec.parseTasks(TASKS)
  test("parses ids, depth, done and optional flags", () => {
    expect(tasks.map((task) => task.id)).toEqual(["1", "1.1", "1.2", "1.3", "2", "2.1"])
    expect(tasks.find((task) => task.id === "1.1")).toMatchObject({ done: true, optional: false, depth: 2 })
    expect(tasks.find((task) => task.id === "1.3")?.optional).toBe(true)
    expect(tasks.find((task) => task.id === "1")?.depth).toBe(1)
  })
  test("reads requirement and dependency side lines", () => {
    expect(tasks.find((task) => task.id === "1.1")?.requirements).toEqual(["1.1", "1.2"])
    expect(tasks.find((task) => task.id === "1.2")?.depends).toEqual(["1.1"])
  })
  test("ready skips done, optional, parent and blocked tasks", () => {
    expect(Spec.ready(tasks).map((task) => task.id)).toEqual(["1.2"])
    const after = Spec.parseTasks(Spec.complete(TASKS, "1.2"))
    expect(Spec.ready(after).map((task) => task.id)).toEqual(["2.1"])
  })
  test("progress counts required leaf tasks only", () => {
    expect(Spec.progress(tasks)).toEqual({ done: 1, total: 3 })
  })
  test("complete preserves CRLF and unknown ids are a no-op", () => {
    const crlf = TASKS.replace(/\n/g, "\r\n")
    const out = Spec.complete(crlf, "1.2")
    expect(out).toContain("- [x] 1.2 Persistence")
    expect(out.includes("\r\n")).toBe(true)
    expect(Spec.complete(TASKS, "9.9")).toBe(TASKS)
  })
})

describe("requirement coverage", () => {
  const req = [
    "### Requirement 1",
    "1.1 WHEN a user signs in THEN the system SHALL create a session",
    "### Requirement 2",
    "2.1. WHEN x THEN the system SHALL y",
    "### Requirement 3",
    "3.1 WHEN z THEN the system SHALL w",
    "### Requirement 4",
  ].join("\n")
  test("extracts requirement and criterion ids", () => {
    expect(Spec.requirementIds(req).sort()).toEqual(["1", "1.1", "2", "2.1", "3", "3.1", "4"])
  })
  test("reports ids no task covers", () => {
    const tasks = Spec.parseTasks(TASKS)
    expect(Spec.uncovered(Spec.requirementIds(req), tasks)).toEqual(["4"])
  })
})
