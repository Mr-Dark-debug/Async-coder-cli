# Safety defaults, sandbox and trust

## Sharing

`/share` uploads a conversation, so there is **no default host**. Set `enterprise.url` (or `ASYNC_CODER_SHARE_URL`)
to the service you choose; without one, sharing fails with a clear message. Offline export is always available.

## Project skills

Skills from your user directories always load. Skills inside a repository (`.claude`, `.codex`, `.opencode`
folders) **do not load until you trust the project**:

```bash
async-coder trust status
async-coder trust grant      # after reviewing the repo's skills
async-coder trust revoke
```

or set `skills.trust_project: true`, or `ASYNC_CODER_TRUST_PROJECT_SKILLS=1`. Trust is per directory and revocable.
(Project-level MCP servers and plugins are not yet behind this gate.)

## Sandbox

```json
{ "sandbox": { "mode": "writes", "writable_paths": ["~/.cache"], "allowed_hosts": [] } }
```

- `off`: no confinement. `writes`: shell commands and file tools can only write inside the project, the temp
  directory and `writable_paths`. `full`: `writes` plus no outbound network.
- Linux uses **bubblewrap** (`bwrap` must be installed); macOS uses `sandbox-exec` with a generated profile. If no backend is
  available the command is **denied** rather than run unconfined. Windows has no backend, so confined modes refuse to
  run shell commands there; use `off`.
- Hosts: on macOS `allowed_hosts` accepts IP addresses and `localhost`; on Linux bwrap cannot filter by host, so a
  non-empty list in `full` mode is refused instead of silently ignored.
- Interactive commands are disabled in confined modes. `ASYNC_CODER_DISABLE_SANDBOX=1` bypasses it (for CI).
- `/sandbox` cycles the mode; the footer shows it. Permission rules still apply on top.
- Not implemented: a Landlock helper binary and per-process seccomp filters.

## Hooks

```json
{ "hooks": [{ "id": "log", "event": "post_command", "command": "echo \"$ASYNC_CODER_HOOK_EVENT\" >> hooks.log" }] }
```

Events: `pre_tool_use`, `post_tool_use`, `pre_file_edit`, `post_file_edit`, `pre_command`, `post_command`,
`session_start`, `session_end`, `message_sent`, `user_prompt_submit`, `message_received`, `agent_start`, `agent_end`,
`subagent_start`, `subagent_stop`, `permission_request`, `compact_before`, `compact_after`, `notification`, `error`.
`pre_*` hooks block on a non-zero exit or `{"decision":"block","reason":"…"}` on stdout. `permission_request`,
`compact_*`, `notification` and `subagent_*` are notification-only. `/hooks` lists hooks and toggles `enabled`.
