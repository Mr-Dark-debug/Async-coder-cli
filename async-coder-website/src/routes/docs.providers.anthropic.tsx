import { createFileRoute } from "@tanstack/react-router";
import { DocsLayout, H2, P } from "@/components/docs-layout";

export const Route = createFileRoute("/docs/providers/anthropic")({
  head: () => ({ meta: [{ title: "Anthropic — async-coder docs" }] }),
  component: () => (
    <DocsLayout title="Anthropic" description="Claude Sonnet, Opus, and Haiku 4.x. Excellent for codebase-scale refactors.">
      <H2 id="key">Get a key</H2>
      <P>Create one at <a className="text-lavender hover:underline" href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">console.anthropic.com</a>. $5 trial credit on signup.</P>
      <H2 id="config">Configure</H2>
      <pre className="rounded-lg border border-border/60 bg-elevated/60 px-4 py-3 font-mono text-sm overflow-x-auto"><code>{`export ANTHROPIC_API_KEY=sk-ant-…
async-coder /model anthropic/claude-sonnet-4.5`}</code></pre>
      <P>Defaults: <code className="font-mono text-lavender">claude-sonnet-4.5</code> for everyday work, <code className="font-mono text-lavender">claude-opus-4.1</code> for large refactors.</P>
    </DocsLayout>
  ),
});
