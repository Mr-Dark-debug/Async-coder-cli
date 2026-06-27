# Sage Provider Setup and Model Discovery Design

## Summary

The Sage model picker currently exposes only connected providers and assumes every selected provider already has usable credentials and models. This causes `/sage-model` to stall or show no useful next step when a user chooses an unconfigured provider.

The improved flow will list every enabled inference provider, reuse the project's existing provider-specific setup wizards, validate credentials or local endpoints when possible, refresh the provider's model catalogue, return automatically to Sage, and then let the user search for a model and choose its reasoning level.

## Goals

- Make every enabled inference provider available from `/sage-model`, including disconnected providers.
- Reuse existing API-key, OAuth, IAM, console-managed, and custom-provider setup flows.
- Return to Sage automatically after provider setup succeeds.
- Validate new credentials before treating setup as complete where a provider exposes a safe model-list endpoint.
- Fetch current provider model lists where supported and retain configured/static metadata as a documented fallback.
- Support local OpenAI-compatible endpoints and Ollama without requiring an API key.
- Present actionable, provider-aware errors without exposing credentials.
- Preserve Sage's provider, searchable model, and reasoning-level steps in both TUI and desktop.

## Non-goals

- Replacing the existing provider settings or `/connect` flows.
- Sending a paid inference request merely to validate a credential.
- Storing credentials in Sage configuration.
- Guaranteeing live discovery for providers that do not expose a model catalogue or whose authentication relies on external IAM.
- Adding providers that are not already available through the provider catalogue or custom-provider flow.

## Root Cause

The desktop Sage dialog reads `providers.connected()`, so disconnected providers never enter the flow. The TUI dialog reads the initialized provider list rather than the full provider catalogue and hardcodes its own provider-to-model transition. Neither Sage dialog has a continuation contract with the existing provider connection components.

The existing connection components also have hardcoded completion behavior: the TUI opens the normal model dialog, while desktop closes after showing a success toast. Consequently, Sage cannot resume its own wizard after authentication.

## User Experience

### Provider step

The provider list uses the server's full enabled provider catalogue. Each row displays one of:

- **Connected**: credentials or configuration are active.
- **Setup required**: the provider needs authentication or configuration.
- **Local**: a custom/local endpoint whose availability is verified by contacting it.

Disabled providers remain hidden because the server already applies `enabled_providers` and `disabled_providers` policy.

### Disconnected provider

Selecting a disconnected provider opens a confirmation view explaining that the provider is not configured. The user can:

- choose **Connect** to launch the existing provider setup flow; or
- choose **Cancel** to return to the Sage provider list without changing Sage configuration.

The setup flow remains provider-specific. API-key providers show the existing key form, OAuth providers use their existing authorization method, and IAM or metadata-driven providers keep their existing prompts.

After setup succeeds, provider state and models refresh. The Sage wizard resumes at the searchable model step for the provider that was just configured.

### Connected provider

Selecting a connected provider refreshes its live model catalogue when supported. A refresh failure shows an actionable error and allows retry, reconnect, or return to the provider list. Previously cached/static models may be offered only when the error explicitly states that the catalogue could not be refreshed.

### Local and custom providers

The Sage provider list includes the existing custom-provider entry. It reuses the custom OpenAI-compatible setup flow and then returns to Sage.

Ollama uses its configured base URL, defaults to `http://localhost:11434` when appropriate, and reads installed models from `GET /api/tags`. If Ollama is unreachable, the error tells the user to start Ollama and verify the base URL. An empty installed-model list explains that a model must be pulled before Sage can be configured.

### Model and reasoning steps

The model list remains searchable by display name and model ID, excludes deprecated and non-text-generation models, and is refreshed after successful setup. Selecting a model opens the existing reasoning-level list containing `Default` plus only variants advertised by that model. Saving changes only the global `advisor` configuration and never changes the working model.

## Architecture

### Continuation contract

Provider setup UI gains an optional completion callback carrying the configured provider ID. Existing callers retain their current behavior when no callback is supplied.

- Desktop `DialogConnectProvider` invokes `onConnected(providerID)` after global disposal and provider refresh.
- TUI provider authentication helpers accept a completion destination instead of always opening `DialogModel`.
- Custom-provider setup accepts the same continuation contract.
- Sage supplies a continuation that restores its wizard with the selected provider and opens the model step.

Cancellation invokes the existing dialog back/close behavior and does not call the continuation.

### Provider discovery and validation

Discovery remains server-side so API keys never enter model-picker components or logs. A provider discovery result distinguishes:

- success with one or more models;
- valid connection with an empty model list;
- authentication failure;
- authorization failure;
- rate limiting;
- network or timeout failure;
- malformed provider response; and
- unsupported live discovery.

Existing model discovery adapters are reused rather than duplicated in Sage. The common fetch layer retains HTTP status and sanitized response details instead of collapsing every non-2xx response into an empty model map.

Provider-specific discovery includes:

- Groq: `GET https://api.groq.com/openai/v1/models` with bearer authentication.
- OpenAI: `GET https://api.openai.com/v1/models` with bearer authentication.
- Anthropic: `GET https://api.anthropic.com/v1/models` with `x-api-key` and `anthropic-version`.
- OpenRouter: `GET https://openrouter.ai/api/v1/models` with bearer authentication.
- Google Gemini: paginated `GET https://generativelanguage.googleapis.com/v1beta/models`, retaining models that support `generateContent`.
- Ollama: `GET {baseURL}/api/tags`, mapping installed model names into the provider model representation.
- OpenAI-compatible/custom providers: `GET {baseURL}/models` when the endpoint supports it.

Other providers continue through their existing adapter. Providers without safe catalogue discovery use their configured/models.dev catalogue and report that validation will occur on first use rather than pretending a live check succeeded.

### Credential persistence

Credentials remain stored by the existing auth service. Where pre-save validation is practical, the candidate credential is validated before replacing stored credentials. OAuth completion uses the token created by the existing callback, followed immediately by discovery.

An invalid candidate must not overwrite a previously working credential. Secrets are never returned in errors, model metadata, telemetry, or configuration patches.

### Refresh behavior

After successful setup or reconnection:

1. dispose the current provider instance;
2. bootstrap provider/auth state;
3. fetch the refreshed provider list;
4. locate the configured provider;
5. return to Sage's model step.

The flow is guarded against double submission and late async completion after dialog cancellation.

## Error Handling

Messages are actionable and localized. The principal mappings are:

- `401`: API key or token is invalid; re-enter credentials.
- `403`: credentials are valid but lack model access; check provider/project permissions.
- `404`: model-list endpoint or local base URL is incorrect.
- `408`/timeout/network error: provider cannot be reached; retry or verify connectivity/base URL.
- `429`: provider rate limit reached; retry later.
- `5xx`: provider is unavailable; retry without losing the current Sage selection.
- malformed response: provider returned an unsupported catalogue format.
- empty list: connection succeeded but no usable text-generation models are available.
- unsupported discovery: credentials/configuration are saved, static configured models are shown with a clear verification notice.

All failures leave the user in a recoverable dialog state with retry, reconnect/edit, and cancel/back options. Raw response bodies, headers, and API keys are never displayed.

## Testing

Tests follow red-green-refactor and cover both pure state transitions and integrated provider flows.

### Shared/provider tests

- all enabled providers are returned independently of connection status;
- disconnected/connected/local status classification;
- provider-specific catalogue parsing;
- authentication, authorization, rate-limit, timeout, malformed, and empty-list errors;
- candidate credentials are not persisted after failed validation;
- previous valid credentials are preserved;
- Ollama model mapping and unreachable/empty-server behavior;
- Gemini pagination and `generateContent` filtering;
- custom OpenAI-compatible `/models` discovery.

### TUI tests

- `/sage-model` shows disconnected providers;
- selecting a disconnected provider launches the existing auth flow;
- successful auth resumes Sage at the correct provider's model step;
- cancellation returns to the provider list;
- provider errors remain actionable;
- search and reasoning selection still work.

### Desktop tests

- the provider list includes all enabled providers with statuses;
- existing `DialogConnectProvider` continuation fires once on success and never on cancel/failure;
- custom provider continuation returns to Sage;
- refreshed model list is searchable;
- saving Sage does not alter the working model.

### Verification

- focused provider, TUI, and desktop tests;
- `bun typecheck` from each changed package;
- JavaScript SDK regeneration and typecheck if the API schema changes;
- production documentation/app builds where changed;
- manual development verification of API-key failure, successful connection, local Ollama failure, model search, reasoning selection, cancellation, and Sage persistence.

## Rollout and Compatibility

The continuation callback is optional, preserving existing `/connect` and settings behavior. Existing `advisor` configuration remains valid. No credentials migrate into configuration. New API/schema fields, if required, remain additive and the JavaScript SDK is regenerated with the repository script.

## Security and Privacy

- Credential validation and model discovery run server-side.
- Secrets are redacted from errors and excluded from logging.
- No test performs paid inference.
- Local endpoints are contacted only after explicit user selection/configuration.
- Sage stores only `provider/model` and optional reasoning variant.
