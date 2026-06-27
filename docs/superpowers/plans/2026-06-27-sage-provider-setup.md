# Sage Provider Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/sage-model` configure disconnected, cloud, custom, and local providers through existing setup flows, validate credentials/endpoints, refresh models, and resume Sage automatically.

**Architecture:** Add a server-side provider discovery boundary that can validate candidate credentials without persisting them, reuse it during provider initialization, and expose it through an additive provider route. Give existing desktop and TUI provider setup components optional continuations so Sage can resume after setup while ordinary `/connect` behavior remains unchanged.

**Tech Stack:** Bun, TypeScript, Effect, Zod/Effect Schema, Hono, SolidJS, OpenTUI, generated JavaScript SDK.

---

## File map

- `packages/opencode/src/provider/discovery.ts`: provider-neutral discovery result/error types plus Groq, OpenAI, Anthropic, OpenRouter, Gemini, Ollama, and OpenAI-compatible adapters.
- `packages/opencode/src/provider/provider.ts`: consume discovery adapters during provider initialization without swallowing actionable failures in explicit validation calls.
- `packages/opencode/src/server/routes/instance/provider.ts`: additive candidate-validation/model-discovery endpoint.
- `packages/opencode/src/server/routes/instance/httpapi/provider.ts`: matching Effect HTTP API endpoint.
- `packages/opencode/test/provider/discovery.test.ts`: real local HTTP-server tests for headers, parsing, pagination, failure mapping, and secret redaction.
- `packages/opencode/test/server/provider-discovery.test.ts`: endpoint contract tests.
- `packages/app/src/components/dialog-provider-continuation.ts`: pure provider status and continuation helpers shared by desktop tests/UI.
- `packages/app/src/components/dialog-connect-provider.tsx`: optional success/cancel continuation and pre-save candidate validation.
- `packages/app/src/components/dialog-custom-provider.tsx`: optional continuation and local/OpenAI-compatible discovery.
- `packages/app/src/components/dialog-advisor-setup.tsx`: all-provider picker, status labels, connection handoff, refresh, and resume.
- `packages/app/src/components/dialog-advisor-setup.test.ts`: disconnected-provider and resume-state tests.
- `packages/opencode/src/cli/cmd/tui/component/dialog-provider.tsx`: optional completion destination for API/OAuth/custom provider setup.
- `packages/opencode/src/cli/cmd/tui/component/dialog-advisor-setup.tsx`: all-provider picker and provider-flow continuation.
- `packages/opencode/test/cli/cmd/tui/advisor-setup.test.ts`: TUI state/status/continuation tests.
- `packages/app/src/i18n/en.ts` and `packages/opencode/src/cli/cmd/tui/i18n/en.ts`: actionable setup/discovery messages.
- `packages/web/src/content/docs/agents.mdx` and `packages/web/src/content/docs/config.mdx`: document provider setup and local discovery.
- `packages/sdk/js/src/v2/gen/*`: regenerated API client/types.

### Task 1: Provider discovery contract and error mapping

**Files:**
- Create: `packages/opencode/src/provider/discovery.ts`
- Create: `packages/opencode/test/provider/discovery.test.ts`
- Modify: `packages/opencode/src/provider/index.ts`

- [ ] **Step 1: Write failing contract tests**

Create tests that import `ProviderDiscovery.classifyResponse`, `ProviderDiscovery.redactMessage`, and `ProviderDiscovery.modelEndpoint`. Assert:

```ts
expect(ProviderDiscovery.classifyResponse(401)).toEqual({ code: "invalid_credentials", retryable: false })
expect(ProviderDiscovery.classifyResponse(403)).toEqual({ code: "permission_denied", retryable: false })
expect(ProviderDiscovery.classifyResponse(429)).toEqual({ code: "rate_limited", retryable: true })
expect(ProviderDiscovery.classifyResponse(503)).toEqual({ code: "provider_unavailable", retryable: true })
expect(ProviderDiscovery.redactMessage("bad sk-secret-value", "sk-secret-value")).not.toContain("sk-secret-value")
expect(ProviderDiscovery.modelEndpoint("ollama", "http://localhost:11434/v1")).toBe(
  "http://localhost:11434/api/tags",
)
```

- [ ] **Step 2: Run the test and confirm RED**

Run from `packages/opencode`:

```powershell
bun test test/provider/discovery.test.ts
```

Expected: FAIL because `provider/discovery` does not exist.

- [ ] **Step 3: Implement the minimal typed contract**

Define:

```ts
export const ErrorCode = z.enum([
  "invalid_credentials",
  "permission_denied",
  "not_found",
  "rate_limited",
  "timeout",
  "network",
  "provider_unavailable",
  "invalid_response",
  "empty_models",
])

export class DiscoveryError extends Error {
  constructor(
    readonly code: z.infer<typeof ErrorCode>,
    message: string,
    readonly retryable: boolean,
  ) {
    super(message)
  }
}

export function classifyResponse(status: number) {
  if (status === 401) return { code: "invalid_credentials" as const, retryable: false }
  if (status === 403) return { code: "permission_denied" as const, retryable: false }
  if (status === 404) return { code: "not_found" as const, retryable: false }
  if (status === 429) return { code: "rate_limited" as const, retryable: true }
  return { code: "provider_unavailable" as const, retryable: status >= 500 }
}
```

Normalize Ollama base URLs by removing `/v1` before adding `/api/tags`; normalize other OpenAI-compatible endpoints by adding `/models` once.

- [ ] **Step 4: Run the contract tests and confirm GREEN**

Run `bun test test/provider/discovery.test.ts`; expected: all contract tests pass.

- [ ] **Step 5: Commit**

```powershell
git add packages/opencode/src/provider/discovery.ts packages/opencode/src/provider/index.ts packages/opencode/test/provider/discovery.test.ts
git commit -m "feat(provider): add model discovery contract"
```

### Task 2: Live provider adapters

**Files:**
- Modify: `packages/opencode/src/provider/discovery.ts`
- Modify: `packages/opencode/src/provider/provider.ts`
- Modify: `packages/opencode/test/provider/discovery.test.ts`
- Modify: `packages/opencode/test/provider/provider.test.ts`

- [ ] **Step 1: Add failing local-server adapter tests**

Use `Bun.serve({ port: 0, fetch(request) { ... } })` instead of mocks. Cover:

```ts
await expect(discover({ providerID: "groq", key: "good", baseURL: server.url.href })).resolves.toMatchObject({
  verified: true,
  models: [{ id: "llama-3.3-70b-versatile" }],
})
expect(seenHeaders.authorization).toBe("Bearer good")

await expect(discover({ providerID: "anthropic", key: "good", baseURL: server.url.href })).resolves.toMatchObject({
  verified: true,
})
expect(seenHeaders["x-api-key"]).toBe("good")
expect(seenHeaders["anthropic-version"]).toBe("2023-06-01")
```

Add Gemini pagination with two pages and filter out a model whose `supportedGenerationMethods` omits `generateContent`. Add Ollama `{ models: [{ name: "qwen3:8b" }] }`, malformed JSON, empty list, timeout, and 401/403/429/500 cases.

- [ ] **Step 2: Run and confirm RED**

Run `bun test test/provider/discovery.test.ts`; expected failures identify missing `discover` behavior.

- [ ] **Step 3: Implement adapters with one fetch boundary**

Implement:

```ts
export type Input = {
  providerID: string
  key?: string
  baseURL?: string
  signal?: AbortSignal
}

export type Result = {
  verified: boolean
  source: "live" | "configured"
  models: DiscoveredModel[]
  warning?: string
}

export async function discover(input: Input): Promise<Result>
```

Use provider-specific request construction for the five documented cloud providers and Ollama. Use the OpenAI-compatible adapter for configured custom providers. Parse only model identifiers and metadata needed by `discoveredModel`; never include response headers or credentials in returned errors. Apply a 10-second timeout combined with the caller signal.

If a provider has no safe live catalogue adapter, return `{ verified: false, source: "configured", models: [], warning: "Live model discovery is not supported by this provider." }` rather than claiming verification.

- [ ] **Step 4: Replace duplicated discovery fetches in `provider.ts`**

Keep `discoveredModel` as the conversion boundary, but make current OpenAI/Anthropic/Groq/OpenRouter/Google discovery loaders call `ProviderDiscovery.discover`. Explicit validation propagates `DiscoveryError`; background provider initialization logs the sanitized error and retains configured/models.dev models.

- [ ] **Step 5: Run provider tests and confirm GREEN**

```powershell
bun test test/provider/discovery.test.ts test/provider/provider.test.ts
```

Expected: new tests pass; existing provider tests remain green.

- [ ] **Step 6: Commit**

```powershell
git add packages/opencode/src/provider packages/opencode/test/provider
git commit -m "feat(provider): discover and validate live models"
```

### Task 3: Add candidate validation API and regenerate SDK

**Files:**
- Modify: `packages/opencode/src/server/routes/instance/provider.ts`
- Modify: `packages/opencode/src/server/routes/instance/httpapi/provider.ts`
- Create: `packages/opencode/test/server/provider-discovery.test.ts`
- Regenerate: `packages/sdk/js/src/v2/gen/*`

- [ ] **Step 1: Write failing endpoint tests**

Test `POST /provider/:providerID/discover` with:

```json
{ "key": "candidate", "baseURL": "http://127.0.0.1:PORT/v1" }
```

Assert success returns `{ verified, source, models, warning? }`, invalid credentials return a sanitized actionable error, and the candidate key is not written to the auth store.

- [ ] **Step 2: Run and confirm RED**

From `packages/opencode`, run `bun test test/server/provider-discovery.test.ts`; expected: 404 for the missing route.

- [ ] **Step 3: Implement schemas and both route surfaces**

Add strict input fields `key?: string` and `baseURL?: string`. Resolve configured base URL server-side when omitted. Call `ProviderDiscovery.discover` without writing auth. Map discovery codes to HTTP 401, 403, 404, 429, 502, or 504 and expose only the sanitized message.

- [ ] **Step 4: Run endpoint tests and confirm GREEN**

Run `bun test test/server/provider-discovery.test.ts`; expected: pass.

- [ ] **Step 5: Regenerate and typecheck the SDK**

From the repository root:

```powershell
bun ./packages/sdk/js/script/build.ts
cd packages/sdk/js
bun typecheck
```

Expected: generated client contains `provider.discover`; SDK typecheck exits 0.

- [ ] **Step 6: Commit**

```powershell
git add packages/opencode/src/server packages/opencode/test/server packages/sdk/js/src
git commit -m "feat(provider): expose candidate model discovery"
```

### Task 4: Provider setup continuation in desktop

**Files:**
- Create: `packages/app/src/components/dialog-provider-continuation.ts`
- Create: `packages/app/src/components/dialog-provider-continuation.test.ts`
- Modify: `packages/app/src/components/dialog-connect-provider.tsx`
- Modify: `packages/app/src/components/dialog-custom-provider.tsx`
- Modify: `packages/app/src/i18n/en.ts`

- [ ] **Step 1: Write failing continuation/state tests**

Define a pure state machine API and assert:

```ts
expect(providerStatus("groq", [])).toBe("setup_required")
expect(providerStatus("groq", ["groq"])).toBe("connected")
expect(providerStatus("ollama", ["ollama"], true)).toBe("local")

const resume = createProviderContinuation("groq")
expect(resume.complete("groq")).toEqual({ providerID: "groq", step: "model" })
expect(resume.complete("groq")).toBeUndefined()
```

- [ ] **Step 2: Run and confirm RED**

From `packages/app`, run `bun test src/components/dialog-provider-continuation.test.ts`; expected module-not-found failure.

- [ ] **Step 3: Implement the pure helpers**

Use a closure guard so completion fires once. Keep provider classification independent of SolidJS and UI components.

- [ ] **Step 4: Add optional component contracts**

Use:

```ts
type ProviderSetupProps = {
  provider: string
  onConnected?: (providerID: string) => void
  onCancel?: () => void
}
```

Before `auth.set`, call `globalSDK.client.provider.discover` with the candidate key. On validation failure, retain the form value, show localized actionable text, and do not persist it. On verified or explicitly unsupported discovery, persist through the existing `auth.set`, dispose/bootstrap, then call `onConnected` once. When no continuation is supplied, preserve the existing toast-and-close behavior.

Give `DialogCustomProvider` the same optional callbacks. Validate its base URL/model endpoint before saving when model discovery is supported; keep the form open on failure.

- [ ] **Step 5: Run desktop tests and typecheck**

```powershell
bun test src/components/dialog-provider-continuation.test.ts src/components/dialog-advisor-setup.test.ts
bun typecheck
```

Expected: pass.

- [ ] **Step 6: Commit**

```powershell
git add packages/app/src/components packages/app/src/i18n/en.ts
git commit -m "feat(app): resume callers after provider setup"
```

### Task 5: All-provider Sage picker in desktop

**Files:**
- Modify: `packages/app/src/components/dialog-advisor-setup-state.ts`
- Modify: `packages/app/src/components/dialog-advisor-setup.test.ts`
- Modify: `packages/app/src/components/dialog-advisor-setup.tsx`
- Modify: `packages/app/src/i18n/en.ts`

- [ ] **Step 1: Add failing picker-state tests**

Assert all enabled providers remain visible, status is attached, cancelled setup returns to provider selection, and successful setup resumes the selected provider's model step without changing the working model.

```ts
expect(advisorProviders(all, ["openai"]).map((item) => item.id)).toContain("groq")
expect(nextAdvisorStep({ step: "connecting", providerID: "groq" }, { type: "connected" })).toEqual({
  step: "model",
  providerID: "groq",
})
```

- [ ] **Step 2: Run and confirm RED**

Run `bun test src/components/dialog-advisor-setup.test.ts`; expected: missing helpers/behavior failures.

- [ ] **Step 3: Implement provider selection and continuation**

Use `providers.all()` for rows and `providers.connected()` only for status. Selecting a connected provider goes to the model step. Selecting a disconnected provider opens a setup-required confirmation and then `DialogConnectProvider` with callbacks. Append `Ollama / local` and `Custom OpenAI-compatible` actions that invoke the existing custom provider flow with presets/continuation.

After continuation, invalidate/refetch provider state and select models from the refreshed provider object. Keep model search keys `name` and `id`; filter deprecated and non-text-output models. Show retry/reconnect/back when refresh fails or produces no usable models.

- [ ] **Step 4: Run tests and typecheck**

```powershell
bun test src/components/dialog-advisor-setup.test.ts src/components/dialog-provider-continuation.test.ts
bun typecheck
```

Expected: pass.

- [ ] **Step 5: Commit**

```powershell
git add packages/app/src/components/dialog-advisor-setup* packages/app/src/i18n/en.ts
git commit -m "feat(app): configure providers from Sage"
```

### Task 6: TUI provider continuation and Sage resume

**Files:**
- Modify: `packages/opencode/src/cli/cmd/tui/component/dialog-provider.tsx`
- Modify: `packages/opencode/src/cli/cmd/tui/component/dialog-advisor-setup.tsx`
- Modify: `packages/opencode/src/cli/cmd/tui/i18n/en.ts`
- Modify: `packages/opencode/test/cli/cmd/tui/advisor-setup.test.ts`

- [ ] **Step 1: Add failing TUI state tests**

Test pure exported helpers:

```ts
expect(advisorProviderOptions(all, ["openai"]).find((item) => item.id === "groq")?.status).toBe(
  "setup_required",
)
expect(advisorResume("groq", "connected")).toEqual({ providerID: "groq", step: "model" })
expect(advisorResume("groq", "cancelled")).toEqual({ step: "provider" })
```

- [ ] **Step 2: Run and confirm RED**

From `packages/opencode`, run `bun test test/cli/cmd/tui/advisor-setup.test.ts`; expected helper/behavior failures.

- [ ] **Step 3: Generalize the existing TUI provider flow**

Add an optional destination:

```ts
type ProviderDestination = {
  onConnected?: (providerID: string) => void
  onCancel?: () => void
}
```

Thread it through API key, OAuth code, OAuth auto, prompt, and custom-provider completion. Before API-key persistence, call the discovery endpoint and render the sanitized error in `DialogPrompt.description`. Default completion remains `DialogModel` when no destination exists.

- [ ] **Step 4: Update the TUI Sage picker**

Build rows from `sync.data.provider_next.all`, status from `provider_next.connected`, and provider auth methods from `provider_auth`. On disconnected selection, show Connect/Cancel, launch `DialogProvider` scoped to the chosen provider, then dispose/bootstrap and restore Sage's model step. Include custom/Ollama actions and retain filtering through `DialogSelect`.

- [ ] **Step 5: Run tests and typecheck**

```powershell
bun test test/cli/cmd/tui/advisor-setup.test.ts test/cli/cmd/tui/client-slash.test.ts
bun typecheck
```

Expected: pass.

- [ ] **Step 6: Commit**

```powershell
git add packages/opencode/src/cli/cmd/tui packages/opencode/test/cli/cmd/tui
git commit -m "feat(tui): configure providers from Sage"
```

### Task 7: Documentation and end-to-end verification

**Files:**
- Modify: `packages/web/src/content/docs/agents.mdx`
- Modify: `packages/web/src/content/docs/config.mdx`

- [ ] **Step 1: Document the completed workflow**

Explain that `/sage-model` lists connected and disconnected providers, reuses `/connect`, validates supported model catalogues, resumes automatically, supports Ollama/custom endpoints, and stores only the selected model/variant.

- [ ] **Step 2: Run all focused tests**

From `packages/opencode`:

```powershell
bun test test/provider/discovery.test.ts test/server/provider-discovery.test.ts test/cli/cmd/tui/advisor-setup.test.ts test/config/advisor.test.ts test/tool/consult.test.ts test/session/advisor-system-prompt.test.ts
bun typecheck
```

From `packages/app`:

```powershell
bun test src/components/dialog-provider-continuation.test.ts src/components/dialog-advisor-setup.test.ts src/components/prompt-input/submit.test.ts
bun typecheck
```

From `packages/sdk/js`:

```powershell
bun typecheck
```

Expected: zero failures and zero type errors.

- [ ] **Step 3: Build documentation**

From `packages/web`, run `bun run build`; expected: exit 0.

- [ ] **Step 4: Perform manual development checks**

Run `bun run dev` from the feature worktree and verify:

1. `/sage-model` shows connected and disconnected providers.
2. Invalid Groq key stays in the key form with an invalid-credential message.
3. A valid provider key returns to the searchable model list.
4. Cancel returns to provider selection without changing Sage.
5. Unreachable Ollama reports start-server/base-URL guidance.
6. Reachable Ollama lists installed models.
7. Model selection opens only supported reasoning variants and saves globally.

- [ ] **Step 5: Inspect and commit final documentation**

```powershell
git diff --check
git status --short
git add packages/web/src/content/docs/agents.mdx packages/web/src/content/docs/config.mdx
git commit -m "docs: explain Sage provider setup"
```

- [ ] **Step 6: Run verification-before-completion and keep the branch local unless the user asks to publish**

Confirm the worktree is clean, record exact test/build results, and do not push automatically.
