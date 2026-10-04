import { afterEach, expect, test } from "bun:test"
import { Stream } from "effect"
import { tmpdir } from "../fixture/fixture"
import { Instance } from "@/project/instance"
import { makeRuntime } from "@/effect/run-service"
import { Provider } from "@/provider"
import { LLM } from "@/session/llm"
import { Session } from "@/session"
import { Agent } from "@/agent/agent"
import { MessageID } from "@/session/schema"
import { ModelID, ProviderID } from "@/provider/schema"

const providers = makeRuntime(Provider.Service, Provider.defaultLayer)
const llm = makeRuntime(LLM.Service, LLM.defaultLayer)
const sessions = makeRuntime(Session.Service, Session.defaultLayer)
const agents = makeRuntime(Agent.Service, Agent.defaultLayer)
afterEach(() => Instance.disposeAll())

test("real API streaming fails over only to configured models and emits truthful provider attribution", async () => {
  const calls: string[] = []
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(request) {
      const url = new URL(request.url)
      if (request.method === "GET") return Response.json({ data: [{ id: "coding" }] })
      calls.push(url.pathname)
      await request.json()
      if (url.pathname.startsWith("/primary/"))
        return Response.json(
          { error: { message: "capacity unavailable" } },
          { status: 503, headers: { "retry-after-ms": "0" } },
        )
      const packet = (choices: unknown[], usage?: unknown) =>
        `data: ${JSON.stringify({ id: "response", model: "coding", object: "chat.completion.chunk", created: 1, choices, ...(usage ? { usage } : {}) })}\n\n`
      return new Response(
        packet([{ index: 0, delta: { role: "assistant", content: "fallback answer" }, finish_reason: null }]) +
          packet([{ index: 0, delta: {}, finish_reason: "stop" }], {
            prompt_tokens: 10,
            completion_tokens: 2,
            total_tokens: 12,
          }) +
          "data: [DONE]\n\n",
        { headers: { "content-type": "text/event-stream" } },
      )
    },
  })
  try {
    const configured = (id: string) => ({
      name: id,
      npm: "@ai-sdk/openai-compatible",
      env: [],
      options: { baseURL: new URL(`/${id}/v1`, server.url).href, apiKey: "test" },
      models: { coding: { name: "Coding", limit: { context: 32000, output: 1000 }, cost: { input: 0, output: 0 } } },
    })
    await using tmp = await tmpdir({
      git: true,
      config: {
        checkpoint: { thresholds: [] },
        reliability: { max_retries: 0, fallback_models: ["fallback/coding"] },
        provider: { primary: configured("primary"), fallback: configured("fallback") },
      },
    })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const session = await sessions.runPromise((svc) => svc.create())
        const model = await providers.runPromise((svc) =>
          svc.getModel(ProviderID.make("primary"), ModelID.make("coding")),
        )
        const agent = await agents.runPromise((svc) => svc.get("build"))
        if (!agent) throw new Error("Build agent unavailable")
        const user = await sessions.runPromise((svc) =>
          svc.updateMessage({
            id: MessageID.ascending(),
            sessionID: session.id,
            role: "user",
            time: { created: Date.now() },
            agent: "build",
            model: { providerID: model.providerID, modelID: model.id },
          }),
        )
        const events = await llm.runPromise((svc) =>
          svc
            .stream({
              user,
              model,
              agent,
              system: [],
              sessionID: session.id,
              messages: [{ role: "user", content: "Say hello" }],
              tools: {},
            })
            .pipe(Stream.runCollect),
        )
        const switches = events.filter((event) => event.type === "provider-switch")
        expect(switches.map((event) => event.model.providerID)).toEqual([
          ProviderID.make("primary"),
          ProviderID.make("fallback"),
        ])
        expect(
          events
            .filter((event) => event.type === "text-delta")
            .map((event) => event.text)
            .join(""),
        ).toBe("fallback answer")
        expect(calls).toEqual(["/primary/v1/chat/completions", "/fallback/v1/chat/completions"])
      },
    })
  } finally {
    server.stop(true)
  }
}, 30_000)
