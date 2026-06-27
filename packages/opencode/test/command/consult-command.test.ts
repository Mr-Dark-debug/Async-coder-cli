import { describe, expect, test } from "bun:test"
import { Command } from "../../src/command"

describe("/consult command", () => {
  test("has a stable built-in name", () => {
    expect((Command.Default as Record<string, string>).CONSULT).toBe("consult")
  })

  test("requires one consultation and preserves user arguments", () => {
    expect("consultTemplate" in Command).toBe(true)
    const template = (Command as typeof Command & { consultTemplate: () => string }).consultTemplate()
    expect(template).toContain("$ARGUMENTS")
    expect(template).toContain("exactly once")
  })
})
