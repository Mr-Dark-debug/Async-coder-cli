# VS Code extension

Install `@async-coder/cli` and open a trusted local workspace. The async-coder activity-bar view starts an authenticated loopback server. Configure `async-coder.executable` if needed. Untrusted and virtual workspaces are refused.

The sidebar shows messages, model/session status, tools, permission prompts and questions. Editor actions explain selections, generate tests, review files or fix cursor issues. Native diff documents display authoritative backend patches in the file's language. Status follows backend events.

Use the command palette to open the panel or terminal. Existing `opencode.*` command IDs remain compatibility aliases. Ctrl+Esc (Cmd+Esc on macOS) focuses the terminal; Ctrl+Shift+Esc opens another. See the manifest for all bindings.

```sh
cd sdks/vscode
bun install
bun typecheck
bun test
bun run package
```

For development, open this directory and press F5. Real local HTTP/error and manifest tests do not replace an extension-host check.
