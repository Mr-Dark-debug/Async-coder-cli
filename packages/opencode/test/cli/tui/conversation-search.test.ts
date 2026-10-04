import { describe, expect, test } from "bun:test"
import type { Message, Part, Provider } from "@async-coder/sdk/v2"
import { conversationSearch } from "../../../src/cli/cmd/tui/util/conversation-search"
import { modelFooter } from "../../../src/cli/cmd/tui/util/model"
import { ConfigKeybinds } from "../../../src/config/keybinds"
import { parseFeatureCommand } from "../../../src/cli/cmd/tui/util/feature-command"

describe("conversation search", () => {
  const messages = [{ id: "one", role: "user" }, { id: "two", role: "assistant" }] as Message[]
  const parts = {
    one: [ { type: "text", text: "Find Unicode λ and a regression" }, { type: "text", text: "hidden secret", synthetic: true }, { type: "text", text: "ignored secret", ignored: true } ],
    two: [ { type: "tool", state: { status: "completed", output: "Regression test passed" } }, { type: "tool", state: { status: "error", error: "Missing compiler" } }, { type: "tool", state: { status: "running", input: { secret: "transient" } } } ],
  } satisfies Parameters<typeof conversationSearch>[1]

  test("finds case-insensitive visible messages and tool outputs in order", () => {
    expect(conversationSearch(messages, parts, " REGRESSION ").map((match) => match.id)).toEqual(["one", "two"])
    expect(conversationSearch(messages, parts, "λ")[0]?.role).toBe("user")
    expect(conversationSearch(messages, parts, "compiler")[0]?.id).toBe("two")
  })
  test("does not search synthetic/ignored prompts or uncompleted tool inputs", () => {
    expect(conversationSearch(messages, parts, "secret")).toEqual([])
    expect(conversationSearch(messages, parts, "transient")).toEqual([])
    expect(conversationSearch(messages, {}, "anything")).toEqual([])
  })
  test("opens with all searchable messages and compact snippets", () => {
    expect(conversationSearch(messages, parts, "")).toHaveLength(2)
    expect(conversationSearch(messages, { one: [{ type: "text", text: `${"x".repeat(1000)}needle${"y".repeat(1000)}` } as Part] }, "needle")[0]?.text.length).toBeLessThan(200)
  })
})

test("requested shortcuts have independent actions and retain leader aliases", () => {
  const keys = ConfigKeybinds.Keybinds.parse({})
  expect(keys.session_new).toBe("ctrl+n,<leader>n")
  expect(keys.session_search).toBe("ctrl+f")
  expect(keys.input_move_right).not.toContain("ctrl+f")
  expect(keys.worktree_list).toBe("ctrl+t")
  expect(keys.variant_cycle).toBe("ctrl+shift+t")
  expect(keys.command_list).toBe("ctrl+p")
})

test("MCP and skill commands accept explicit names and preserve skill arguments", () => {
  expect(parseFeatureCommand("/mcp connect local-tools")).toEqual({ type: "mcp", action: "connect", name: "local-tools" })
  expect(parseFeatureCommand(" /mcp disconnect remote ")).toEqual({ type: "mcp", action: "disconnect", name: "remote" })
  expect(parseFeatureCommand("/mcp unknown")).toMatchObject({ type: "error" })
  expect(parseFeatureCommand("/skill review Check src/file.ts\nThen test")).toEqual({ type: "skill", name: "review", arguments: "Check src/file.ts\nThen test" })
  expect(parseFeatureCommand("/skill")).toBeUndefined()
  expect(parseFeatureCommand("/skills")).toBeUndefined()
})

test("model footer displays context and does not call output-priced models free", () => {
  const model = { limit: { context: 128_000 }, cost: { input: 0, output: 1.5, cache: { read: 0, write: 0 } } } as Provider["models"][string]
  expect(modelFooter(model)).toContain("128K context")
  expect(modelFooter(model)).toContain("$1.50/M out")
  expect(modelFooter(model)).not.toContain("Free")
  expect(modelFooter({ ...model, cost: { input: 0, output: 0, cache: { read: 0, write: 0 } } })).toBe("128K context | Free")
})
