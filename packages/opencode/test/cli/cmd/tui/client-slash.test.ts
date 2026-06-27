import { describe, expect, test } from "bun:test"

const prompt = await import("../../../../src/cli/cmd/tui/component/prompt")
type FindClientSlash = (input: string, slashes: { display: string; onSelect?: () => void }[]) =>
  | { display: string; onSelect?: () => void }
  | undefined
const findClientSlash: FindClientSlash = (input, slashes) => {
  expect("findClientSlash" in prompt).toBe(true)
  return (prompt as typeof prompt & { findClientSlash: FindClientSlash }).findClientSlash(input, slashes)
}

describe("findClientSlash", () => {
  const background = { display: "/background", onSelect: () => undefined }

  test("matches an exact client command with surrounding whitespace", () => {
    expect(findClientSlash("/background  ", [background])).toBe(background)
  })

  test("does not match client commands with arguments", () => {
    expect(findClientSlash("/background image.png", [background])).toBeUndefined()
  })

  test("ignores ordinary prompts", () => {
    expect(findClientSlash("change the background", [background])).toBeUndefined()
  })
})
