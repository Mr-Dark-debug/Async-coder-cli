# async-coder

`async-coder` is a terminal-native AI coding agent for developers who want one focused command-line workspace across multiple model providers.

It keeps the OpenCode-style terminal workflow while adding first-class bring-your-own-key onboarding, lavender branding, usage visibility, and configurable web search.

## Install

```bash
npm install -g @async-coder/cli
```

Launch the terminal interface:

```bash
async-coder
```

Run a prompt without opening the TUI:

```bash
async-coder run "summarize the current project"
```

The npm package `@async-coder/cli` is the user-facing installer. Platform runtime packages under `@async-coder/binary-*` are installed automatically when a matching build is available and should not be installed directly.

The current npm release includes the Windows x64 runtime. Linux and macOS users can build from source until their platform runtime packages are published.

## Highlights

- Terminal-native coding agent with sessions, agent modes, tools, and command workflows.
- Provider onboarding for Groq, OpenRouter, OpenAI, Anthropic, Google, xAI, GitHub Copilot, and custom OpenAI-compatible APIs.
- Local Ollama onboarding with live discovery of installed models.
- Sage second-opinion consultations, triggered directly with `/consult` or automatically by the working agent when useful.
- Guided Sage provider, model, credential, and reasoning-level setup through `/sage-model`.
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

Local Ollama is available separately from Ollama Cloud. Start the local Ollama server, connect **Ollama (local)**, then choose any discovered model from `/models`.

Legacy free-model compatibility is preserved for existing local configurations where possible. For new setups, configure a provider API key for reliable model access.

## Sage

Use `/consult` to ask a separately configured Sage model for an independent opinion. The working agent can also call Sage automatically when it is uncertain or would benefit from another perspective.

The first consultation opens guided setup for the Sage provider, model, and reasoning level. Providers without credentials reuse their normal configuration flow, then return to Sage setup automatically. Use `/sage-model` whenever you want to change the selection.

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

## Platform Packages

Runtime packages such as `@async-coder/binary-windows-x64` are implementation details used by `@async-coder/cli`. They appear on npm because npm installs platform-specific executables through separate optional packages.

For normal use, install only:

```bash
npm install -g @async-coder/cli
```

If a platform runtime is not published yet, the installer will report the missing package name. Build from source for that platform, or wait for the corresponding `@async-coder/binary-*` package to be released.

## Repository

<https://github.com/Mr-Dark-debug/Async-coder-cli>

## License

MIT.
