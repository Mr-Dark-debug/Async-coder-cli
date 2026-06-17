import { createFileRoute } from "@tanstack/react-router";
import { DocsLayout, H2, P, InlineCode, UL } from "@/components/docs-layout";

export const Route = createFileRoute("/docs/self-hosting")({
  head: () => ({ meta: [{ title: "Self-hosting — async-coder docs" }] }),
  component: () => (
    <DocsLayout
      title="Self-hosting"
      description="Run everything locally. Ollama or vLLM for inference, async-coder as the agent. No external network required."
      toc={[
        { id: "ollama", label: "Ollama" },
        { id: "vllm", label: "vLLM" },
        { id: "litellm", label: "LiteLLM gateway" },
      ]}
    >
      <H2 id="ollama">Ollama</H2>
      <pre className="rounded-lg border border-border/60 bg-elevated/60 px-4 py-3 font-mono text-xs overflow-x-auto"><code>{`# Ollama exposes an OpenAI-compatible endpoint at /v1
async-coder config set provider custom
async-coder config set custom.baseUrl http://localhost:11434/v1
async-coder config set custom.model qwen2.5-coder:32b`}</code></pre>
      <H2 id="vllm">vLLM</H2>
      <P>
        Launch vLLM with <InlineCode>--api-key sk-local</InlineCode> and point{" "}
        <InlineCode>CUSTOM_BASE_URL</InlineCode> at it.
      </P>
      <H2 id="litellm">LiteLLM gateway</H2>
      <UL>
        <li>Centralize provider keys behind one endpoint.</li>
        <li>Apply per-team budgets and rate limits.</li>
        <li>Mirror requests for observability.</li>
      </UL>
    </DocsLayout>
  ),
});
