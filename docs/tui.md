# Terminal interface

| Shortcut | Action |
| --- | --- |
| Ctrl+P | Command palette |
| Ctrl+N | New session; leader+n remains |
| Ctrl+F | Search visible conversation/tool output |
| Ctrl+T | Worktree controls |
| Ctrl+Shift+T | Cycle model variant |

`/checkpoint` saves a checkpoint; `/rewind` opens restore controls. `/mcp connect NAME` and `/mcp disconnect NAME` control configured servers. `/skill NAME arguments` selects a workflow. The palette retains other commands and leader aliases.

Search excludes synthetic/ignored prompts and unfinished tool input. The footer shows context and token prices. The Zen picker checks authoritative free pricing. Streaming, permissions, tool/agent status and persisted-session recovery use the existing event-driven TUI.
