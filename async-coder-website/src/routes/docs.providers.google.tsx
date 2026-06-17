import { createFileRoute } from "@tanstack/react-router";
import { DocsLayout, H2, P } from "@/components/docs-layout";

export const Route = createFileRoute("/docs/providers/google")({
  head: () => ({ meta: [{ title: "Google — async-coder docs" }] }),
  component: () => (
    <DocsLayout title="Google" description="Gemini 2.5 Pro & Flash via Google AI Studio.">
      <H2 id="key">Get a key</H2>
      <P>Free at <a className="text-lavender hover:underline" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a>. Flash has a free tier; Pro is paid.</P>
      <H2 id="config">Configure</H2>
      <pre className="rounded-lg border border-border/60 bg-elevated/60 px-4 py-3 font-mono text-sm overflow-x-auto"><code>{`export GOOGLE_API_KEY=AIza…
async-coder /model google/gemini-2.5-pro`}</code></pre>
      <P>Defaults: <code className="font-mono text-lavender">gemini-2.5-pro</code> for coding, <code className="font-mono text-lavender">gemini-2.5-flash</code> for cheap iteration.</P>
    </DocsLayout>
  ),
});
