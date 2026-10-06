import { authorized, chunk, HELP, parse, type Allow, type Incoming } from "./core"
import type { Channels } from "./store"

export interface Transport {
  poll(signal?: AbortSignal): Promise<Incoming[]>
  send(chat: string, text: string): Promise<void>
  typing?(chat: string): Promise<void>
  /** Largest message the service accepts; replies are chunked to fit. Default 4000. */
  limit?: number
}

export interface Agent {
  createSession(): Promise<string>
  /** Run a prompt to completion and return the assistant's final text. */
  prompt(sessionID: string, text: string): Promise<string>
  /** Called with a human-readable question when the agent needs permission; the answer callback resolves it. */
  onPermission(handler: (sessionID: string, question: string, answer: (allow: boolean) => Promise<void>) => void): void
}

export type Options = { allow: Allow; protocol: string; log?: (line: string) => void }

/**
 * Connects a chat transport to the agent. Every chat maps to one persisted session. Messages from
 * anyone not allowlisted are refused before anything reaches the agent, and tool permissions
 * are put to the chat rather than bypassed.
 */
export class Bridge {
  private busy = new Set<string>()
  private asking = new Map<string, (allow: boolean) => Promise<void>>()
  private sessions = new Map<string, string>()

  constructor(
    private transport: Transport,
    private agent: Agent,
    private channels: Channels,
    private options: Options,
  ) {
    agent.onPermission((sessionID, question, answer) => {
      const chat = [...this.sessions].find(([, id]) => id === sessionID)?.[0]
      if (!chat) return
      this.asking.set(chat, answer)
      void this.transport.send(chat, `${question}\nReply /allow or /deny.`)
    })
  }

  private key = (chat: string) => `${this.options.protocol}:${chat}`

  private async session(chat: string) {
    const known = this.channels.get(this.key(chat))?.sessionID
    const id = known ?? (await this.agent.createSession())
    if (!known) await this.channels.set(this.key(chat), { sessionID: id })
    this.sessions.set(chat, id)
    return id
  }

  /** Handle one incoming message. Resolves when the reply has been sent. */
  async handle(msg: Incoming) {
    if (!authorized(msg, this.options.allow)) {
      this.options.log?.(`rejected ${msg.user}@${msg.chat}`)
      await this.transport.send(msg.chat, "Not authorized. Ask the owner to add this chat to the bridge allowlist.")
      return
    }
    const command = parse(msg.text)
    if (command.type === "help") return this.transport.send(msg.chat, HELP)
    if (command.type === "allow" || command.type === "deny") {
      const answer = this.asking.get(msg.chat)
      if (!answer) return this.transport.send(msg.chat, "Nothing is waiting for permission.")
      this.asking.delete(msg.chat)
      await answer(command.type === "allow")
      return this.transport.send(msg.chat, command.type === "allow" ? "Allowed." : "Denied.")
    }
    if (command.type === "new") {
      if (this.busy.has(msg.chat)) return this.transport.send(msg.chat, "Still working on the previous message.")
      await this.channels.remove(this.key(msg.chat))
      this.sessions.delete(msg.chat)
      return this.transport.send(msg.chat, "Started a fresh session.")
    }
    if (command.type === "details") {
      const last = this.channels.get(this.key(msg.chat))?.last
      if (!last) return this.transport.send(msg.chat, "No reply yet.")
      for (const part of chunk(last, this.transport.limit)) await this.transport.send(msg.chat, part)
      return
    }
    if (this.busy.has(msg.chat)) return this.transport.send(msg.chat, "Still working on the previous message.")
    this.busy.add(msg.chat)
    try {
      const sessionID = await this.session(msg.chat)
      await this.transport.typing?.(msg.chat)
      const reply = await this.agent.prompt(sessionID, command.text)
      await this.channels.set(this.key(msg.chat), { sessionID, last: reply })
      const parts = chunk(reply || "(no reply)", this.transport.limit)
      // Long replies are summarised: the first chunk now, the rest on /details.
      await this.transport.send(msg.chat, parts[0] + (parts.length > 1 ? "\n\n(send /details for the full reply)" : ""))
    } catch (error) {
      await this.transport.send(
        msg.chat,
        `Something went wrong: ${error instanceof Error ? error.message : String(error)}`,
      )
    } finally {
      this.busy.delete(msg.chat)
    }
  }

  /** Poll until aborted. Each message is handled concurrently so /allow can arrive while a prompt runs. */
  async run(signal: AbortSignal) {
    while (!signal.aborted) {
      const batch = await this.transport.poll(signal).catch(async (error) => {
        if (signal.aborted) return []
        this.options.log?.(`poll failed: ${String(error)}`)
        await Bun.sleep(3000)
        return []
      })
      for (const msg of batch)
        void this.handle(msg).catch((error) => this.options.log?.(`handle failed: ${String(error)}`))
    }
  }
}
