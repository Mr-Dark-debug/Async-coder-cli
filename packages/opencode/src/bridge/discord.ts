import type { Incoming } from "./core"
import { defaultConnect, Inbox, type Connect, type SocketLike } from "./queue"
import type { Transport } from "./service"

type Fetch = typeof fetch

// GUILD_MESSAGES | DIRECT_MESSAGES | MESSAGE_CONTENT
const INTENTS = (1 << 9) | (1 << 12) | (1 << 15)

/** Discord bot over the Gateway (receive) and REST (send). Bot authors are ignored. */
export class Discord implements Transport {
  limit = 1900
  private inbox = new Inbox()
  private socket?: SocketLike
  private timer?: ReturnType<typeof setInterval>
  private seq: number | null = null
  private closed = false

  constructor(
    private token: string,
    private http: Fetch = fetch,
    private connect: Connect = defaultConnect,
    private api = "https://discord.com/api/v10",
  ) {}

  private headers() {
    return { authorization: `Bot ${this.token}`, "content-type": "application/json" }
  }

  async start() {
    const info = (await (await this.http(`${this.api}/gateway/bot`, { headers: this.headers() })).json()) as { url?: string; message?: string }
    if (!info.url) throw new Error(`Discord gateway lookup failed: ${info.message ?? "no url"}`)
    const socket = this.connect(`${info.url}?v=10&encoding=json`)
    this.socket = socket
    socket.onmessage = (event) => this.handle(socket, String(event.data))
    socket.onclose = () => {
      clearInterval(this.timer)
      if (!this.closed) void this.start().catch(() => undefined)
    }
  }

  /** Handle one gateway frame: hello starts heartbeats and identifies; message-create is queued. */
  handle(socket: Pick<SocketLike, "send">, raw: string) {
    let frame: { op: number; t?: string; s?: number | null; d?: any }
    try {
      frame = JSON.parse(raw)
    } catch {
      return
    }
    if (frame.s !== undefined && frame.s !== null) this.seq = frame.s
    if (frame.op === 10) {
      clearInterval(this.timer)
      this.timer = setInterval(() => socket.send(JSON.stringify({ op: 1, d: this.seq })), frame.d?.heartbeat_interval ?? 41_250)
      socket.send(JSON.stringify({ op: 2, d: { token: this.token, intents: INTENTS, properties: { os: process.platform, browser: "async-coder", device: "async-coder" } } }))
      return
    }
    if (frame.op === 1) return void socket.send(JSON.stringify({ op: 1, d: this.seq }))
    if (frame.op === 7 || frame.op === 9) return void this.socket?.close() // reconnect: onclose restarts
    if (frame.op !== 0 || frame.t !== "MESSAGE_CREATE") return
    const message = frame.d
    if (!message || message.author?.bot || typeof message.content !== "string" || !message.content) return
    this.inbox.push({ chat: String(message.channel_id), user: String(message.author?.id ?? ""), username: message.author?.username, text: message.content })
  }

  async poll(signal?: AbortSignal): Promise<Incoming[]> {
    if (!this.socket) await this.start()
    return this.inbox.take(signal)
  }

  async send(chat: string, text: string) {
    const res = await this.http(`${this.api}/channels/${chat}/messages`, { method: "POST", headers: this.headers(), body: JSON.stringify({ content: text }) })
    if (!res.ok) throw new Error(`Discord send failed (${res.status})`)
  }

  async typing(chat: string) {
    await this.http(`${this.api}/channels/${chat}/typing`, { method: "POST", headers: this.headers() }).catch(() => undefined)
  }

  stop() {
    this.closed = true
    clearInterval(this.timer)
    this.socket?.close()
  }
}
