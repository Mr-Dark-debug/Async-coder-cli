import type { Incoming } from "./core"

/** Messages pushed by a socket-driven adapter, handed to Bridge.run() one batch at a time. */
export class Inbox {
  private items: Incoming[] = []
  private waiter?: () => void

  push(message: Incoming) {
    this.items.push(message)
    this.waiter?.()
  }

  /** Resolves with everything queued, waiting until something arrives or the signal aborts. */
  async take(signal?: AbortSignal): Promise<Incoming[]> {
    while (this.items.length === 0) {
      if (signal?.aborted) return []
      await new Promise<void>((resolve) => {
        this.waiter = resolve
        signal?.addEventListener("abort", () => resolve(), { once: true })
      })
    }
    this.waiter = undefined
    const out = this.items
    this.items = []
    return out
  }
}

export type SocketLike = {
  send(data: string): void
  close(): void
  onopen: ((event: unknown) => void) | null
  onmessage: ((event: { data: unknown }) => void) | null
  onclose: ((event: unknown) => void) | null
  onerror: ((event: unknown) => void) | null
}

export type Connect = (url: string) => SocketLike
export const defaultConnect: Connect = (url) => new WebSocket(url) as unknown as SocketLike
