import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Page } from "@/components/page";
import { getReleases } from "@/lib/github.functions";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/changelog")({
  head: () => ({
    meta: [
      { title: "Changelog — async-coder" },
      { name: "description", content: "All async-coder releases, pulled live from GitHub." },
      { property: "og:title", content: "Changelog — async-coder" },
      { property: "og:url", content: "/changelog" },
    ],
    links: [{ rel: "canonical", href: "/changelog" }],
  }),
  component: ChangelogPage,
});

function ChangelogPage() {
  const { data: releases, isLoading } = useQuery({
    queryKey: ["releases-full"],
    queryFn: () => getReleases(),
    staleTime: 60 * 60 * 1000,
  });

  const items = releases ?? [];

  return (
    <Page
      eyebrow="Changelog"
      title="Every release."
      description="Auto-pulled from GitHub Releases. Cached hourly."
    >
      {isLoading && <div className="text-muted-foreground">Loading releases…</div>}
      {!isLoading && items.length === 0 && (
        <div className="rounded-xl border border-border/60 bg-panel/40 p-8 text-center">
          <p className="text-muted-foreground">
            No releases published yet. Watch the repo to be notified of the first one.
          </p>
        </div>
      )}
      <div className="space-y-6">
        {items.map((r) => (
          <article
            key={r.tagName}
            className="rounded-xl border border-border/60 bg-panel/40 p-6 hover:border-lavender/40 transition-colors"
          >
            <header className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm px-2.5 py-1 rounded bg-lavender/15 text-lavender border border-lavender/30">
                  {r.tagName}
                </span>
                <h2 className="font-display font-semibold text-xl">
                  <Link
                    to="/changelog/$version"
                    params={{ version: r.tagName }}
                    className="hover:text-lavender transition-colors"
                  >
                    {r.name}
                  </Link>
                </h2>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(r.publishedAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </header>
            <pre className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed font-sans">
              {r.body}
            </pre>
            <div className="mt-4 flex gap-4 flex-wrap">
              <Link
                to="/changelog/$version"
                params={{ version: r.tagName }}
                className="inline-flex items-center gap-1 text-sm text-lavender hover:text-lavender-soft"
              >
                Permalink <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <a
                href={r.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                View on GitHub <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </article>
        ))}
      </div>
    </Page>
  );
}
