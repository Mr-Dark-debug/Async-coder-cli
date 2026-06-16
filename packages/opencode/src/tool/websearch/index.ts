import z from "zod"
import { Duration, Effect } from "effect"
import { HttpClient } from "effect/unstable/http"
import * as Tool from "../tool"
import * as McpExa from "../mcp-exa"
import * as Tavily from "./providers/tavily"
import * as Brave from "./providers/brave"
import * as Google from "./providers/google"
import * as DuckDuckGo from "./providers/duckduckgo"
import { Auth } from "@/auth"
import { Config } from "@/config"
import { Log } from "@/util"
import DESCRIPTION from "./websearch.txt"

const log = Log.create({ service: "websearch" })

const WEBFETCH_FALLBACK =
  "Web search unavailable. Use `webfetch` with a relevant URL instead, or configure websearch.provider in async-coder.json."
const MAX_TIMEOUT = 120

const Parameters = z.object({
  query: z.string().describe("Websearch query"),
  numResults: z.number().optional().describe("Number of search results to return (default: 8)"),
  timeout: z.number().describe("Optional timeout in seconds (max 120)").optional(),
  livecrawl: z
    .enum(["fallback", "preferred"])
    .optional()
    .describe(
      "Live crawl mode - 'fallback': use live crawling as backup if cached content unavailable, 'preferred': prioritize live crawling (default: 'fallback')",
    ),
  type: z
    .enum(["auto", "fast", "deep"])
    .optional()
    .describe("Search type - 'auto': balanced search (default), 'fast': quick results, 'deep': comprehensive search"),
  contextMaxCharacters: z
    .number()
    .optional()
    .describe("Maximum characters for context string optimized for LLMs (default: 10000)"),
})

type WebSearchProvider = "duckduckgo" | "tavily" | "brave" | "google" | "exa"

export const WebSearchTool = Tool.define(
  "websearch",
  Effect.gen(function* () {
    const http = yield* HttpClient.HttpClient
    const auth = yield* Auth.Service
    const config = yield* Config.Service

    return {
      get description() {
        return DESCRIPTION.replace("{{year}}", new Date().getFullYear().toString())
      },
      parameters: Parameters,
      execute: (params: z.infer<typeof Parameters>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "websearch",
            patterns: [params.query],
            always: ["*"],
            metadata: {
              query: params.query,
              numResults: params.numResults,
              livecrawl: params.livecrawl,
              type: params.type,
              contextMaxCharacters: params.contextMaxCharacters,
              timeout: params.timeout,
            },
          })

          const cfg = (yield* config.get()).websearch ?? {}
          const provider = (cfg.provider ?? "duckduckgo") as WebSearchProvider
          const value = {
            ...params,
            numResults: params.numResults ?? cfg.numResults ?? 8,
            timeout: Math.min(params.timeout ?? cfg.timeout ?? 25, MAX_TIMEOUT),
          }
          const timeout = Duration.seconds(value.timeout)

          const runDuckDuckGo = DuckDuckGo.call(http, value, auth, timeout)
          const result = yield* Effect.gen(function* () {
            if (provider === "duckduckgo") return yield* runDuckDuckGo
            if (provider === "exa") {
              if (!process.env.EXA_API_KEY) {
                log.warn("websearch provider 'exa' has no API key, falling back to duckduckgo")
                return yield* runDuckDuckGo
              }
              return yield* McpExa.call(
                http,
                "web_search_exa",
                McpExa.SearchArgs,
                {
                  query: value.query,
                  type: value.type || "auto",
                  numResults: value.numResults,
                  livecrawl: value.livecrawl || "fallback",
                  contextMaxCharacters: value.contextMaxCharacters,
                },
                timeout,
              )
            }
            const backend =
              provider === "tavily" ? Tavily.call : provider === "brave" ? Brave.call : Google.call
            const output = yield* backend(http, value, auth, timeout)
            if (output) return output
            log.warn(`websearch provider '${provider}' has no API key, falling back to duckduckgo`)
            return yield* runDuckDuckGo
          }).pipe(
            Effect.catchCause((cause) => {
              log.warn("websearch backend failed", { provider, cause: String(cause) })
              return runDuckDuckGo.pipe(Effect.catchCause(() => Effect.succeed(undefined)))
            }),
          )

          return {
            output: result ?? WEBFETCH_FALLBACK,
            title: `Web search: ${params.query}`,
            metadata: {},
          }
        }).pipe(Effect.orDie),
    }
  }),
)
