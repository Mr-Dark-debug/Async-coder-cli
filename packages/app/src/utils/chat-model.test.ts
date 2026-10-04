import { describe, expect, test } from "bun:test"
import { chatModelFooter, isFreeChatModel, pickChatModel, supportsChatModel } from "./chat-model"
import type { Model } from "@async-coder/sdk/v2"

const model = (id: string, input: boolean, output: boolean) => ({ id, capabilities: { input: { text: input }, output: { text: output } } } as Pick<Model, "id" | "capabilities">)

describe("chat model selection", () => {
  const speech = model("whisper", false, true)
  const image = model("image-generator", true, false)
  const chat = model("coder", true, true)
  const saved = model("preferred-chat", true, true)
  test("skips speech and image models before choosing the first text conversation model", () => {
    expect(pickChatModel([speech, image, chat])?.id).toBe("coder")
    expect(pickChatModel([speech, image, chat], "whisper")?.id).toBe("coder")
    expect(supportsChatModel(undefined)).toBe(false)
  })
  test("preserves a compatible configured or saved choice", () => {
    expect(pickChatModel([speech, chat, saved], "preferred-chat")?.id).toBe("preferred-chat")
    expect(pickChatModel([speech, image])).toBeUndefined()
  })
  test("free models have zero input, output and cache prices; footer includes context", () => {
    const cost = { input: 0, output: 0, cache: { read: 0, write: 0 } }
    expect(isFreeChatModel(cost)).toBe(true)
    expect(isFreeChatModel({ ...cost, output: 1 })).toBe(false)
    expect(isFreeChatModel({ ...cost, cache: { read: 0.1, write: 0 } })).toBe(false)
    expect(isFreeChatModel(undefined)).toBe(false)
    expect(chatModelFooter({ cost, limit: { context: 128000, output: 4000 } })).toContain("128,000 context · Free")
  })
})
