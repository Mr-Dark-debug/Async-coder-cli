# Models and pricing

async-coder obtains provider models from [models.dev](https://models.dev/) and merges configured providers, credentials and local discovery. Catalogs are validated before cache replacement. Prices are USD per million tokens; estimates are not invoices. Input, output and cache rates remain distinct.

Use `async-coder models`, the TUI picker or `async-coder zen --all --task coding`. Credentials and API access determine actual availability. Unknown custom-model context metadata defaults conservatively to 200,000 tokens; configure the actual limit.

[models.json](models.json) records requested names, matching catalog identifiers, limits and pricing checked October 1, 2026. It is an audit snapshot, not the runtime source. Empty matches mean an identifier was not confirmed. Do not infer every provider offers a million-token window.

Provider references: [Anthropic](https://platform.claude.com/docs/en/models/overview), [OpenAI](https://developers.openai.com/api/docs/models), [Google](https://ai.google.dev/gemini-api/docs/models), [Mistral Large 3](https://docs.mistral.ai/models/mistral-large-3-25-12), and [xAI](https://docs.x.ai/developers/models). Documentation and API availability take precedence over cached snapshots.

Recommendations score capability/name signals for coding, review, planning, writing or quick tasks, then output cost and release metadata. These are heuristics, not benchmark claims. See [reliability](reliability.md) for queues and explicit fallback.
