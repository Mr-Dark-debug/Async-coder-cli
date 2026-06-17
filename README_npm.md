# async-coder

`async-coder` is a terminal-native AI coding agent with a multi-provider model workflow, usage reporting, and configurable web search.

It builds on the OpenCode-style terminal experience while focusing on bring-your-own-key providers such as Groq, OpenRouter, OpenAI, Anthropic, Google, xAI, GitHub Copilot, and custom OpenAI-compatible endpoints.

## Install

```bash
npm install -g async-coder
```

Start the terminal interface:

```bash
async-coder
```

Run a prompt without opening the TUI:

```bash
async-coder run "summarize the current project"
```

Version `0.1.0` is prepared first for Windows x64. Additional platform binaries can be published from the same build matrix.

## Highlights

- Terminal-native coding agent with sessions, agent modes, tools, and command workflows.
- Provider onboarding for Groq, OpenRouter, OpenAI, Anthropic, Google, xAI, GitHub Copilot, and custom OpenAI-compatible APIs.
- Token and cost reporting by provider and model.
- Configurable web search using DuckDuckGo, Tavily, Brave Search, Google Custom Search, or Exa.
- Local SQLite storage for sessions and usage data.
- Lavender terminal theme and `async-coder` branding.

## Provider Keys

Add provider credentials in the app through the provider dialog, or set environment variables before launching:

```bash
GROQ_API_KEY=...
OPENROUTER_API_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
GOOGLE_GENERATIVE_AI_API_KEY=...
```

Custom OpenAI-compatible providers can be configured with a base URL, optional API key, model IDs, and optional cost rates.

Legacy free-model compatibility is preserved for existing local configurations where possible. For new setups, configure a provider API key for reliable model access.

## Web Search

DuckDuckGo works without an API key and is the default backend.

Keyed backends use:

- `TAVILY_API_KEY`
- `BRAVE_API_KEY`
- `GOOGLE_API_KEY` plus `GOOGLE_CSE_ID`
- `EXA_API_KEY`

Configure web search in `async-coder.json`:

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

User configuration and local data are stored under the platform config/data directories for `async-coder`. Existing data from the previous fork is copied forward on first launch when possible.

## Repository

<https://github.com/Mr-Dark-debug/Async-coder-cli>

## License

MIT.
