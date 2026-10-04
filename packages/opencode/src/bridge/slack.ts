import type { Incoming } from "./core"
import { defaultConnect, Inbox, type Connect, type SocketLike } from "./queue"
import type { Transport } from "./service"

type Fetch = typeof fetch

/**
 * Slack over Socket Mode. `appToken` (xapp-…) opens the socket; `botToken` (xoxb-…) posts replies.
 * Only plain user messages are surfaced; bot messages and edits are ignored.
 */
export class Slack implements Transport {
  limit = 3500
  private inbox = new Inbox()
  private socket?: SocketLike
  private closed = false

  constructor(
    private botToken: string,
    private appToken: string,
    private http: Fetch = fetch,
    private connect: Connect = defaultConnect,
    private api = "https://slack.com/api",
  ) {}

  private async call<T>(method: string, token: string, body?: Record<string, unknown>) {
    const res = await this.http(`${this.api}/${method}`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(body ?? {}),
    })
    const json = (await res.json()) as { ok: boolean; error?: string } & T
    if (!json.ok) throw new Error(`Slack ${method} failed: ${json.error ?? res.status}`)
    return json
  }

  /** Open (or reopen) the socket. Resolves once the socket object exists; messages arrive via poll(). */
  async start() {
    const opened = await this.call<{ url: string }>("apps.connections.open", this.appToken)
    const socket = this.connect(opened.url)
    this.socket = socket
    socket.onmessage = (event) => this.handle(socket, String(event.data))
    socket.onclose = () => {
      if (!this.closed) void this.start().catch(() => undefined)
    }
  }

  /** Parse one socket frame: acknowledge it and queue a message if it is a user message. */
  handle(socket: Pick<SocketLike, "send">, raw: string) {
    let frame: { envelope_id?: string; type?: string; payload?: { event?: Record<string, unknown> } }
    try {
      frame = JSON.parse(raw)
    } catch {
      return
    }
    // Slack redelivers anything not acknowledged within three seconds.
    if (frame.envelope_id) socket.send(JSON.stringify({ envelope_id: frame.envelope_id }))
    if (frame.type !== "events_api") return
    const event = frame.payload?.event
    if (!event || event.type !== "message" || event.subtype || event.bot_id) return
    if (typeof event.text !== "string" || typeof event.channel !== "string") return
    this.inbox.push({ chat: event.channel, user: String(event.user ?? ""), text: event.text })
  }

  async poll(signal?: AbortSignal): Promise<Incoming[]> {
    if (!this.socket) await this.start()
    return this.inbox.take(signal)
  }

  async send(chat: string, text: string) {
    await this.call("chat.postMessage", this.botToken, { channel: chat, text })
  }

  stop() {
    this.closed = true
    this.socket?.close()
  }
}
