import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { server } from "./mcp-protocol-server"

await server().connect(new StdioServerTransport())
