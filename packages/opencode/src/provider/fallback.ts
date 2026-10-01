import { isRetryableTransientError } from "@/session/retry"

/** Retry on an explicitly configured destination only before any content or tool execution. */
export async function* streamWithFallback<Model, Event extends { type: string }>(input: {
  models: Model[]
  open: (model: Model) => Promise<AsyncIterable<Event>>
  switched: (model: Model) => Event
  signal?: AbortSignal
}) {
  for (const [index, model] of input.models.entries()) {
    input.signal?.throwIfAborted()
    const state = { delivered: false }
    try {
      const stream = await input.open(model)
      yield input.switched(model)
      for await (const event of stream) {
        input.signal?.throwIfAborted()
        if (event.type === "error" && "error" in event) throw event.error
        if (["text-delta", "reasoning-delta", "tool-input-start", "tool-call", "tool-result"].includes(event.type)) state.delivered = true
        yield event
      }
      return
    } catch (error) {
      if (state.delivered || input.signal?.aborted || !isRetryableTransientError(error) || index === input.models.length - 1) throw error
    }
  }
}
