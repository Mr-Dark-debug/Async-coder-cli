import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Page } from "@/components/page";
import { getReleases } from "@/lib/github.functions";
import { ArrowLeft, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/changelog/$version")({
  head: ({ params }) => ({
    meta: [
      { title: `Release ${params.version} — async-coder` },
      { name: "description", content: `Release notes for async-coder version ${params.version}.` },
      { property: "og:title", content: `Release ${params.version} — async-coder` },
      { property: "og:url", content: `/changelog/${params.version}` },
    ],
    links: [{ rel: "canonical", href: `/changelog/${params.version}` }],
  }),
  component: ReleasePage,
});

function ReleasePage() {
  const { version } = Route.useParams();
  
  const { data: releases, isLoading } = useQuery({
    queryKey: ["releases-full"],
    queryFn: () => getReleases(),
    staleTime: 60 * 60 * 1000,
  });

  const release = releases?.find(
    (r) => r.tagName === version || r.tagName.replace("v", "") === version.replace("v", "")
  );

  return (
    <Page
      eyebrow="Release Notes"
      title={`Release ${version}`}
      description={release ? `Published on ${new Date(release.publishedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}` : `Release details for version ${version}`}
    >
      <div className="mb-6">
        <Link
          to="/changelog"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-lavender transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to all releases
        </Link>
      </div>

      {isLoading && <div className="text-muted-foreground">Loading release details…</div>}

      {!isLoading && !release && (
        <div className="rounded-xl border border-border/60 bg-panel/40 p-8 text-center">
          <p className="text-muted-foreground">
            We couldn't find release details for version {version} in the cached releases.
          </p>
          <a
            href="https://github.com/Mr-Dark-debug/Async-coder-cli/releases"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-lavender hover:underline"
          >
            Check GitHub Releases <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {release && (
        <div className="rounded-xl border border-border/60 bg-panel/40 p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm px-2.5 py-1 rounded bg-lavender/15 text-lavender border border-lavender/30">
              {release.tagName}
            </span>
            <h2 className="font-display font-semibold text-xl md:text-2xl">{release.name}</h2>
          </div>
          
          <div className="prose prose-invert max-w-none text-muted-foreground leading-relaxed">
            <pre className="text-sm whitespace-pre-wrap font-sans bg-transparent p-0 m-0 border-0 leading-relaxed text-foreground/90">
              {release.body}
            </pre>
          </div>

          <div className="pt-6 border-t border-border/60 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Tag: {release.tagName}
            </span>
            <a
              href={release.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-lavender hover:text-lavender-soft"
            >
              View on GitHub <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}
    </Page>
  );
}
