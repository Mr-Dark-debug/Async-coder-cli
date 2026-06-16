import { Effect, type Duration } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import {
  apiKeyFromAuth,
  array,
  authMetadata,
  formatSources,
  record,
  text,
  type AuthLookup,
  type WebSearchParams,
} from "./shared"

export const call = (
  http: HttpClient.HttpClient,
  params: WebSearchParams,
  auth: AuthLookup,
  timeout: Duration.Input,
) =>
  Effect.gen(function* () {
    const info = yield* auth.get("google")
    const key = process.env.GOOGLE_API_KEY ?? apiKeyFromAuth(info)
    const cseID = process.env.GOOGLE_CSE_ID ?? authMetadata(info, "cseID") ?? authMetadata(info, "cx")
    if (!key || !cseID) return undefined

    const url = new URL("https://www.googleapis.com/customsearch/v1")
    url.searchParams.set("key", key)
    url.searchParams.set("cx", cseID)
    url.searchParams.set("q", params.query)
    url.searchParams.set("num", String(Math.min(params.numResults ?? 8, 10)))

    const response = yield* HttpClient.filterStatusOk(http)
      .execute(HttpClientRequest.get(url.toString()).pipe(HttpClientRequest.acceptJson))
      .pipe(Effect.timeoutOrElse({ duration: timeout, orElse: () => Effect.die(new Error("google request timed out")) }))
    const data = record(JSON.parse(yield* response.text)) ?? {}
    return formatSources(
      array(data.items)
        .flatMap((item) => {
          const result = record(item)
          const url = text(result?.link)
          if (!url) return []
          const pagemap = record(result?.pagemap)
          const metatag = record(array(pagemap?.metatags)[0])
          return [
            {
              title: text(result?.title),
              site: text(result?.displayLink),
              date: text(metatag?.["article:published_time"]),
              url,
              summary: text(result?.snippet),
            },
          ]
        })
        .slice(0, params.numResults ?? 8),
    )
  })
