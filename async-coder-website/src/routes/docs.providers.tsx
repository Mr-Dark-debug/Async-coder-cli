import { createFileRoute, Link } from "@tanstack/react-router";
import { DocsLayout, H2, P } from "@/components/docs-layout";

const PROVIDERS = [
  { slug: "groq", name: "Groq", note: "Fastest tokens/sec, generous free tier" },
  { slug: "openrouter", name: "OpenRouter", note: "One key, every model" },
  { slug: "openai", name: "OpenAI", note: "GPT-5, GPT-4.1, o-series" },
  { slug: "anthropic", name: "Anthropic", note: "Claude Sonnet/Opus/Haiku 4.x" },
  { slug: "google", name: "Google", note: "Gemini 2.5 Pro/Flash" },
  { slug: "xai", name: "xAI", note: "Grok 4, Grok Code Fast" },
  { slug: "copilot", name: "GitHub Copilot", note: "Use your existing subscription" },
  { slug: "custom", name: "Custom", note: "Any OpenAI-compatible endpoint" },
];

export const Route = createFileRoute("/docs/providers")({
  head: () => ({ meta: [{ title: "Providers — async-coder docs" }] }),
  component: () => (
    <DocsLayout
      title="Providers"
      description="async-coder is multi-provider by default. Bring one key, or many — switch with /model."
    >
      <H2 id="overview">Overview</H2>
      <P>Each provider has a setup page with the exact env var and one example model.</P>
      <div className="grid sm:grid-cols-2 gap-3 mt-4">
        {PROVIDERS.map((p) => (
          <Link
            key={p.slug}
            to={`/docs/providers/${p.slug}` as any}
            className="block rounded-lg border border-border/60 hover:border-lavender/40 bg-elevated/40 p-4 transition-colors"
          >
            <div className="font-display font-semibold">{p.name}</div>
            <div className="text-sm text-muted-foreground mt-0.5">{p.note}</div>
          </Link>
        ))}
      </div>
    </DocsLayout>
  ),
});
