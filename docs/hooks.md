# Lifecycle shell hooks

Add a `hooks` array to `async-coder.json`, `.async-coder/hooks.json`, or the user configuration directory's `hooks.json`:

```json
{
  "hooks": [
    { "id": "before-shell", "event": "pre_command", "command": "bun scripts/check-command.ts", "timeout": 5000, "condition": "tool === 'bash'" },
    { "id": "after-edit", "event": "post_file_edit", "command": "bun scripts/check-edit.ts", "timeout": 10000 }
  ]
}
```

Supported events are `pre_tool_use`, `post_tool_use`, `pre_file_edit`, `post_file_edit`, `pre_command`, `post_command`, `session_start`, `session_end`, `message_sent`, `message_received`, `agent_start`, `agent_end`, and `error`. Shell and file events use the existing tool lifecycle; session and actor events use the event bus. `session_end` means session deletion. Main-agent start follows a new chat message and end follows session idle; subagent start/end follow actor running/idle transitions. A failed actor also raises `error`. Existing TypeScript/JavaScript hooks and plugin hooks remain available.

Commands run in the project directory with PowerShell on Windows and `/bin/sh` elsewhere. The default timeout is 10 seconds. Timed-out process trees are terminated. Hooks receive a JSON envelope on stdin plus these environment variables:

- `ASYNC_CODER_HOOK_EVENT`: lifecycle event name.
- `ASYNC_CODER_HOOK_INPUT`: JSON lifecycle input.
- `ASYNC_CODER_HOOK_OUTPUT`: JSON output object when present.
- `TOOL_INPUT`: JSON tool arguments for before and after tool events, otherwise lifecycle input.
- `FILE_PATH`: the edit tool's `filePath` when present.

A before-hook nonzero exit or timeout prevents the tool from running. It can also print `{"decision":"block","reason":"Explanation"}` to stdout. A successful hook can print `{"context":"Additional context"}`; context is appended to tool output or text output when that lifecycle exposes one. Post-hook failures are logged and preserve the completed tool result.

Conditions support tool comparisons such as `tool === 'bash'`, `tool == 'write'`, and their inequality forms. Arbitrary JavaScript expressions are not evaluated. An unsupported condition does not match.

Configuration files contain executable local commands; use hooks you understand. Hook permissions follow the configuration's existing trust boundary and are not a sandbox.
