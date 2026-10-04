import { describe, expect, test } from "bun:test"
import { mkdtempSync } from "fs"
import { tmpdir } from "os"
import path from "path"
import { authorized, chunk, parse, progress } from "../../src/bridge/core"
import { Bridge, type Agent, type Transport } from "../../src/bridge/service"
import { Channels } from "../../src/bridge/store"
import { Telegram } from "../../src/bridge/telegram"

describe("bridge core", () => {
  test("an empty allowlist denies everyone; chats and users are matched as strings", () => {
    expect(authorized({ chat: "1", user: "2" }, undefined)).toBe(false)
    expect(authorized({ chat: "1", user: "2" }, { chats: [], users: [] })).toBe(false)
    expect(authorized({ chat: "1", user: "2" }, { chats: [1] })).toBe(true)
    expect(authorized({ chat: "9", user: "2" }, { users: ["2"] })).toBe(true)
    expect(authorized({ chat: "9", user: "3" }, { chats: [1], users: [2] })).toBe(false)
  })

  test("chunk respects the limit and prefers natural boundaries", () => {
    const text = `${"a".repeat(30)}\n\n${"b".repeat(30)}\n\n${"c".repeat(30)}`
    const parts = chunk(text, 50)
    expect(parts.every((part) => part.length <= 50)).toBe(true)
    expect(parts.join("\n\n")).toBe(text)
    expect(chunk("short")).toEqual(["short"])
    expect(chunk("x".repeat(25), 10)).toHaveLength(3)
  })

  test("commands, including the @bot suffix Telegram adds in groups", () => {
    expect(parse("/details").type).toBe("details")
    expect(parse("/allow@my_bot").type).toBe("allow")
    expect(parse("/deny").type).toBe("deny")
    expect(parse("/new").type).toBe("new")
    expect(parse("/start").type).toBe("help")
    expect(parse("fix the bug")).toEqual({ type: "prompt", text: "fix the bug" })
    expect(parse("/unknown thing")).toEqual({ type: "prompt", text: "/unknown thing" })
  })

  test("progress lines are one short line", () => {
    expect(progress("bash", { command: "bun test\n--all" })).toBe("• bash bun test --all")
    expect(progress("read")).toBe("• read")
  })
})

class FakeTransport implements Transport {
  sent: [string, string][] = []
  inbox: ReturnType<Transport["poll"]> extends Promise<infer T> ? T[] : never = []
  async poll() {
    return this.inbox.shift() ?? []
  }
  async send(chat: string, text: string) {
    this.sent.push([chat, text])
  }
}

class FakeAgent implements Agent {
  created = 0
  prompts: [string, string][] = []
  reply = "done"
  gate?: Promise<void>
  asker?: Parameters<Agent["onPermission"]>[0]
  async createSession() {
    return `ses_${++this.created}`
  }
  async prompt(sessionID: string, text: string) {
    this.prompts.push([sessionID, text])
    await this.gate
    return this.reply
  }
  onPermission(handler: Parameters<Agent["onPermission"]>[0]) {
    this.asker = handler
  }
}

const channels = async () => new Channels(path.join(mkdtempSync(path.join(tmpdir(), "bridge-")), "channels.json")).load()
const msg = (text: string, chat = "10", user = "5") => ({ chat, user, text })

describe("bridge service", () => {
  test("an unknown user is rejected and nothing reaches the agent", async () => {
    const t = new FakeTransport()
    const a = new FakeAgent()
    const bridge = new Bridge(t, a, await channels(), { allow: { users: ["5"] }, protocol: "telegram" })
    await bridge.handle(msg("rm -rf /", "10", "666"))
    expect(a.prompts).toHaveLength(0)
    expect(a.created).toBe(0)
    expect(t.sent[0][1]).toContain("Not authorized")
  })

  test("an allowed message becomes a prompt and its reply is sent back", async () => {
    const t = new FakeTransport()
    const a = new FakeAgent()
    a.reply = "all fixed"
    const bridge = new Bridge(t, a, await channels(), { allow: { chats: ["10"] }, protocol: "telegram" })
    await bridge.handle(msg("fix the bug"))
    expect(a.prompts).toEqual([["ses_1", "fix the bug"]])
    expect(t.sent).toEqual([["10", "all fixed"]])
  })

  test("the same chat keeps its session, even after a bridge restart", async () => {
    const store = await channels()
    const file = (store as unknown as { file: string }).file
    const a = new FakeAgent()
    const first = new Bridge(new FakeTransport(), a, store, { allow: { chats: ["10"] }, protocol: "telegram" })
    await first.handle(msg("one"))
    await first.handle(msg("two"))
    const restarted = new Bridge(new FakeTransport(), a, await new Channels(file).load(), { allow: { chats: ["10"] }, protocol: "telegram" })
    await restarted.handle(msg("three"))
    expect(a.created).toBe(1)
    expect(a.prompts.map(([id]) => id)).toEqual(["ses_1", "ses_1", "ses_1"])
  })

  test("/new starts a fresh session", async () => {
    const a = new FakeAgent()
    const bridge = new Bridge(new FakeTransport(), a, await channels(), { allow: { chats: ["10"] }, protocol: "telegram" })
    await bridge.handle(msg("one"))
    await bridge.handle(msg("/new"))
    await bridge.handle(msg("two"))
    expect(a.prompts.map(([id]) => id)).toEqual(["ses_1", "ses_2"])
  })

  test("long replies send the first chunk and the rest on /details", async () => {
    const t = new FakeTransport()
    const a = new FakeAgent()
    a.reply = `${"x".repeat(3000)} ${"y".repeat(3000)}`
    const bridge = new Bridge(t, a, await channels(), { allow: { chats: ["10"] }, protocol: "telegram" })
    await bridge.handle(msg("go"))
    expect(t.sent).toHaveLength(1)
    expect(t.sent[0][1]).toContain("/details")
    await bridge.handle(msg("/details"))
    expect(t.sent.slice(1).map(([, text]) => text).join(" ")).toContain("y".repeat(3000))
  })

  test("a second message while busy is refused, and an agent error is reported", async () => {
    const t = new FakeTransport()
    const a = new FakeAgent()
    let release!: () => void
    a.gate = new Promise((resolve) => (release = resolve))
    const bridge = new Bridge(t, a, await channels(), { allow: { chats: ["10"] }, protocol: "telegram" })
    const first = bridge.handle(msg("slow"))
    await Bun.sleep(10)
    await bridge.handle(msg("another"))
    expect(t.sent.at(-1)?.[1]).toContain("Still working")
    release()
    await first
    a.prompt = async () => {
      throw new Error("model exploded")
    }
    await bridge.handle(msg("again"))
    expect(t.sent.at(-1)?.[1]).toContain("model exploded")
  })

  test("permission requests are put to the chat and /allow answers them", async () => {
    const t = new FakeTransport()
    const a = new FakeAgent()
    const bridge = new Bridge(t, a, await channels(), { allow: { chats: ["10"] }, protocol: "telegram" })
    await bridge.handle(msg("hello"))
    const answers: boolean[] = []
    a.asker!("ses_1", "The agent wants permission: bash rm -rf build", async (allow) => void answers.push(allow))
    await Bun.sleep(5)
    expect(t.sent.at(-1)?.[1]).toContain("Reply /allow or /deny")
    await bridge.handle(msg("/deny"))
    expect(answers).toEqual([false])
    await bridge.handle(msg("/allow"))
    expect(t.sent.at(-1)?.[1]).toBe("Nothing is waiting for permission.")
  })
})

describe("telegram adapter", () => {
  const fakeHttp = (responses: unknown[]) => {
    const calls: { url: string; body: any }[] = []
    const http = (async (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(String(init.body)) })
      return new Response(JSON.stringify(responses.shift() ?? { ok: true, result: [] }))
    }) as unknown as typeof fetch
    return { http, calls }
  }

  test("poll returns text messages, skips others, and advances the offset", async () => {
    const { http, calls } = fakeHttp([
      { ok: true, result: [
        { update_id: 7, message: { text: "hi", chat: { id: 42 }, from: { id: 9, username: "dev" } } },
        { update_id: 8, message: { chat: { id: 42 } } },
      ] },
      { ok: true, result: [] },
    ])
    const tg = new Telegram("TOKEN", http, "https://tg.test")
    expect(await tg.poll()).toEqual([{ chat: "42", user: "9", username: "dev", text: "hi" }])
    await tg.poll()
    expect(calls[0].url).toBe("https://tg.test/botTOKEN/getUpdates")
    expect(calls[0].body.offset).toBe(0)
    expect(calls[1].body.offset).toBe(9)
  })

  test("send posts to sendMessage and API errors surface", async () => {
    const { http, calls } = fakeHttp([{ ok: true, result: {} }, { ok: false, description: "chat not found" }])
    const tg = new Telegram("T", http, "https://tg.test")
    await tg.send("5", "hello")
    expect(calls[0].body).toEqual({ chat_id: "5", text: "hello" })
    await expect(tg.send("6", "x")).rejects.toThrow("chat not found")
  })
})
