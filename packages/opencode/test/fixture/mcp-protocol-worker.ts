import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js"
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js"
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js"
import { createServer } from "node:http"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { Effect } from "effect"

function server() {
  const value = new Server({ name: "protocol-fixture", version: "1.0.0" }, { capabilities: { tools: {} } })
  value.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [{ name: "echo", description: "Echo fixture input", inputSchema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] } }] }))
  value.setRequestHandler(CallToolRequestSchema, async (request) => ({ content: [{ type: "text", text: `echo:${request.params.arguments?.text}` }] }))
  return value
}

const mode = process.argv[2]
if (mode === "stdio-server") {
  await server().connect(new StdioServerTransport())
} else {
  const directory = process.argv[3] ?? await fs.mkdtemp(path.join(os.tmpdir(), "async-coder-mcp-protocol-"))
  process.env.XDG_CONFIG_HOME = path.join(directory, "config")
  process.env.XDG_DATA_HOME = path.join(directory, "data")
  process.env.XDG_CACHE_HOME = path.join(directory, "cache")
  process.env.XDG_STATE_HOME = path.join(directory, "state")
  process.env.HOME = directory
  process.env.USERPROFILE = directory
  process.env.ASYNC_CODER_DISABLE_DEFAULT_PLUGINS = "true"
  process.env.ASYNC_CODER_DISABLE_MODELS_FETCH = "true"
  const transports = new Map<string, WebStandardStreamableHTTPServerTransport>()
  const sse = new Map<string, SSEServerTransport>()
  const http = mode === "http" ? Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: async (request) => {
    const current = transports.get(request.headers.get("mcp-session-id") ?? "")
    if (current) return current.handleRequest(request)
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: () => crypto.randomUUID(), enableJsonResponse: true })
    await server().connect(transport)
    const response = await transport.handleRequest(request)
    if (transport.sessionId) transports.set(transport.sessionId, transport)
    return response
  } }) : undefined
  const legacy = mode === "sse" ? createServer(async (request, response) => {
    if (request.method === "GET") {
      const current = new SSEServerTransport("/messages", response)
      sse.set(current.sessionId, current)
      await server().connect(current)
      return
    }
    const id = new URL(request.url ?? "/", "http://localhost").searchParams.get("sessionId")
    const current = id ? sse.get(id) : undefined
    if (current) return current.handlePostMessage(request, response)
    response.writeHead(404).end()
  }) : undefined
  if (legacy) await new Promise<void>((resolve) => legacy.listen(0, "127.0.0.1", resolve))
  const address = legacy?.address()
  const url = http ? `http://127.0.0.1:${http.port}/mcp` : typeof address === "object" && address ? `http://127.0.0.1:${address.port}/sse` : undefined
  await Bun.write(path.join(directory, "async-coder.json"), JSON.stringify({ mcp: { fixture: url
    ? { type: "remote", url, transport: mode === "sse" ? "sse" : "http", oauth: false, timeout: 3000, enabled: false }
    : { type: "local", command: [process.execPath, import.meta.filename, "stdio-server"], timeout: 3000, enabled: false } } }))
  console.error("MCP fixture: loading application services")
  const { MCP } = await import("../../src/mcp")
  const { Instance } = await import("../../src/project/instance")
  const result = await Instance.provide({ directory, fn: () => Effect.gen(function* () {
    const manager = yield* MCP.Service
    console.error("MCP fixture: connecting")
    yield* manager.connect("fixture")
    const connectedStatus = (yield* manager.status()).fixture
    const connected = connectedStatus.status
    const tools = yield* manager.tools()
    console.error("MCP fixture: calling discovered tool")
    const execute = tools.fixture_echo?.execute
    if (!execute) throw new Error("Fixture MCP tool was not discovered")
    const output = yield* Effect.promise(async () => execute({ text: "roundtrip" }, { toolCallId: "fixture", messages: [] }))
    yield* manager.disconnect("fixture")
    const disconnected = (yield* manager.status()).fixture.status
    yield* manager.connect("fixture")
    console.error("MCP fixture: reconnected")
    const reconnected = (yield* manager.status()).fixture.status
    yield* manager.disconnect("fixture")
    return { connected, toolNames: connectedStatus.status === "connected" ? connectedStatus.tools : undefined, output, disconnected, reconnected }
  }).pipe(Effect.scoped, Effect.provide(MCP.defaultLayer), Effect.runPromise) })
  console.error("MCP fixture: disposing services")
  await Instance.disposeAll()
  http?.stop(true)
  await Promise.all([...sse.values()].map((current) => current.close()))
  legacy?.closeAllConnections()
  if (legacy) await new Promise<void>((resolve) => legacy.close(() => resolve()))
  await Promise.all([...transports.values()].map((current) => current.close()))
  console.log(JSON.stringify(result))
  process.exit(0)
}
