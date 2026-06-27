import { afterEach, describe, expect, test } from "bun:test"
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
})
