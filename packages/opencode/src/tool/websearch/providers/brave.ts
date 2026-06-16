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
    const key = process.env.BRAVE_API_KEY ?? apiKeyFromAuth(yield* auth.get("brave"))
    if (!key) return undefined

    const url = new URL("https://api.search.brave.com/res/v1/web/search")
    url.searchParams.set("q", params.query)
    url.searchParams.set("count", String(params.numResults ?? 8))

    const response = yield* HttpClient.filterStatusOk(http)
      .execute(
        HttpClientRequest.get(url.toString()).pipe(
          HttpClientRequest.setHeaders({
            "X-Subscription-Token": key,
            Accept: "application/json",
            "Accept-Encoding": "gzip",
          }),
        ),
      )
      .pipe(Effect.timeoutOrElse({ duration: timeout, orElse: () => Effect.die(new Error("brave request timed out")) }))
    const data = record(JSON.parse(yield* response.text)) ?? {}
    const web = record(data.web)
    return formatSources(
      array(web?.results)
        .flatMap((item) => {
          const result = record(item)
          const url = text(result?.url)
          if (!url) return []
          return [
            {
              title: text(result?.title),
              url,
              date: text(result?.age),
              summary: text(result?.description),
            },
          ]
        })
        .slice(0, params.numResults ?? 8),
    )
  })
