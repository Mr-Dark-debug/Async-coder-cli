import { Effect, type Duration } from "effect"
import type { HttpClient } from "effect/unstable/http"
import type { Auth } from "@/auth"
import { isRecord } from "@/util/record"

export type WebSearchParams = {
  query: string
  numResults?: number
  type?: "auto" | "fast" | "deep"
}

export type AuthLookup = {
  get(providerID: string): Effect.Effect<Auth.Info | undefined, unknown>
}

export type WebSearchBackend = (
  http: HttpClient.HttpClient,
  params: WebSearchParams,
  auth: AuthLookup,
  timeout: Duration.Input,
) => Effect.Effect<string | undefined>

export type Source = {
  title?: string
  site?: string
  date?: string
  url: string
  summary?: string
}

export function formatSources(sources: Source[], prefix?: string) {
  const lines = sources.flatMap((source) => {
    const head = [source.title, source.site, source.date].filter(Boolean).join(" - ")
    return [`- ${head || source.url}`, `  ${source.url}`, ...(source.summary ? [`  ${source.summary}`] : [])]
  })
  if (lines.length === 0) return prefix
  return [prefix, "Sources:", ...lines].filter(Boolean).join("\n")
}

export function apiKeyFromAuth(info: Auth.Info | undefined) {
  if (!info || info.type !== "api") return undefined
  return info.key
}

export function authMetadata(info: Auth.Info | undefined, key: string) {
  if (!info || info.type !== "api") return undefined
  return info.metadata?.[key]
}

export function text(value: unknown) {
  return typeof value === "string" ? value : undefined
}

export function record(value: unknown) {
  return isRecord(value) ? value : undefined
}

export function array(value: unknown) {
  return Array.isArray(value) ? value : []
}
