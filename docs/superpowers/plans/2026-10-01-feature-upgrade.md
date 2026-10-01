# async-coder 0.2.0 Implementation Plan

> For agentic workers: use Superpowers subagent-driven-development with parallel independent workstreams, followed by integration review and package verification.

**Goal:** Complete the sixteen-part feature upgrade while preserving existing behavior and lavender branding.

**Architecture:** Extend the existing Effect service graph and instance-scoped state. Retain native MCP/LSP/actor/workspace/session implementations; add missing interfaces and integrations. Require factual provider metadata and explicit release evidence.

**Tech Stack:** Bun, strict TypeScript, Effect, SQLite/Drizzle, MCP SDK, web-tree-sitter, Electron, Solid, VS Code APIs.

- [ ] Core integrations: modify `packages/opencode/src/config/{config,mcp,hooks}.ts`, `src/config/service.ts`, `src/mcp/index.ts`, `src/session/instruction.ts`, `src/agent/agent.ts`, `src/skill/index.ts`, `src/plugin/index.ts`. Add bounded hook executor and builtin skills. Test real subprocess hooks and MCP local/remote fixtures, instruction hierarchy, permission restrictions and agent definitions.
- [ ] State operations: extend `src/worktree/index.ts`, add `src/worktree/manage.ts` and CLI/tool interfaces. Add `src/checkpoint/` backed by SQLite and retained Git snapshots. Integrate automatic pre-edit/pre-command checkpoints and explicit restore anchors. Add standalone share HTML/JSON exports. Test modified/new/deleted file restore, conversations, retention, worktree isolation, escaped offline HTML and abortable provider queuing.
- [ ] Repository maps: add `src/repo-map/{types,parser,builder,formatter,index}.ts`, `src/tool/repo-map.ts`, grammar dependency and registry integration. Test real TypeScript/TSX/JS/Python/Go/Rust/Java/C/C++/Ruby parsing, dependency resolution, unchanged parse reuse, deleted files, oversize/outside paths and formatting budgets with `bun test test/repo-map` from `packages/opencode`.
- [ ] Models/Zen: retain live catalog and provider discovery. Add `src/zen/index.ts`, `src/cli/cmd/zen.ts`, CLI registration and tests. Derive free models from authoritative zero pricing, recommend connected models by capability/task/context, estimate known input/output costs. Verify official provider pages and save an attributed metadata snapshot in `docs/models.json`.
- [ ] UI/IDE: extend desktop Electron lifecycle with close-to-tray, real session tabs and existing completion notifications. Extend `sdks/vscode` with a real local API sidebar/actions/status/native diffs and retained command aliases. Improve TUI conversation search, context/pricing/status, preserving existing shortcuts and lavender theme. Run package typechecks, unit tests and builds; report unavailable native host coverage.
- [ ] Documentation: update README/Chinese README, add task-specific guides and working configuration examples. Distinguish inherited functionality, added capabilities and externally controlled services.
- [ ] Integration: register new commands/tools/services; format edited TypeScript, run focused tests then full core suite and package typechecks. Fix regressions; document any independently reproduced baseline/platform failures instead of claiming a clean suite.
- [ ] Release: align public versions at 0.2.0, regenerate SDK, build artifacts and smoke-test. Commit/push preparation; verify npm authentication and publish runtime before installer. Install into a clean prefix and verify executable version. Publish GitHub only after required gates pass; preserve a draft if publication is blocked.

Baseline commands (from `packages/opencode`): `bun test --timeout 30000` and `bun typecheck`. Root installs dependencies with `bun install`. Root serializes commits and lockfile updates to avoid agent conflicts.
