# async-coder

`async-coder` is a multi-provider async coding agent for the terminal.

## Install

```bash
npm install -g async-coder
async-coder
```

## Highlights

- Terminal-native TUI with the existing OpenCode-style workflow
- First-class Groq and OpenRouter onboarding
- OpenAI, Anthropic, Google, xAI, GitHub Copilot, and custom OpenAI-compatible providers
- Per-session usage reporting with tokens and cost by provider/model
- Pluggable web search via DuckDuckGo, Tavily, Brave Search, Google Custom Search, or Exa
- Lavender async-coder theme

## Provider Keys

Use the in-app provider dialog or environment variables such as `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, and `GOOGLE_GENERATIVE_AI_API_KEY`.

Custom OpenAI-compatible providers can be configured with a base URL, optional API key, model IDs, and optional cost rates.

## Web Search

DuckDuckGo works without a key. Keyed providers use:

- `TAVILY_API_KEY`
- `BRAVE_API_KEY`
- `GOOGLE_API_KEY` plus `GOOGLE_CSE_ID`
- `EXA_API_KEY`

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

## Repository

<https://github.com/Mr-Dark-debug/Async-coder-cli>

## License

MIT.
