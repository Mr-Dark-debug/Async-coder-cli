import { createFileRoute } from "@tanstack/react-router";
import { DocsLayout, H2, P } from "@/components/docs-layout";

export const Route = createFileRoute("/docs/providers/openai")({
  head: () => ({ meta: [{ title: "OpenAI — async-coder docs" }] }),
  component: () => (
    <DocsLayout title="OpenAI" description="GPT-5, GPT-4.1, and o-series reasoning models.">
      <H2 id="key">Get a key</H2>
      <P>Create one at <a className="text-lavender hover:underline" href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">platform.openai.com</a>. New accounts get a $5 trial credit.</P>
      <H2 id="config">Configure</H2>
      <pre className="rounded-lg border border-border/60 bg-elevated/60 px-4 py-3 font-mono text-sm overflow-x-auto"><code>{`export OPENAI_API_KEY=sk-…
async-coder /model openai/gpt-5`}</code></pre>
      <P>Defaults: <code className="font-mono text-lavender">gpt-5</code> for coding, <code className="font-mono text-lavender">o4-mini</code> for cheap reasoning.</P>
    </DocsLayout>
  ),
});
