# Code intelligence

The `lsp` agent tool provides definitions, references, hover information, document and workspace symbols, implementations, call hierarchy, completions, rename preparation, proposed rename edits, and file diagnostics. It is available in the normal tool registry. Edit tools refresh diagnostics so agents can repair errors introduced by a change.

When `lsp` is omitted from configuration, async-coder discovers installed servers on PATH and in project or ancestor `node_modules/.bin` directories. It starts matching servers lazily when a file is used. This default does not download servers. The discovery catalog covers TypeScript/JavaScript, Python, Rust, Go, C/C++, Java, Ruby, PHP, HTML, CSS, JSON, Bash, and YAML. Missing-server errors include installation hints.

Set `"lsp": false` to disable intelligence. Set `"lsp": true` to use the larger existing built-in registry, including its established download behavior. A configuration object enables built-ins and allows custom server overrides:

```json
{
  "lsp": {
    "typescript": { "command": ["typescript-language-server", "--stdio"], "extensions": [".ts", ".tsx", ".js", ".jsx"] },
    "custom": { "command": ["my-server", "--stdio"], "extensions": [".custom"], "env": { "LOG_LEVEL": "warning" } }
  }
}
```

Example agent tool calls:

```json
{ "operation": "diagnostics", "filePath": "src/app.ts" }
{ "operation": "hover", "filePath": "src/app.ts", "line": 12, "character": 5 }
{ "operation": "workspaceSymbol", "filePath": "src/app.ts", "query": "App" }
{ "operation": "rename", "filePath": "src/app.ts", "line": 12, "character": 5, "newName": "RenamedApp" }
```

Line and character values are one-based and default to 1. Workspace searches use the optional query. `rename` requires `newName` and returns the server's proposed workspace edit; it does not write files. Review the proposal and apply it through normal permission-checked edit tools. Diagnostics use published notifications and `textDocument/diagnostic` requests when the server advertises pull diagnostics. Status includes a diagnostic count for each client. Servers initialize through the LSP handshake and receive open/change/close notifications; dead clients are replaced when a matching file is next used. Initialization failures are logged and do not terminate the application.
