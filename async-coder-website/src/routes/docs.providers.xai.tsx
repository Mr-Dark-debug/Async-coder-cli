import { createFileRoute } from "@tanstack/react-router";
import { DocsLayout, H2, P } from "@/components/docs-layout";

export const Route = createFileRoute("/docs/providers/xai")({
  head: () => ({ meta: [{ title: "xAI — async-coder docs" }] }),
  component: () => (
    <DocsLayout title="xAI" description="Grok 4 and Grok Code Fast — strong code generation, fresh data.">
      <H2 id="key">Get a key</H2>
      <P>Create one at <a className="text-lavender hover:underline" href="https://console.x.ai" target="_blank" rel="noreferrer">console.x.ai</a>. Opt-in data sharing unlocks $150/mo of credits.</P>
      <H2 id="config">Configure</H2>
      <pre className="rounded-lg border border-border/60 bg-elevated/60 px-4 py-3 font-mono text-sm overflow-x-auto"><code>{`export XAI_API_KEY=xai-…
async-coder /model xai/grok-4`}</code></pre>
      <P>Use <code className="font-mono text-lavender">grok-code-fast-1</code> for cheap, snappy completion.</P>
    </DocsLayout>
  ),
});
