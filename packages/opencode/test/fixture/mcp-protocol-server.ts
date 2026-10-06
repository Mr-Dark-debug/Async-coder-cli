import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js"

export function server() {
  const value = new Server({ name: "protocol-fixture", version: "1.0.0" }, { capabilities: { tools: {} } })
  value.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [{ name: "echo", description: "Echo fixture input", inputSchema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] } }] }))
  value.setRequestHandler(CallToolRequestSchema, async (request) => ({ content: [{ type: "text", text: `echo:${request.params.arguments?.text}` }] }))
  return value
}
