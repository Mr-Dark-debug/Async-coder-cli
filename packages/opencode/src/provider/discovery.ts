import z from "zod"
import { isRecord } from "@/util/record"

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

export type ErrorCode = z.infer<typeof ErrorCode>

export class DiscoveryError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly retryable: boolean,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = "ProviderDiscoveryError"
  }
}

export type Model = {
  id: string
  name: string
  family?: string
  created?: string
  context?: number
  output?: number
  input?: string[]
  outputModalities?: string[]
  cost?: { input?: number; output?: number }
  supportedParameters?: string[]
}

export type Input = {
  providerID: string
  key?: string
  baseURL?: string
  signal?: AbortSignal
}

export type Result = {
  verified: boolean
  source: "live" | "configured"
  models: Model[]
  warning?: string
}

export const InputSchema = z.strictObject({
  key: z.string().min(1).optional(),
  baseURL: z.url().optional(),
})

export const ModelSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  family: z.string().optional(),
  created: z.string().optional(),
  context: z.number().optional(),
  output: z.number().optional(),
  input: z.array(z.string()).optional(),
  outputModalities: z.array(z.string()).optional(),
  cost: z.strictObject({ input: z.number().optional(), output: z.number().optional() }).optional(),
  supportedParameters: z.array(z.string()).optional(),
})

export const ResultSchema = z.strictObject({
  verified: z.boolean(),
  source: z.enum(["live", "configured"]),
  models: z.array(ModelSchema),
  warning: z.string().optional(),
})

export const ErrorSchema = z.strictObject({
  code: ErrorCode,
  message: z.string(),
  retryable: z.boolean(),
})

const defaults: Record<string, string> = {
  anthropic: "https://api.anthropic.com/v1",
  google: "https://generativelanguage.googleapis.com/v1beta",
  groq: "https://api.groq.com/openai/v1",
  openai: "https://api.openai.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
}

export function classifyResponse(status: number) {
  if (status === 401) return { code: "invalid_credentials" as const, retryable: false }
  if (status === 403) return { code: "permission_denied" as const, retryable: false }
  if (status === 404) return { code: "not_found" as const, retryable: false }
  if (status === 429) return { code: "rate_limited" as const, retryable: true }
  return { code: "provider_unavailable" as const, retryable: status >= 500 }
}

export function redactMessage(message: string, secret?: string) {
  if (!secret) return message
  return message.split(secret).join("[redacted]")
}

export function modelEndpoint(providerID: string, baseURL: string) {
  const base = baseURL.replace(/\/+$/, "")
  if (providerID === "ollama") return `${base.replace(/\/v1$/, "")}/api/tags`
  return `${base}/models`
}

function date(value: unknown) {
  if (typeof value === "number") return new Date(value * 1000).toISOString().slice(0, 10)
  if (typeof value !== "string") return
  return value.includes("T") ? value.slice(0, 10) : value
}

function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : undefined
}

function number(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value !== "string" || !value.trim()) return
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function price(value: unknown) {
  const parsed = number(value)
  if (parsed === undefined) return
  return parsed < 1 ? parsed * 1_000_000 : parsed
}

function genericModel(item: unknown): Model | undefined {
  if (!isRecord(item) || typeof item.id !== "string") return
  return {
    id: item.id,
    name: typeof item.name === "string" ? item.name : item.id,
    created: date(item.created ?? item.created_at),
  }
}

function openRouterModel(item: unknown): Model | undefined {
  const model = genericModel(item)
  if (!model || !isRecord(item)) return model
  const architecture = isRecord(item.architecture) ? item.architecture : {}
  const top = isRecord(item.top_provider) ? item.top_provider : {}
  const pricing = isRecord(item.pricing) ? item.pricing : {}
  return {
    ...model,
    context: number(top.context_length ?? item.context_length),
    output: number(top.max_completion_tokens),
    input: strings(architecture.input_modalities),
    outputModalities: strings(architecture.output_modalities),
    supportedParameters: strings(item.supported_parameters),
    cost: { input: price(pricing.prompt), output: price(pricing.completion) },
  }
}

function anthropicModel(item: unknown): Model | undefined {
  if (!isRecord(item) || typeof item.id !== "string") return
  return {
    id: item.id,
    name: typeof item.display_name === "string" ? item.display_name : item.id,
    created: date(item.created_at),
  }
}

function ollamaModel(item: unknown): Model | undefined {
  if (!isRecord(item)) return
  const id = typeof item.model === "string" ? item.model : typeof item.name === "string" ? item.name : undefined
  if (!id) return
  return {
    id,
    name: typeof item.name === "string" ? item.name : id,
    family: isRecord(item.details) && typeof item.details.family === "string" ? item.details.family : undefined,
    created: date(item.modified_at),
  }
}

function errorMessage(providerID: string, status: number) {
  if (status === 401) return `${providerID} rejected the API key or access token.`
  if (status === 403) return `${providerID} accepted the credentials but denied model access.`
  if (status === 404) return `${providerID} model catalogue was not found. Check the provider or base URL.`
  if (status === 429) return `${providerID} rate limited model discovery. Try again later.`
  return `${providerID} model discovery failed with HTTP ${status}.`
}

async function request(input: Input, url: string, headers: HeadersInit) {
  const signal = input.signal
    ? AbortSignal.any([input.signal, AbortSignal.timeout(10_000)])
    : AbortSignal.timeout(10_000)
  const response = await fetch(url, { headers, signal }).catch((cause) => {
    if (cause instanceof DOMException && (cause.name === "TimeoutError" || cause.name === "AbortError")) {
      throw new DiscoveryError("timeout", `${input.providerID} model discovery timed out.`, true, { cause })
    }
    throw new DiscoveryError("network", `${input.providerID} could not be reached.`, true, { cause })
  })
  if (response.ok) return response
  const classified = classifyResponse(response.status)
  throw new DiscoveryError(
    classified.code,
    redactMessage(errorMessage(input.providerID, response.status), input.key),
    classified.retryable,
  )
}

async function json(input: Input, url: string, headers: HeadersInit) {
  const response = await request(input, url, headers)
  return response.json().catch((cause) => {
    throw new DiscoveryError("invalid_response", `${input.providerID} returned an invalid model catalogue.`, false, {
      cause,
    })
  })
}

async function gemini(input: Input, baseURL: string) {
  const models: Model[] = []
  let pageToken: string | undefined
  do {
    const url = new URL(`${baseURL.replace(/\/+$/, "")}/models`)
    if (input.key) url.searchParams.set("key", input.key)
    url.searchParams.set("pageSize", "1000")
    if (pageToken) url.searchParams.set("pageToken", pageToken)
    const body = await json(input, url.href, { "Content-Type": "application/json" })
    if (!isRecord(body) || !Array.isArray(body.models)) {
      throw new DiscoveryError("invalid_response", "google returned an invalid model catalogue.", false)
    }
    models.push(
      ...body.models.flatMap((item) => {
        if (!isRecord(item)) return []
        const methods = strings(item.supportedGenerationMethods ?? item.supported_actions)
        if (methods && !methods.includes("generateContent")) return []
        const raw = typeof item.baseModelId === "string" ? item.baseModelId : item.name
        if (typeof raw !== "string") return []
        const id = raw.replace(/^models\//, "")
        return [
          {
            id,
            name: typeof item.displayName === "string" ? item.displayName : id,
            context: number(item.inputTokenLimit),
            output: number(item.outputTokenLimit),
          },
        ]
      }),
    )
    pageToken = typeof body.nextPageToken === "string" ? body.nextPageToken : undefined
  } while (pageToken)
  return models
}

export async function discover(input: Input): Promise<Result> {
  const baseURL = input.baseURL ?? defaults[input.providerID]
  if (!baseURL) {
    return {
      verified: false,
      source: "configured",
      models: [],
      warning: "Live model discovery is not supported by this provider.",
    }
  }

  if (input.providerID === "google") {
    const models = await gemini(input, baseURL)
    if (!models.length) throw new DiscoveryError("empty_models", "google returned no text-generation models.", false)
    return { verified: true, source: "live", models }
  }

  const headers = new Headers({ "Content-Type": "application/json" })
  if (input.providerID === "anthropic") {
    if (input.key) headers.set("x-api-key", input.key)
    headers.set("anthropic-version", "2023-06-01")
  } else if (input.key) {
    headers.set("Authorization", `Bearer ${input.key}`)
  }

  const body = await json(input, modelEndpoint(input.providerID, baseURL), headers)
  const items = input.providerID === "ollama" && isRecord(body) ? body.models : isRecord(body) ? body.data : undefined
  if (!Array.isArray(items)) {
    throw new DiscoveryError(
      "invalid_response",
      `${input.providerID} returned an invalid model catalogue.`,
      false,
    )
  }
  const map =
    input.providerID === "ollama"
      ? ollamaModel
      : input.providerID === "anthropic"
        ? anthropicModel
        : input.providerID === "openrouter"
          ? openRouterModel
          : genericModel
  const models = items.map(map).filter((model): model is Model => !!model)
  if (!models.length) {
    const message =
      input.providerID === "ollama"
        ? "Ollama is running but has no installed models. Pull a model and try again."
        : `${input.providerID} returned no usable text-generation models.`
    throw new DiscoveryError("empty_models", message, false)
  }
  return { verified: true, source: "live", models }
}
