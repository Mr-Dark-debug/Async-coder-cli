import { Effect, type Duration } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import { formatSources, type AuthLookup, type Source, type WebSearchParams } from "./shared"

let lastDuckDuckGoTs = 0

function decodeHtml(input: string) {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function unwrapDuckDuckGoUrl(href: string) {
  const normalized = href.startsWith("//") ? `https:${href}` : href
  try {
    const url = new URL(normalized, "https://duckduckgo.com")
    const wrapped = url.searchParams.get("uddg")
    return wrapped ? decodeURIComponent(wrapped) : url.href
  } catch {
    return normalized
  }
}

function parse(html: string, limit: number) {
  const links = Array.from(
    html.matchAll(/<a[^>]+class=["'][^"']*result__a[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi),
  )
  const snippets = Array.from(
    html.matchAll(/<(?:a|div)[^>]+class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/(?:a|div)>/gi),
  )
  return links.slice(0, limit).flatMap((match, index): Source[] => {
    const url = unwrapDuckDuckGoUrl(decodeHtml(match[1] ?? ""))
    if (!url) return []
    return [
      {
        title: decodeHtml(match[2] ?? url),
        url,
        summary: snippets[index] ? decodeHtml(snippets[index][1] ?? "") : undefined,
      },
    ]
  })
}

function fetchHtml(http: HttpClient.HttpClient, url: string | URL, timeout: Duration.Input) {
  return HttpClient.filterStatusOk(http)
    .execute(
      HttpClientRequest.get(url).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": "async-coder",
          Accept: "text/html,application/xhtml+xml",
        }),
      ),
    )
    .pipe(
      Effect.timeoutOrElse({ duration: timeout, orElse: () => Effect.die(new Error("duckduckgo request timed out")) }),
      Effect.flatMap((response) => response.text),
    )
}

export const call = (
  http: HttpClient.HttpClient,
  params: WebSearchParams,
  _auth: AuthLookup,
  timeout: Duration.Input,
) =>
  Effect.gen(function* () {
    const elapsed = Date.now() - lastDuckDuckGoTs
    if (elapsed < 1500) yield* Effect.sleep(`${1500 - elapsed} millis`)
    lastDuckDuckGoTs = Date.now()

    const limit = params.numResults ?? 8
    const primary = new URL("https://html.duckduckgo.com/html/")
    primary.searchParams.set("q", params.query)
    const primaryResults = parse(yield* fetchHtml(http, primary, timeout), limit)
    if (primaryResults.length > 0) return formatSources(primaryResults)

    const lite = new URL("https://lite.duckduckgo.com/lite/")
    lite.searchParams.set("q", params.query)
    const liteResults = parse(yield* fetchHtml(http, lite, timeout), limit)
    if (liteResults.length > 0) return formatSources(liteResults)

    return "DuckDuckGo returned no parseable results. Try Tavily or Brave for more reliable search."
  })
