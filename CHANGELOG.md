# Changelog

## 0.2.0 (2026-10-04)

### Added

- Background jobs (`/jobs`, `async-coder jobs`, `/job` API): detached sessions with optional worktree isolation, spend cap, verification gates with retries, deterministic receipts, draft pull requests, and completion notifications with quiet hours.
- Teams (`.async-coder/team/*.md`, `/team`, `jobs team*`): parallel workers on their own branches, sequential merge that stops at the first conflict, reassignment.
- Routines: cron-triggered jobs from the server process (`routines` config).
- Spend caps `usage.budget` (session, agent, daily, monthly) with warn, downgrade and stop; per-agent `max_usd` and `fallback` chains with a visible fallback notice.
- `/usage` Today and Month tabs with a month-end projection and `GET /usage/summary`; `/context` inspector, footer context meter and `compaction.threshold`.
- Memory auto-recall (`memory.auto`, `recall_limit`, `token_budget`) and `/memory` browser with pin and forget.
- `/btw` and `/steer` side-channel notes (`POST /session/:id/btw`), rendered muted in the transcript.
- Sandbox modes (`sandbox.mode`: `off`, `writes`, `full`) for shell commands and file tools; `/sandbox` and a footer indicator.
- Hook events `user_prompt_submit`, `permission_request`, `subagent_start`, `subagent_stop`, `compact_before`, `compact_after`, `notification`, and a per-hook `enabled` flag; `/hooks` dialog.
- Sage review pipeline for jobs (`sage` config) and capability aliases `cheap`, `local`, `long-context`.
- Device pairing (`async-coder pair`, `/pair`), chat bridges for Telegram, Discord and Slack (`async-coder bridge`), signed marketplace (`async-coder market`), local whisper.cpp transcription, and an eval harness (`async-coder eval`).

### Changed

- `/share` no longer defaults to an upstream host; set `enterprise.url` or `ASYNC_CODER_SHARE_URL`.
- A repository's own `.claude`/`.codex`/`.opencode` skills load only after `async-coder trust grant` (or `skills.trust_project`). **Breaking** for projects relying on repo-provided skills.


### Added (foundation work)

- MCP configuration compatibility and SSE protocol tests.
- Installed LSP discovery and close/restart handling.
- Specialized agents, bundled skills, hooks and hierarchical instructions.
- Worktree commands/tools and file/conversation checkpoints.
- Incremental tree-sitter maps, symbols and dependencies.
- Desktop session tabs, lavender theme and tray lifecycle.
- Offline HTML/JSON exports and read-only import.
- Validated catalogs, recommendations and free-model discovery.
- VS Code sidebar, editor actions, permissions and native diffs.
- TUI search, checkpoints, direct shortcuts and feature guides.

### Changed (foundation work)

- Bounded provider concurrency across streams and rate-limit cooldowns.
- Explicit transient fallback before content/tool execution.
- Regenerated typed checkpoint/export session APIs.

### Fixed (foundation work)

- Cross-drive Windows workspace containment.
- Native memory paths and CRLF metadata parsing.
- Both-stream subprocess output handling.
- Conservative context defaults for unknown custom models.
