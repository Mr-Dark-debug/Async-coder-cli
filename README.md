# async-coder

<img width="1983" height="793" alt="async-coder terminal interface" src="https://github.com/user-attachments/assets/5c6019db-4ffe-4f50-8d61-9678e69b260b" />

`async-coder` is a terminal-native AI coding agent for engineers who want an OpenCode-style workflow with first-class support for bring-your-own-key model providers, usage visibility, and configurable web search.

## What It Provides

- MCP servers over stdio, Streamable HTTP and SSE with tool permissions. [Guide](docs/mcp.md)
- Installed language server discovery, diagnostics, definitions, references and symbols. [Guide](docs/lsp.md)
- Specialized agents, bundled skills and bounded lifecycle hooks. [Agents](docs/agents.md), [skills](docs/skills.md), [hooks](docs/hooks.md)
- Isolated Git worktrees and file/conversation checkpoints. [Worktrees](docs/worktrees.md), [checkpoints](docs/checkpoints.md)
- Incremental tree-sitter repository maps across ten language families. [Guide](docs/repo-map.md)
- Desktop session tabs, diffs, lavender theme, completion notifications and tray behavior. [Guide](docs/desktop.md)
- Offline HTML/JSON session exports and existing hosted sharing. [Guide](docs/sharing.md)
- Global, project, local and directory instructions. [Guide](docs/instructions.md)
- Current catalogs, task recommendations and free-model discovery. [Models](docs/models.md), [Zen](docs/zen.md)
- VS Code agent sidebar, editor actions, permission prompts, status and diffs. [Guide](docs/vscode.md)
- TUI conversation search, checkpoint controls and direct shortcuts. [Guide](docs/tui.md)
- Terminal-native coding workflow with the existing OpenCode-style TUI, commands, keybindings, sessions, and agent modes.
- First-class provider onboarding for Groq, OpenRouter, OpenAI, Anthropic, Google, xAI, GitHub Copilot, and custom OpenAI-compatible endpoints.
- Local Ollama onboarding with live model discovery from the local Ollama server.
- Sage consultations: ask a configured second model for an independent opinion with `/consult`, or let the working agent consult Sage when it needs another perspective.
- Guided Sage setup for provider, model, and reasoning level, including credential setup and searchable model selection.
- Per-session usage visibility with token and cost reporting by provider and model.
- Configurable web search through DuckDuckGo, Tavily, Brave Search, Google Custom Search, or Exa.
- Lavender `async-coder` branding with a clean terminal-first visual identity.
- Local SQLite storage with migration support for existing data from the previous fork.

## What's New

- **Background jobs, teams and routines**: detached sessions with their own worktree, spend cap and verification gate; `/jobs`, `async-coder jobs run`, cron routines. [Guide](docs/jobs.md)
- **Verified completion**: a job is done only when its gate passes; receipts with cost, tokens and gate results; draft pull requests on request. [Guide](docs/jobs.md)
- **Budgets**: `usage.budget` caps (session, agent, day, month) with warn, downgrade or stop; per-agent `max_usd` and model fallback chains. [Guide](docs/budgets-and-context.md)
- **`/usage` tabs** for today and this month with a month-end projection, and **`/context`** with a token breakdown and an early-compaction threshold. [Guide](docs/budgets-and-context.md)
- **Auto-recall memory** with a pin/forget browser at `/memory`; `/btw` and `/steer` side notes to a running agent. [Guide](docs/budgets-and-context.md)
- **Safer defaults**: no implicit share host, repository skills load only after `async-coder trust grant`, OS sandbox modes `writes` and `full` (Linux bubblewrap, macOS Seatbelt). [Guide](docs/security.md)
- **More hook events**: user prompt, permission request, compaction, subagent start/stop, notification; `/hooks` toggles them. [Guide](docs/security.md)
- **Sage review for jobs**, risk-gated so a green, low-risk job costs no extra model call; capability aliases `cheap`, `local`, `long-context`. [Guide](docs/remote-and-ecosystem.md)
- **Remote and ecosystem**: device pairing for a running server, chat bridges for Telegram, Discord and Slack, a signed skill/agent/command marketplace, local whisper.cpp dictation, and an eval harness. [Guide](docs/remote-and-ecosystem.md)

## Installation

Install the CLI package from npm:

```bash
npm install -g @async-coder/cli
```

Start the TUI:

```bash
async-coder
```

Run a non-interactive prompt:

```bash
async-coder run "explain this repository"
```

Version `0.2.0` publishes the scoped installer package `@async-coder/cli`. Platform packages such as `@async-coder/binary-windows-x64` are runtime payloads used by the installer and are not the normal user-facing install path.

## Sage Consultations

Sage gives the working agent access to a separately configured model for a second opinion. The working agent knows Sage is available and can consult it when a task is ambiguous or it needs an independent review. You can also invoke Sage directly:

```text
/consult Review this migration plan and identify the riskiest assumption.
```

On first use, async-coder guides you through selecting a provider, model, and reasoning level. If the provider is not configured yet, its existing setup flow opens first and returns you to Sage setup afterward. Change the default later with `/sage-model`.

## Provider Setup

`async-coder` is designed around bring-your-own-key providers. You can add keys from the in-app provider dialog or through environment variables.

Common environment variables:

```bash
GROQ_API_KEY=...
OPENROUTER_API_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
GOOGLE_GENERATIVE_AI_API_KEY=...
```

Custom OpenAI-compatible providers can be configured with:

- Provider ID
- Base URL
- Optional API key
- Model IDs
- Optional input, output, cache-read, and cache-write cost rates

Legacy free-model compatibility is preserved where existing local configuration supports it, but new installations should configure a provider API key for reliable access.

For local models, start Ollama and choose **Ollama (local)** from the provider dialog. async-coder discovers installed models from the local server and makes them available in the normal `/models` picker. Ollama Cloud remains a separate provider option.

## Web Search

The `websearch` tool supports multiple backends:

- `duckduckgo`: default, no API key required
- `tavily`: uses `TAVILY_API_KEY`
- `brave`: uses `BRAVE_API_KEY`
- `google`: uses `GOOGLE_API_KEY` and `GOOGLE_CSE_ID`
- `exa`: uses `EXA_API_KEY`

Example `async-coder.json`:

```json
{
  "websearch": {
    "provider": "duckduckgo",
    "numResults": 8,
    "timeout": 25
  }
}
```

## Configuration

Project configuration lives in `.async-coder/`.

User-level configuration is stored under the normal platform config directories for `async-coder`, such as `~/.config/async-coder` on Linux.

The CLI also supports migration from previous local data locations where possible, including SQLite session data and config directories from the earlier fork.

## Development

This project is Bun-first.

Install dependencies:

```bash
bun install
```

Run checks from package directories:

```bash
cd packages/opencode
bun typecheck
bun test
```

Build the current platform package:

```bash
cd packages/opencode
$env:ASYNC_CODER_VERSION="0.2.0"
$env:ASYNC_CODER_CHANNEL="latest"
bun run script/build.ts --single --skip-install
```

Regenerate the JavaScript SDK when API types change:

```bash
./packages/sdk/js/script/build.ts
```

## Publishing

Detailed npm publishing instructions are available in:

[docs/npm-publish-async-coder.md](docs/npm-publish-async-coder.md)

The short release order is:

1. Build platform binary packages.
2. Publish `@async-coder/binary-*` packages first.
3. Publish the installer package `@async-coder/cli`.
4. Create or update the GitHub release for the matching tag.

## License

MIT.
