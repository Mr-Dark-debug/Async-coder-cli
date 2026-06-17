import { createFileRoute } from "@tanstack/react-router";
import { DocsLayout, H2, P, InlineCode, UL } from "@/components/docs-layout";

export const Route = createFileRoute("/docs/providers/custom")({
  head: () => ({ meta: [{ title: "Custom provider — async-coder docs" }] }),
  component: () => (
    <DocsLayout title="Custom (OpenAI-compatible)" description="Point at any endpoint that speaks the OpenAI Chat Completions protocol. Local or remote.">
      <H2 id="why">Why use this</H2>
      <UL>
        <li>Local inference with Ollama, vLLM, LM Studio, llama.cpp.</li>
        <li>Hosted gateways like LiteLLM, Helicone, OpenPipe.</li>
        <li>Private model deployments on Azure OpenAI, Bedrock proxy, etc.</li>
      </UL>
      <H2 id="config">Configure</H2>
      <pre className="rounded-lg border border-border/60 bg-elevated/60 px-4 py-3 font-mono text-xs overflow-x-auto"><code>{`{
  "provider": "custom",
  "custom": {
    "baseUrl": "http://localhost:11434/v1",
    "apiKey": "\${CUSTOM_API_KEY}",
    "model": "qwen2.5-coder:32b"
  }
}`}</code></pre>
      <P>Or via env: <InlineCode>CUSTOM_BASE_URL</InlineCode>, <InlineCode>CUSTOM_API_KEY</InlineCode>, <InlineCode>CUSTOM_MODEL</InlineCode>.</P>
    </DocsLayout>
  ),
});
