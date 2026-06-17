# async-coder

<img width="1983" height="793" alt="async-coder terminal interface" src="https://github.com/user-attachments/assets/5c6019db-4ffe-4f50-8d61-9678e69b260b" />

`async-coder` is a terminal-native AI coding agent for engineers who want an OpenCode-style workflow with first-class support for bring-your-own-key model providers, usage visibility, and configurable web search.

This repository is maintained at:

<https://github.com/Mr-Dark-debug/Async-coder-cli>

## What It Provides

- Terminal-native coding workflow with the existing OpenCode-style TUI, commands, keybindings, sessions, and agent modes.
- First-class provider onboarding for Groq, OpenRouter, OpenAI, Anthropic, Google, xAI, GitHub Copilot, and custom OpenAI-compatible endpoints.
- Per-session usage visibility with token and cost reporting by provider and model.
- Configurable web search through DuckDuckGo, Tavily, Brave Search, Google Custom Search, or Exa.
- Lavender `async-coder` branding with a clean terminal-first visual identity.
- Local SQLite storage with migration support for existing data from the previous fork.

## Installation

Install the CLI from npm:

```bash
npm install -g async-coder
```

Start the TUI:

```bash
async-coder
```

Run a non-interactive prompt:

```bash
async-coder run "explain this repository"
```

Version `0.1.0` is prepared first for Windows x64. Additional platform binary packages can be published from the same build matrix.

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
$env:ASYNC_CODER_VERSION="0.1.0"
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
3. Publish the root `async-coder` package.
4. Create or update the GitHub release for the matching tag.

## License

MIT.
