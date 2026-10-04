import { setTimeout as sleep } from "node:timers/promises"

type Waiter = { resolve: (release: () => void) => void; reject: (error: unknown) => void; signal?: AbortSignal; abort: () => void }

/** FIFO per-provider capacity. A slot is held until a response stream ends or is cancelled. */
export function createQueue(limit = 4, maximum = 64) {
  if (!Number.isInteger(limit) || limit < 1) throw new Error("Provider concurrency must be positive")
  const state = { active: 0, next: 0, waiting: [] as Waiter[] }
  const release = () => {
    state.active--
    const waiter = state.waiting.shift()
    if (!waiter) return
    waiter.signal?.removeEventListener("abort", waiter.abort)
    state.active++
    waiter.resolve(once(release))
  }
  const acquire = async (signal?: AbortSignal) => {
    signal?.throwIfAborted()
    const done = await new Promise<() => void>((resolve, reject) => {
      if (state.active < limit) {
        state.active++
        resolve(once(release))
        return
      }
      if (state.waiting.length >= maximum) {
        reject(new Error("Provider request queue is full; wait for active requests to finish"))
        return
      }
      const waiter: Waiter = { resolve, reject, signal, abort: () => {
        const index = state.waiting.indexOf(waiter)
        if (index >= 0) state.waiting.splice(index, 1)
        reject(signal?.reason ?? new DOMException("Aborted", "AbortError"))
      } }
      state.waiting.push(waiter)
      signal?.addEventListener("abort", waiter.abort, { once: true })
    })
    return done
  }
  const request = async (fetcher: typeof globalThis.fetch, input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const signal = init?.signal ?? (input instanceof Request ? input.signal : undefined)
    const done = await acquire(signal ?? undefined)
    const abort = () => done()
    signal?.addEventListener("abort", abort, { once: true })
    const finish = once(() => { signal?.removeEventListener("abort", abort); done() })
    const response = await (async () => {
      const wait = Math.max(0, state.next - Date.now())
      if (wait) await sleep(wait, undefined, { signal: signal ?? undefined })
      signal?.throwIfAborted()
      return fetcher(input, init)
    })().catch((error: unknown) => { finish(); throw error })
    if (response.status === 429 || response.status === 503) {
      const hint = response.headers.get("retry-after-ms")
      const seconds = response.headers.get("retry-after")
      const wait = hint ? Number(hint) : seconds && /^\d+(?:\.\d+)?$/.test(seconds) ? Number(seconds) * 1000 : seconds ? Date.parse(seconds) - Date.now() : 1000
      if (Number.isFinite(wait) && wait >= 0) state.next = Math.max(state.next, Date.now() + Math.min(wait, 300_000))
    }
    if (!response.body) { finish(); return response }
    const reader = response.body.getReader()
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        const chunk = await reader.read().catch((error: unknown) => { finish(); controller.error(error); return undefined })
        if (!chunk) return
        if (chunk.done) { finish(); controller.close(); return }
        controller.enqueue(chunk.value)
      },
      async cancel(reason) { finish(); await reader.cancel(reason) },
    })
    const result = new Response(stream, { status: response.status, statusText: response.statusText, headers: response.headers })
    Object.defineProperty(result, "url", { value: response.url })
    return result
  }
  return { fetch: request, stats: () => ({ active: state.active, queued: state.waiting.length, cooldownUntil: state.next }) }
}

function once(action: () => void) {
  const state = { done: false }
  return () => { if (state.done) return; state.done = true; action() }
}

const queues = new Map<string, ReturnType<typeof createQueue>>()

export function pooled(provider: string, limit = 4) {
  const key = `${provider}:${limit}`
  const existing = queues.get(key)
  if (existing) return existing
  const queue = createQueue(limit)
  queues.set(key, queue)
  return queue
}

export * as ProviderQueue from "./queue"
