import { describe, expect, test } from "bun:test"
import { Discord } from "../../src/bridge/discord"
import { Inbox, type SocketLike } from "../../src/bridge/queue"
import { Slack } from "../../src/bridge/slack"

const fakeSocket = () => {
  const sent: string[] = []
  const socket: SocketLike & { sent: string[]; closed: boolean } = {
    sent,
    closed: false,
    send: (data) => void sent.push(data),
    close() {
      socket.closed = true
    },
    onopen: null,
    onmessage: null,
    onclose: null,
    onerror: null,
  }
  return socket
}

const json = (body: unknown) => new Response(JSON.stringify(body))

describe("inbox", () => {
  test("take waits for a push and returns the whole batch", async () => {
    const inbox = new Inbox()
    const pending = inbox.take()
    inbox.push({ chat: "1", user: "2", text: "a" })
    expect((await pending).map((m) => m.text)).toEqual(["a"])
    inbox.push({ chat: "1", user: "2", text: "b" })
    inbox.push({ chat: "1", user: "2", text: "c" })
    expect((await inbox.take()).map((m) => m.text)).toEqual(["b", "c"])
  })

  test("take returns empty when aborted", async () => {
    const controller = new AbortController()
    const inbox = new Inbox()
    const pending = inbox.take(controller.signal)
    controller.abort()
    expect(await pending).toEqual([])
  })
})

describe("slack adapter", () => {
  const frame = (event: Record<string, unknown>, id = "env1") =>
    JSON.stringify({ envelope_id: id, type: "events_api", payload: { event } })

  test("opens a socket with the app token, acks each envelope and queues user messages", async () => {
    const calls: { url: string; auth?: string; body?: any }[] = []
    const socket = fakeSocket()
    const http = (async (url: string, init: RequestInit) => {
      calls.push({ url, auth: (init.headers as Record<string, string>).authorization, body: JSON.parse(String(init.body)) })
      return json({ ok: true, url: "wss://slack.test/socket" })
    }) as unknown as typeof fetch
    let connectedTo = ""
    const slack = new Slack("xoxb-bot", "xapp-app", http, (url) => ((connectedTo = url), socket), "https://slack.test/api")
    const polled = slack.poll()
    await Bun.sleep(10)
    expect(calls[0]).toMatchObject({ url: "https://slack.test/api/apps.connections.open", auth: "Bearer xapp-app" })
    expect(connectedTo).toBe("wss://slack.test/socket")

    socket.onmessage!({ data: frame({ type: "message", user: "U1", channel: "C1", text: "hello" }) })
    expect(await polled).toEqual([{ chat: "C1", user: "U1", text: "hello" }])
    expect(socket.sent).toEqual([JSON.stringify({ envelope_id: "env1" })])
  })

  test("bot messages, edits, non-message events and malformed frames are ignored but still acked", () => {
    const slack = new Slack("b", "a", (async () => json({ ok: true })) as unknown as typeof fetch)
    const socket = fakeSocket()
    slack.handle(socket, frame({ type: "message", bot_id: "B1", channel: "C", text: "x" }, "e1"))
    slack.handle(socket, frame({ type: "message", subtype: "message_changed", channel: "C", text: "x" }, "e2"))
    slack.handle(socket, frame({ type: "reaction_added" }, "e3"))
    slack.handle(socket, "not json")
    expect(socket.sent).toHaveLength(3)
    expect((slack as unknown as { inbox: { items: unknown[] } }).inbox.items).toEqual([])
  })

  test("send posts with the bot token and API errors surface", async () => {
    const calls: { url: string; auth?: string; body: any }[] = []
    const replies = [{ ok: true }, { ok: false, error: "channel_not_found" }]
    const http = (async (url: string, init: RequestInit) => {
      calls.push({ url, auth: (init.headers as Record<string, string>).authorization, body: JSON.parse(String(init.body)) })
      return json(replies.shift())
    }) as unknown as typeof fetch
    const slack = new Slack("xoxb-bot", "xapp", http, () => fakeSocket(), "https://slack.test/api")
    await slack.send("C1", "hi")
    expect(calls[0]).toMatchObject({ url: "https://slack.test/api/chat.postMessage", auth: "Bearer xoxb-bot", body: { channel: "C1", text: "hi" } })
    await expect(slack.send("C2", "x")).rejects.toThrow("channel_not_found")
  })
})

describe("discord adapter", () => {
  test("hello triggers identify with message-content intents and heartbeats", async () => {
    const discord = new Discord("TOKEN", (async () => json({})) as unknown as typeof fetch, () => fakeSocket())
    const socket = fakeSocket()
    discord.handle(socket, JSON.stringify({ op: 10, d: { heartbeat_interval: 20 } }))
    const identify = JSON.parse(socket.sent[0])
    expect(identify.op).toBe(2)
    expect(identify.d.token).toBe("TOKEN")
    expect(identify.d.intents & (1 << 15)).toBeTruthy()
    await Bun.sleep(70)
    expect(socket.sent.slice(1).every((frame) => JSON.parse(frame).op === 1)).toBe(true)
    expect(socket.sent.length).toBeGreaterThan(1)
    discord.stop()
  })

  test("message-create from a person is queued; bots and empty content are ignored", () => {
    const discord = new Discord("T", (async () => json({})) as unknown as typeof fetch, () => fakeSocket())
    const socket = fakeSocket()
    const create = (d: object, s = 1) => JSON.stringify({ op: 0, t: "MESSAGE_CREATE", s, d })
    discord.handle(socket, create({ channel_id: "55", content: "hello", author: { id: "9", username: "dev" } }))
    discord.handle(socket, create({ channel_id: "55", content: "beep", author: { id: "8", bot: true } }, 2))
    discord.handle(socket, create({ channel_id: "55", content: "", author: { id: "9" } }, 3))
    discord.handle(socket, JSON.stringify({ op: 0, t: "TYPING_START", s: 4, d: {} }))
    expect((discord as unknown as { inbox: { items: unknown[] } }).inbox.items).toEqual([{ chat: "55", user: "9", username: "dev", text: "hello" }])
    expect((discord as unknown as { seq: number }).seq).toBe(4)
  })

  test("gateway lookup, send and a failed send", async () => {
    const calls: { url: string; auth?: string; body?: any }[] = []
    const responses = [json({ url: "wss://gw.test" }), new Response("{}", { status: 200 }), new Response("{}", { status: 403 })]
    const http = (async (url: string, init: RequestInit) => {
      calls.push({ url, auth: (init.headers as Record<string, string>).authorization, body: init.body ? JSON.parse(String(init.body)) : undefined })
      return responses.shift()!
    }) as unknown as typeof fetch
    let connectedTo = ""
    const discord = new Discord("TOKEN", http, (url) => ((connectedTo = url), fakeSocket()), "https://discord.test/api")
    await discord.start()
    expect(calls[0]).toMatchObject({ url: "https://discord.test/api/gateway/bot", auth: "Bot TOKEN" })
    expect(connectedTo).toBe("wss://gw.test?v=10&encoding=json")
    await discord.send("77", "hello")
    expect(calls[1]).toMatchObject({ url: "https://discord.test/api/channels/77/messages", body: { content: "hello" } })
    await expect(discord.send("77", "x")).rejects.toThrow("403")
    expect(discord.limit).toBeLessThan(2000)
    discord.stop()
  })

  test("a gateway lookup without a url is an error", async () => {
    const discord = new Discord("T", (async () => json({ message: "401: Unauthorized" })) as unknown as typeof fetch, () => fakeSocket())
    await expect(discord.start()).rejects.toThrow("401: Unauthorized")
  })
})
