import { Hono } from "hono"
import { describeRoute, validator, resolver } from "hono-openapi"
import z from "zod"
import { Config } from "@/config"
import { Provider } from "@/provider"
import { ModelsDev } from "@/provider"
import { ProviderAuth } from "@/provider"
import { ProviderID } from "@/provider/schema"
import { ProviderDiscovery } from "@/provider"
import { Auth } from "@/auth"
import { mapValues } from "remeda"
import { errors } from "../../error"
import { lazy } from "@/util/lazy"
import { Effect } from "effect"
import { jsonRequest, runRequest } from "./trace"

const discoveryErrors = Object.fromEntries(
  [400, 401, 403, 404, 429, 502, 504].map((status) => [
    status,
    {
      description: "Provider discovery failed",
      content: { "application/json": { schema: resolver(ProviderDiscovery.ErrorSchema) } },
    },
  ]),
)

export const ProviderRoutes = lazy(() =>
  new Hono()
    .get(
      "/",
      describeRoute({
        summary: "List providers",
        description: "Get a list of all available AI providers, including both available and connected ones.",
        operationId: "provider.list",
        responses: {
          200: {
            description: "List of providers",
            content: {
              "application/json": {
                schema: resolver(Provider.ListResult.zod),
              },
            },
          },
        },
      }),
      async (c) =>
        jsonRequest("ProviderRoutes.list", c, function* () {
          const svc = yield* Provider.Service
          const cfg = yield* Config.Service
          const config = yield* cfg.get()
          const all = yield* Effect.promise(() => ModelsDev.get())
          const disabled = new Set(config.disabled_providers ?? [])
          const enabled = config.enabled_providers ? new Set(config.enabled_providers) : undefined
          const filtered: Record<string, (typeof all)[string]> = {}
          for (const [key, value] of Object.entries(all)) {
            if ((enabled ? enabled.has(key) : true) && !disabled.has(key)) {
              filtered[key] = value
            }
          }
          const connected = yield* svc.list()
          const providers = Object.assign(
            mapValues(filtered, (x) => Provider.fromModelsDevProvider(x)),
            connected,
          )
          return {
            all: Object.values(providers),
            default: Provider.defaultModelIDs(providers),
            connected: Object.keys(connected),
          }
        }),
    )
    .post(
      "/:providerID/discover",
      describeRoute({
        summary: "Discover provider models",
        description: "Validate candidate provider credentials and fetch available models without persisting them.",
        operationId: "provider.discover",
        responses: {
          200: {
            description: "Provider discovery result",
            content: { "application/json": { schema: resolver(ProviderDiscovery.ResultSchema) } },
          },
          ...discoveryErrors,
        },
      }),
      validator("param", z.object({ providerID: ProviderID.zod })),
      validator("json", ProviderDiscovery.InputSchema),
      async (c) => {
        const providerID = c.req.valid("param").providerID
        const input = c.req.valid("json")
        try {
          const resolved = await runRequest(
            "ProviderRoutes.discover",
            c,
            Effect.gen(function* () {
              const auth = yield* Auth.Service
              const config = yield* Config.Service
              const provider = yield* Provider.Service
              const stored = yield* auth.get(providerID)
              const info = (yield* provider.list())[providerID]
              const configured = (yield* config.get()).provider?.[providerID]
              return {
                key: stored?.type === "api" ? stored.key : stored?.type === "oauth" ? stored.access : undefined,
                configuredBaseURL:
                  (typeof configured?.options?.baseURL === "string" ? configured.options.baseURL : undefined) ??
                  (typeof info?.options.baseURL === "string" ? info.options.baseURL : undefined),
                baseURL:
                  (typeof configured?.options?.baseURL === "string" ? configured.options.baseURL : undefined) ??
                  (typeof info?.options.baseURL === "string" ? info.options.baseURL : undefined) ??
                  Object.values(info?.models ?? {})[0]?.api.url,
              }
            }),
          )
          return c.json(
            await ProviderDiscovery.discover({
              providerID,
              key: input.baseURL ? input.key : (input.key ?? resolved.key),
              baseURL: input.baseURL ?? (input.key ? resolved.configuredBaseURL : resolved.baseURL),
              signal: c.req.raw.signal,
            }),
          )
        } catch (error) {
          if (!(error instanceof ProviderDiscovery.DiscoveryError)) throw error
          const status = {
            invalid_credentials: 401,
            permission_denied: 403,
            not_found: 404,
            rate_limited: 429,
            timeout: 504,
            cancelled: 400,
            network: 502,
            provider_unavailable: 502,
            invalid_response: 502,
            empty_models: 400,
          }[error.code] as 400 | 401 | 403 | 404 | 429 | 502 | 504
          return c.json({ code: error.code, message: error.message, retryable: error.retryable }, status)
        }
      },
    )
    .get(
      "/auth",
      describeRoute({
        summary: "Get provider auth methods",
        description: "Retrieve available authentication methods for all AI providers.",
        operationId: "provider.auth",
        responses: {
          200: {
            description: "Provider auth methods",
            content: {
              "application/json": {
                schema: resolver(ProviderAuth.Methods.zod),
              },
            },
          },
        },
      }),
      async (c) =>
        jsonRequest("ProviderRoutes.auth", c, function* () {
          const svc = yield* ProviderAuth.Service
          return yield* svc.methods()
        }),
    )
    .post(
      "/:providerID/oauth/authorize",
      describeRoute({
        summary: "OAuth authorize",
        description: "Initiate OAuth authorization for a specific AI provider to get an authorization URL.",
        operationId: "provider.oauth.authorize",
        responses: {
          200: {
            description: "Authorization URL and method",
            content: {
              "application/json": {
                schema: resolver(ProviderAuth.Authorization.zod.optional()),
              },
            },
          },
          ...errors(400),
        },
      }),
      validator(
        "param",
        z.object({
          providerID: ProviderID.zod.meta({ description: "Provider ID" }),
        }),
      ),
      validator("json", ProviderAuth.AuthorizeInput.zod),
      async (c) =>
        jsonRequest("ProviderRoutes.oauth.authorize", c, function* () {
          const providerID = c.req.valid("param").providerID
          const { method, inputs } = c.req.valid("json")
          const svc = yield* ProviderAuth.Service
          return yield* svc.authorize({
            providerID,
            method,
            inputs,
          })
        }),
    )
    .post(
      "/:providerID/oauth/callback",
      describeRoute({
        summary: "OAuth callback",
        description: "Handle the OAuth callback from a provider after user authorization.",
        operationId: "provider.oauth.callback",
        responses: {
          200: {
            description: "OAuth callback processed successfully",
            content: {
              "application/json": {
                schema: resolver(z.boolean()),
              },
            },
          },
          ...errors(400),
        },
      }),
      validator(
        "param",
        z.object({
          providerID: ProviderID.zod.meta({ description: "Provider ID" }),
        }),
      ),
      validator("json", ProviderAuth.CallbackInput.zod),
      async (c) =>
        jsonRequest("ProviderRoutes.oauth.callback", c, function* () {
          const providerID = c.req.valid("param").providerID
          const { method, code } = c.req.valid("json")
          const svc = yield* ProviderAuth.Service
          yield* svc.callback({
            providerID,
            method,
            code,
          })
          return true
        }),
    ),
)
