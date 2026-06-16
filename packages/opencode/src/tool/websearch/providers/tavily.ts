import { Effect, type Duration } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import { apiKeyFromAuth, array, formatSources, record, text, type AuthLookup, type WebSearchParams } from "./shared"

export const call = (
  http: HttpClient.HttpClient,
  params: WebSearchParams,
  auth: AuthLookup,
  timeout: Duration.Input,
) =>
  Effect.gen(function* () {
    const key = process.env.TAVILY_API_KEY ?? apiKeyFromAuth(yield* auth.get("tavily"))
    if (!key) return undefined

    const request = yield* HttpClientRequest.post("https://api.tavily.com/search").pipe(
      HttpClientRequest.acceptJson,
      HttpClientRequest.bodyJson({
        query: params.query,
        api_key: key,
        search_depth: params.type === "deep" ? "advanced" : "basic",
        max_results: params.numResults ?? 8,
        include_answer: true,
        include_raw_content: false,
      }),
    )
    const response = yield* HttpClient.filterStatusOk(http)
      .execute(request)
      .pipe(Effect.timeoutOrElse({ duration: timeout, orElse: () => Effect.die(new Error("tavily request timed out")) }))
    const data = record(JSON.parse(yield* response.text)) ?? {}
    return formatSources(
      array(data.results)
        .flatMap((item) => {
          const result = record(item)
          const url = text(result?.url)
          if (!url) return []
          return [
            {
              title: text(result?.title),
              url,
              summary: text(result?.content),
            },
          ]
        })
        .slice(0, params.numResults ?? 8),
      text(data.answer),
    )
  })
