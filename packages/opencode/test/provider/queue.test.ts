import { expect, test } from "bun:test"
import { setTimeout as sleep } from "node:timers/promises"
import { createQueue } from "@/provider/queue"
import { streamWithFallback } from "@/provider/fallback"
import { SessionRetry } from "@/session/retry"
import { MessageV2 } from "@/session/message-v2"

test("FIFO holds capacity across streaming responses, aborts queued work and releases on cancellation", async () => {
  const calls: string[] = []
  const server = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch(request) { calls.push(new URL(request.url).pathname); return new Response("payload") } })
  try {
    const queue = createQueue(1)
    const first = await queue.fetch(fetch, new URL("/first", server.url))
    const controller = new AbortController()
    const aborted = queue.fetch(fetch, new URL("/cancelled", server.url), { signal: controller.signal })
    const second = queue.fetch(fetch, new URL("/second", server.url))
    controller.abort()
    await expect(aborted).rejects.toThrow()
    expect(queue.stats()).toMatchObject({ active: 1, queued: 1 })
    expect(calls).toEqual(["/first"])
    expect(await first.text()).toBe("payload")
    const response = await second
    expect(calls).toEqual(["/first", "/second"])
    await response.body!.cancel()
    expect(queue.stats()).toMatchObject({ active: 0, queued: 0 })
  } finally { server.stop(true) }
})

test("rate limit cooldown applies to subsequent requests and queue is bounded", async () => {
  const server = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch() { return new Response("rate limited", { status: 429, headers: { "retry-after-ms": "40" } }) } })
  try {
    const queue = createQueue(1, 1)
    const first = await queue.fetch(fetch, server.url)
    const second = queue.fetch(fetch, server.url)
    await expect(queue.fetch(fetch, server.url)).rejects.toThrow("queue is full")
    await first.text()
    const began = Date.now()
    const response = await second
    expect(Date.now() - began).toBeGreaterThanOrEqual(20)
    await response.text()
    expect(queue.stats().active).toBe(0)
  } finally { server.stop(true) }
})

test("abort interrupts provider cooldown without sending a request or leaking a capacity slot", async () => {
  const state = { calls: 0 }
  const server = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch() { state.calls++; return new Response("slow down", { status: 429, headers: { "retry-after": "30" } }) } })
  try {
    const queue = createQueue(1)
    await (await queue.fetch(fetch, server.url)).text()
    const controller = new AbortController()
    const request = queue.fetch(fetch, server.url, { signal: controller.signal })
    await sleep(10)
    controller.abort()
    await expect(request).rejects.toThrow()
    expect(state.calls).toBe(1)
    expect(queue.stats().active).toBe(0)
  } finally { server.stop(true) }
})

test("explicit fallback handles transient failure before content; never repeats content/tool side effects or auth errors", async () => {
  const error = Object.assign(new Error("capacity"), { status: 503 })
  const events = []
  for await (const event of streamWithFallback({
    models: ["primary", "fallback"],
    open: async (model) => (async function* (): AsyncGenerator<{ type: string; error?: Error; text?: string; model?: string }> { if (model === "primary") yield { type: "error", error }; yield { type: "text-delta", text: "answer" } })(),
    switched: (model) => ({ type: "provider-switch", model }),
  })) events.push(event)
  expect(events.map((event) => event.type)).toEqual(["provider-switch", "provider-switch", "text-delta"])
  for (const type of ["text-delta", "reasoning-delta", "tool-input-start"]) {
    const attempts: string[] = []
    const run = async () => {
      for await (const event of streamWithFallback({ models: ["a", "b"], open: async (model) => { attempts.push(model); return (async function* () { yield { type }; throw error })() }, switched: () => ({ type: "provider-switch" }) })) void event
    }
    await expect(run()).rejects.toThrow("capacity")
    expect(attempts).toEqual(["a"])
  }
  const run = async () => {
    for await (const event of streamWithFallback({ models: ["a", "b"], open: async () => { throw Object.assign(new Error("unauthorized"), { status: 401 }) }, switched: () => ({ type: "provider-switch" }) })) void event
  }
  await expect(run()).rejects.toThrow("unauthorized")
})

test("retry ignores negative and infinite headers, caps empty-header backoff and handles zero delays", () => {
  const error = (headers: Record<string, string>) => new MessageV2.APIError({ message: "limit", isRetryable: true, responseHeaders: headers }).toObject() as MessageV2.APIError
  expect(SessionRetry.delay(1, error({ "retry-after-ms": "-1" }))).toBe(2000)
  expect(SessionRetry.delay(1, error({ "retry-after-ms": "Infinity" }))).toBe(2000)
  expect(SessionRetry.delay(30, error({}))).toBe(30000)
  expect(SessionRetry.delay(1, error({ "retry-after-ms": "0" }))).toBe(0)
})
