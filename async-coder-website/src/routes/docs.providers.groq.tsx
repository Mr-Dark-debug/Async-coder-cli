import { createFileRoute } from "@tanstack/react-router";
import { DocsLayout, H2, P, InlineCode } from "@/components/docs-layout";

export const Route = createFileRoute("/docs/providers/groq")({
  head: () => ({ meta: [{ title: "Groq — async-coder docs" }] }),
  component: () => (
    <DocsLayout title="Groq" description="LPU-accelerated inference. The fastest tokens/sec you can get today.">
      <H2 id="key">Get a key</H2>
      <P>Sign up at <a className="text-lavender hover:underline" href="https://console.groq.com/keys" target="_blank" rel="noreferrer">console.groq.com</a>. Free tier is generous (≈14k requests/day on Llama 70B).</P>
      <H2 id="config">Configure</H2>
      <pre className="rounded-lg border border-border/60 bg-elevated/60 px-4 py-3 font-mono text-sm overflow-x-auto"><code>{`export GROQ_API_KEY=gsk_…
async-coder /model groq/llama-3.3-70b-versatile`}</code></pre>
      <P>Recommended default: <InlineCode>llama-3.3-70b-versatile</InlineCode>. For thinking, try <InlineCode>deepseek-r1-distill-llama-70b</InlineCode>.</P>
    </DocsLayout>
  ),
});
