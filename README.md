# async-coder

`async-coder` is a terminal-native AI coding agent built with Bun, TypeScript, SolidJS TUI, Effect, SQLite, and the Vercel AI SDK.

This fork is published from <https://github.com/Mr-Dark-debug/Async-coder-cli>.

## Install

```bash
npm install -g async-coder
```

Run the TUI:

```bash
async-coder
```

Run a non-interactive prompt:

```bash
async-coder run "explain this repository"
```

## Providers

async-coder is built around bring-your-own-key providers. Groq and OpenRouter are surfaced first in onboarding, followed by OpenAI, Anthropic, Google, xAI, GitHub Copilot, and custom OpenAI-compatible endpoints.

The legacy free model channel is kept for existing local configs where possible, but new users should configure a provider API key.

## Web Search

The `websearch` tool supports:

- DuckDuckGo by default with no API key
- Tavily with `TAVILY_API_KEY`
- Brave Search with `BRAVE_API_KEY`
- Google Custom Search with `GOOGLE_API_KEY` and `GOOGLE_CSE_ID`
- Exa with `EXA_API_KEY`

Configure the backend in `async-coder.json`:

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

Project config lives in `.async-coder/` and user config is stored under the normal XDG locations for `async-coder`. Existing local data from the previous fork is copied forward on first launch when possible.

## Development

```bash
bun install
bun typecheck
bun test
```

Run package-level checks from package directories, for example:

```bash
cd packages/opencode
bun typecheck
bun test
```

## License

MIT.
