import { createFileRoute } from "@tanstack/react-router";
import { DocsLayout, H2, P, InlineCode } from "@/components/docs-layout";

export const Route = createFileRoute("/docs/providers/openrouter")({
  head: () => ({ meta: [{ title: "OpenRouter — async-coder docs" }] }),
  component: () => (
    <DocsLayout title="OpenRouter" description="One key, hundreds of models. Useful when you want to try Claude, GPT, Gemini, and Llama without juggling accounts.">
      <H2 id="key">Get a key</H2>
      <P>Create one at <a className="text-lavender hover:underline" href="https://openrouter.ai/settings/keys" target="_blank" rel="noreferrer">openrouter.ai/settings/keys</a>. Top up credits or use a :free model.</P>
      <H2 id="config">Configure</H2>
      <pre className="rounded-lg border border-border/60 bg-elevated/60 px-4 py-3 font-mono text-sm overflow-x-auto"><code>{`export OPENROUTER_API_KEY=sk-or-…
async-coder /model openrouter/anthropic/claude-sonnet-4.5`}</code></pre>
      <P>OpenRouter charges the upstream price plus a small router fee, disclosed in the response. Use <InlineCode>openrouter/auto</InlineCode> to let it pick.</P>
    </DocsLayout>
  ),
});
