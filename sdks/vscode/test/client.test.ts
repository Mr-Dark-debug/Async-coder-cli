import { afterEach, describe, expect, test } from "bun:test"
import { AgentClient } from "../src/client"

const servers: ReturnType<typeof Bun.serve>[] = []
afterEach(() => servers.splice(0).forEach((server) => server.stop(true)))

describe("IDE client", () => {
  test("uses authenticated project-scoped HTTP for session actions", async () => {
    const requests: { path: string; body: unknown }[] = []
    const server = Bun.serve({ port: 0, hostname: "127.0.0.1", async fetch(request) {
      expect(request.headers.get("authorization")).toBe(`Basic ${Buffer.from("async-coder:private").toString("base64")}`)
      expect(new URL(request.url).searchParams.get("directory")).toBe("D:\\project with spaces")
      const path = new URL(request.url).pathname
      requests.push({ path, body: request.method === "POST" ? await request.json() : undefined })
      if (path.endsWith("prompt_async")) return new Response(null, { status: 204 })
      if (path === "/session" && request.method === "POST") return Response.json({ id: "one", title: "VS Code session" })
      if (path === "/session/status") return Response.json({ one: { type: "busy" } })
      if (path === "/permission") return Response.json([{ id: "p", sessionID: "other" }, { id: "q", sessionID: "one", permission: "bash", patterns: ["bun test"] }])
      if (path === "/question") return Response.json([])
      return Response.json([])
    } })
    servers.push(server)
    const client = new AgentClient(server.url.toString(), "D:\\project with spaces", "private")
    expect((await client.create()).id).toBe("one")
    await client.prompt("one", "Review @src/a.ts", undefined, "review")
    expect(requests[1].body).toEqual({ parts: [{ type: "text", text: "Review @src/a.ts" }], agent: "review" })
    const snapshot = await client.snapshot("one")
    expect(snapshot.status.type).toBe("busy")
    expect(snapshot.permissions.map((item) => item.id)).toEqual(["q"])
    await client.abort("one")
    expect(requests.at(-1)?.path).toBe("/session/one/abort")
  })

  test("reports server failures instead of claiming a successful action", async () => {
    const server = Bun.serve({ port: 0, fetch: () => new Response("Provider unavailable", { status: 503 }) })
    servers.push(server)
    const client = new AgentClient(server.url.toString(), "/project", "private")
    await expect(client.create()).rejects.toThrow("503 Provider unavailable")
  })

  test("manifest contributes a sidebar, requested commands and backwards-compatible aliases", async () => {
    const manifest = await Bun.file("./package.json").json()
    expect(manifest.contributes.views["async-coder"][0]).toMatchObject({ id: "async-coder.agent", type: "webview" })
    expect(manifest.contributes.commands.map((item: { command: string }) => item.command)).toEqual(expect.arrayContaining([
      "async-coder.openPanel", "async-coder.explainSelection", "async-coder.generateTests", "async-coder.reviewFile", "async-coder.fixIssue",
      "opencode.openTerminal", "opencode.openNewTerminal", "opencode.addFilepathToTerminal",
    ]))
    expect(manifest.capabilities.untrustedWorkspaces.supported).toBe(false)
  })
})
