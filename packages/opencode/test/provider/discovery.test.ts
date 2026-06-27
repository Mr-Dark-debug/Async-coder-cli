import { afterEach, describe, expect, test } from "bun:test"
import { ProviderDiscovery } from "../../src/provider"

const servers: Bun.Server<unknown>[] = []

afterEach(() => {
  servers.splice(0).forEach((server) => server.stop(true))
})

function serve(fetch: (request: Request) => Response | Promise<Response>) {
  const server = Bun.serve({ port: 0, fetch })
  servers.push(server)
  return server
}

describe("provider discovery", () => {
  test("maps provider response statuses to actionable errors", () => {
    expect(ProviderDiscovery.classifyResponse(401)).toEqual({ code: "invalid_credentials", retryable: false })
    expect(ProviderDiscovery.classifyResponse(403)).toEqual({ code: "permission_denied", retryable: false })
    expect(ProviderDiscovery.classifyResponse(404)).toEqual({ code: "not_found", retryable: false })
    expect(ProviderDiscovery.classifyResponse(429)).toEqual({ code: "rate_limited", retryable: true })
    expect(ProviderDiscovery.classifyResponse(503)).toEqual({ code: "provider_unavailable", retryable: true })
  })

  test("redacts candidate credentials from provider messages", () => {
    expect(ProviderDiscovery.redactMessage("invalid sk-secret-value", "sk-secret-value")).toBe("invalid [redacted]")
  })

  test("normalizes Ollama and OpenAI-compatible model endpoints", () => {
    expect(ProviderDiscovery.modelEndpoint("ollama", "http://localhost:11434/v1")).toBe(
      "http://localhost:11434/api/tags",
    )
    expect(ProviderDiscovery.modelEndpoint("custom", "http://localhost:1234/v1/")).toBe(
      "http://localhost:1234/v1/models",
    )
  })

  test("discovers OpenAI-compatible models using bearer authentication", async () => {
    let authorization = ""
    const server = serve((request) => {
      authorization = request.headers.get("authorization") ?? ""
      return Response.json({ data: [{ id: "qwen-3", created: 1 }] })
    })

    const result = await ProviderDiscovery.discover({
      providerID: "groq",
      key: "candidate",
      baseURL: `${server.url}v1`,
    })

    expect(authorization).toBe("Bearer candidate")
    expect(result.verified).toBe(true)
    expect(result.models.map((model) => model.id)).toEqual(["qwen-3"])
  })

  test("discovers Anthropic models with provider headers", async () => {
    let headers = new Headers()
    const server = serve((request) => {
      headers = request.headers
      return Response.json({ data: [{ id: "claude-test", display_name: "Claude Test", created_at: "2026-01-01" }] })
    })

    const result = await ProviderDiscovery.discover({
      providerID: "anthropic",
      key: "candidate",
      baseURL: `${server.url}v1`,
    })

    expect(headers.get("x-api-key")).toBe("candidate")
    expect(headers.get("anthropic-version")).toBe("2023-06-01")
    expect(result.models[0]?.name).toBe("Claude Test")
  })

  test("discovers installed Ollama models", async () => {
    const server = serve(() => Response.json({ models: [{ name: "qwen3:8b", details: { family: "qwen3" } }] }))
    const result = await ProviderDiscovery.discover({ providerID: "ollama", baseURL: server.url.href })

    expect(result.models).toEqual([
      expect.objectContaining({ id: "qwen3:8b", name: "qwen3:8b", family: "qwen3" }),
    ])
  })

  test("does not leak rejected credentials", async () => {
    const server = serve(() => new Response("candidate is invalid", { status: 401 }))

    await expect(
      ProviderDiscovery.discover({ providerID: "groq", key: "candidate", baseURL: `${server.url}v1` }),
    ).rejects.toMatchObject({ code: "invalid_credentials", message: expect.not.stringContaining("candidate") })
  })
})
