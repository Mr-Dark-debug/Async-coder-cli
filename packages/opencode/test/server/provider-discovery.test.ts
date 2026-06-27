import { afterEach, describe, expect, test } from "bun:test"
import path from "path"
import { Instance } from "../../src/project/instance"
import { Server } from "../../src/server/server"
import { tmpdir } from "../fixture/fixture"

const servers: Bun.Server<unknown>[] = []

afterEach(async () => {
  servers.splice(0).forEach((server) => server.stop(true))
  await Instance.disposeAll()
})

describe("provider discovery endpoint", () => {
  test("validates a candidate without persisting it", async () => {
    const remote = Bun.serve({
      port: 0,
      fetch: () => Response.json({ data: [{ id: "test-model" }] }),
    })
    servers.push(remote)
    await using tmp = await tmpdir()

    const response = await Server.Default().app.request("/provider/groq/discover", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-async-coder-directory": tmp.path,
      },
      body: JSON.stringify({ key: "candidate", baseURL: `${remote.url}v1` }),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      verified: true,
      source: "live",
      models: [{ id: "test-model" }],
    })
  })

  test("returns a sanitized authentication error", async () => {
    const remote = Bun.serve({ port: 0, fetch: () => new Response("candidate", { status: 401 }) })
    servers.push(remote)
    await using tmp = await tmpdir()

    const response = await Server.Default().app.request("/provider/groq/discover", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-async-coder-directory": tmp.path,
      },
      body: JSON.stringify({ key: "candidate", baseURL: `${remote.url}v1` }),
    })

    expect(response.status).toBe(401)
    const body = await response.text()
    expect(body).toContain("invalid_credentials")
    expect(body).not.toContain("candidate")
  })

  test("allows setup when a built-in provider has no live catalogue", async () => {
    await using tmp = await tmpdir()

    const response = await Server.Default().app.request("/provider/amazon-bedrock/discover", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-async-coder-directory": tmp.path,
      },
      body: JSON.stringify({ key: "candidate" }),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      verified: false,
      source: "configured",
      models: [],
      warning: "Live model discovery is not supported by this provider.",
    })
  })

  test("never sends stored credentials to an overridden URL", async () => {
    const original = process.env.ASYNC_CODER_AUTH_CONTENT
    process.env.ASYNC_CODER_AUTH_CONTENT = JSON.stringify({ groq: { type: "api", key: "stored-secret" } })
    const authorization: string[] = []
    const remote = Bun.serve({
      port: 0,
      fetch: (request) => {
        authorization.push(request.headers.get("authorization") ?? "")
        return Response.json({ data: [{ id: "test-model" }] })
      },
    })
    servers.push(remote)

    try {
      await using tmp = await tmpdir()
      const response = await Server.Default().app.request("/provider/groq/discover", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-async-coder-directory": tmp.path,
        },
        body: JSON.stringify({ baseURL: `${remote.url}v1` }),
      })

      expect(response.status).toBe(200)
      expect(authorization).toEqual([""])
    } finally {
      if (original === undefined) delete process.env.ASYNC_CODER_AUTH_CONTENT
      if (original !== undefined) process.env.ASYNC_CODER_AUTH_CONTENT = original
    }
  })

  test("validates candidate credentials against a configured base URL", async () => {
    const authorization: string[] = []
    const remote = Bun.serve({
      port: 0,
      fetch: (request) => {
        authorization.push(request.headers.get("authorization") ?? "")
        return Response.json({ data: [{ id: "test-model" }] })
      },
    })
    servers.push(remote)
    await using tmp = await tmpdir({
      init: (dir) =>
        Bun.write(
          path.join(dir, "async-coder.json"),
          JSON.stringify({ provider: { groq: { options: { baseURL: `${remote.url}v1` } } } }),
        ),
    })

    const response = await Server.Default().app.request("/provider/groq/discover", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-async-coder-directory": tmp.path,
      },
      body: JSON.stringify({ key: "candidate" }),
    })

    expect(response.status).toBe(200)
    expect(authorization).toEqual(["Bearer candidate"])
  })
})
