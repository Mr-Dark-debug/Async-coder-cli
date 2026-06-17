import { createFileRoute, Link } from "@tanstack/react-router";
import { DocsLayout, H2, P } from "@/components/docs-layout";

// Catch-all for doc pages we haven't written yet — friendly placeholder
export const Route = createFileRoute("/docs/$")({
  head: () => ({
    meta: [
      { title: "Docs — async-coder" },
      { property: "og:url", content: "/docs" },
    ],
    links: [{ rel: "canonical", href: "/docs" }],
  }),
  component: DocSplat,
});

function DocSplat() {
  const params = Route.useParams() as { _splat: string };
  const slug = params._splat || "";
  const title = slug
    .split("/")
    .pop()!
    .replace(/-/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase()) || "Documentation";

  return (
    <DocsLayout
      title={title}
      description="This page is on the roadmap — content is being written."
    >
      <H2 id="coming-soon">Coming soon</H2>
      <P>
        We're writing this page. In the meantime, the{" "}
        <Link to="/docs/quickstart" className="text-lavender hover:underline">
          quickstart
        </Link>{" "}
        and{" "}
        <Link to="/docs/configuration" className="text-lavender hover:underline">
          configuration
        </Link>{" "}
        cover most setups. You can also follow the{" "}
        <a
          href="https://github.com/Mr-Dark-debug/Async-coder-cli"
          target="_blank"
          rel="noreferrer"
          className="text-lavender hover:underline"
        >
          GitHub repo
        </a>{" "}
        for live updates.
      </P>
    </DocsLayout>
  );
}
