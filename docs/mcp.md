# MCP servers

async-coder uses the official MCP TypeScript SDK for local stdio servers and remote Streamable HTTP or SSE servers. Tools are discovered automatically and exposed to agents with a server-name prefix. `/mcp` lists configured servers, connection and authentication state, and available tool names. Connect with `/mcp connect <name>` and disconnect with `/mcp disconnect <name>`, or toggle a server in the dialog. CLI administration is available through `async-coder mcp --help`.

Configure native entries in `async-coder.json`:

```json
{
  "mcp": {
    "filesystem": { "type": "local", "command": ["npx", "-y", "@modelcontextprotocol/server-filesystem", "."] },
    "remote": { "type": "remote", "url": "https://example.com/mcp", "transport": "http", "oauth": false }
  }
}
```

The compatible `mcpServers` field accepts `command`, `args`, `env`, `url`, `transport`, `headers`, `timeout`, `enabled`, and `autoStart`. `autoStart: false` keeps a server disabled until explicitly connected. Native `mcp` entries win a name collision within the same config file.

Standalone `.async-coder/mcp.json` and the user config directory's `mcp.json` accept either a `mcpServers` wrapper, a native `mcp` wrapper, or a bare server-name map. User config normally lives at `~/.config/async-coder`; XDG configuration and the existing platform path resolver remain supported. Project configuration overrides user defaults.

```json
{
  "mcpServers": {
    "local": { "command": "bun", "args": ["server.ts"], "env": { "API_KEY": "{env:MY_API_KEY}" }, "timeout": 10000 },
    "legacy": { "url": "https://example.com/sse", "transport": "sse" }
  }
}
```

Remote servers without an explicit transport try Streamable HTTP, then SSE. An explicit transport selects only that protocol. OAuth-capable servers retain the existing browser authentication flow. Imported Claude Code servers remain opt-in connections under the existing compatibility policy. Timeout failures close transports so local children do not leak.

Protocol integration tests use actual SDK fixture servers over all three transports and exercise initialization, discovery, tool calls, disconnect, and reconnect. They do not establish that an arbitrary third-party server is available or correctly configured.
