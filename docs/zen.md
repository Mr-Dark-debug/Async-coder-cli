# Async-coder Zen

```sh
async-coder zen --task coding
async-coder zen --task review --context 128000 --json
async-coder zen --all --task quick --input 10000 --output 2000
```

Remote models qualify as free only when authoritative catalog input/output/cache prices and effective input/output costs are zero, tool calling is supported and the model is not deprecated. Unknown pricing does not qualify merely because an internal default is zero.

The inherited `opencode` provider supports its upstream public free endpoint when the catalog advertises free models. Availability and quotas are controlled upstream. This repository does not operate an independent hosted Zen service. Other providers, including OpenRouter and Groq, can require credentials even for free-priced models. [OpenRouter authentication](https://openrouter.ai/docs/api_reference/authentication), [OpenCode Zen](https://opencode.ai/docs/zen/).

The picker labels qualifying models `Zen (Free)`. Price is separate from authentication and live availability. If none match, Zen reports the absence and suggests provider setup, local Ollama or `--all`. The routing helper permits an explicit fallback and does not silently spend money. Tests cover prices, deprecated models, context filtering, recommendations, fallback and arithmetic.
