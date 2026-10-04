import { createOpencodeClient } from "@async-coder/sdk/v2"
import type { Agent } from "./service"

/** An Agent backed by a running async-coder server over the SDK. */
export function agentFor(input: { baseUrl: string; directory: string; password?: string }): Agent {
  const headers = input.password
    ? { Authorization: `Basic ${Buffer.from(`${process.env.ASYNC_CODER_SERVER_USERNAME ?? "async-coder"}:${input.password}`).toString("base64")}` }
    : undefined
  const client = createOpencodeClient({ baseUrl: input.baseUrl, directory: input.directory, headers })
  let handler: Parameters<Agent["onPermission"]>[0] | undefined

  // Permission requests arrive on the event stream; forward them to the chat.
  void (async () => {
    const stream = await client.event.subscribe()
    for await (const event of stream.stream) {
      if (event.type !== "permission.asked" || !handler) continue
      const request = event.properties
      handler(request.sessionID, `The agent wants permission: ${request.permission} ${request.patterns.join(", ")}`, async (allow) => {
        await client.permission.reply({ requestID: request.id, reply: allow ? "once" : "reject" })
      })
    }
  })().catch(() => undefined)

  return {
    async createSession() {
      const res = await client.session.create({ title: "[bridge]" })
      if (!res.data) throw new Error("Could not create a session")
      return res.data.id
    },
    async prompt(sessionID, text) {
      const res = await client.session.prompt({ sessionID, parts: [{ type: "text", text }] })
      if (!res.data) throw new Error("The server returned no reply")
      return res.data.parts.flatMap((part) => (part.type === "text" && !part.synthetic ? [part.text] : [])).join("\n")
    },
    onPermission(next) {
      handler = next
    },
  }
}
