import { createFileRoute, Link } from "@tanstack/react-router";
import { DocsLayout, H2, P, UL, InlineCode } from "@/components/docs-layout";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/docs/")({
  head: () => ({
    meta: [
      { title: "Docs — async-coder" },
      { name: "description", content: "Documentation for async-coder, the terminal-native AI coding agent." },
      { property: "og:title", content: "Docs — async-coder" },
      { property: "og:url", content: "/docs" },
    ],
    links: [{ rel: "canonical", href: "/docs" }],
  }),
  component: DocsHome,
});

const TOC = [
  { id: "what-it-is", label: "What it is" },
  { id: "install", label: "Install" },
  { id: "next", label: "Next steps" },
];

function DocsHome() {
  return (
    <DocsLayout
      title="Introduction"
      description="async-coder is a terminal-native AI coding agent. Bring your own model, get a per-model cost dashboard, plug in any web search backend, and ship code."
      toc={TOC}
    >
      <H2 id="what-it-is">What it is</H2>
      <P>
        async-coder is a fork of <a href="https://opencode.ai" className="text-lavender hover:underline">OpenCode</a>{" "}
        (originally via MiMo-Code) with multi-provider onboarding, per-model cost dashboards, and
        pluggable web search — all in lavender. No telemetry, no required login, MIT-licensed.
      </P>

      <H2 id="install">Install</H2>
      <P>One command. The CLI ships as a single binary.</P>
      <pre className="rounded-lg border border-border/60 bg-elevated/60 px-4 py-3 font-mono text-sm overflow-x-auto">
        <code>npm install -g async-coder</code>
      </pre>

      <H2 id="next">Next steps</H2>
      <UL>
        <li>
          <Link to="/docs/quickstart" className="text-lavender hover:underline">
            Quickstart
          </Link>{" "}
          — install, add a key, ship your first prompt.
        </li>
        <li>
          <Link to="/docs/configuration" className="text-lavender hover:underline">
            Configuration
          </Link>{" "}
          — every field in <InlineCode>async-coder.json</InlineCode>.
        </li>
        <li>
          <Link to="/docs/providers" className="text-lavender hover:underline">
            Providers
          </Link>{" "}
          — get a key for Groq, OpenRouter, OpenAI, Anthropic, Google, xAI, or Copilot.
        </li>
        <li>
          <Link to="/docs/migration" className="text-lavender hover:underline">
            Migration
          </Link>{" "}
          — coming from MiMo-Code? It's automatic.
        </li>
      </UL>

      <div className="mt-10 rounded-xl border border-lavender/30 bg-lavender/5 p-5 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="font-semibold">Ready to go?</div>
          <div className="text-sm text-muted-foreground">Jump straight into the quickstart.</div>
        </div>
        <Link
          to="/docs/quickstart"
          className="inline-flex items-center gap-1.5 px-4 h-10 rounded-md bg-lavender text-primary-foreground text-sm font-medium hover:bg-lavender-soft"
        >
          Quickstart <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </DocsLayout>
  );
}
