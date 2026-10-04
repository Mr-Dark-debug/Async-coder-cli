import type { Incoming } from "./core"

type Fetch = typeof fetch

type Update = {
  update_id: number
  message?: { text?: string; chat: { id: number }; from?: { id: number; username?: string } }
}

/** Telegram Bot API over long polling. Only plain text messages are surfaced. */
export class Telegram {
  private offset = 0
  constructor(
    private token: string,
    private http: Fetch = fetch,
    private api = "https://api.telegram.org",
  ) {}

  private async call<T>(method: string, body: Record<string, unknown>, signal?: AbortSignal) {
    const res = await this.http(`${this.api}/bot${this.token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    })
    const json = (await res.json()) as { ok: boolean; result: T; description?: string }
    if (!json.ok) throw new Error(`Telegram ${method} failed: ${json.description ?? res.status}`)
    return json.result
  }

  /** One long-poll round. Returns the messages received and advances the offset. */
  async poll(signal?: AbortSignal, timeoutSeconds = 30): Promise<Incoming[]> {
    const updates = await this.call<Update[]>("getUpdates", { offset: this.offset, timeout: timeoutSeconds, allowed_updates: ["message"] }, signal)
    const out: Incoming[] = []
    for (const update of updates) {
      this.offset = Math.max(this.offset, update.update_id + 1)
      const message = update.message
      if (!message?.text) continue
      out.push({ chat: String(message.chat.id), user: String(message.from?.id ?? ""), username: message.from?.username, text: message.text })
    }
    return out
  }

  async send(chat: string, text: string) {
    await this.call("sendMessage", { chat_id: chat, text })
  }

  async typing(chat: string) {
    await this.call("sendChatAction", { chat_id: chat, action: "typing" }).catch(() => undefined)
  }
}
