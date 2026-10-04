# VS Code extension

Install `@async-coder/cli` and open a trusted local workspace. The async-coder activity-bar view starts an authenticated loopback server. Configure `async-coder.executable` if needed. Untrusted and virtual workspaces are refused.

The sidebar shows messages, session status, tools, permission prompts and questions. Editor actions explain selections, generate tests, review files or fix cursor issues. Read-only diff documents display authoritative backend patches using VS Code's diff language. Status polls the authenticated backend while a session is open, including when the sidebar is hidden.

Use the command palette to open the panel or terminal. Existing `opencode.*` command IDs remain compatibility aliases. Ctrl+Esc (Cmd+Esc on macOS) focuses the terminal; Ctrl+Shift+Esc opens another. See the manifest for all bindings.

```sh
cd sdks/vscode
bun install
bun typecheck
bun test
bun run package
```

For development, open this directory and press F5. Real local HTTP/error and manifest tests do not replace an extension-host check.

The extension manifest intentionally has no Marketplace publisher identity. Set a verified publisher owned by this project before packaging a VSIX or publishing to the Marketplace; the upstream publisher account is not this project's account.
