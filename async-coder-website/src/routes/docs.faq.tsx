import { createFileRoute } from "@tanstack/react-router";
import { DocsLayout, H2, P } from "@/components/docs-layout";

const QA: [string, string][] = [
  ["Does async-coder phone home?", "No. There is no telemetry, no analytics, no required login. Audit the source — that's the whole point of the fork."],
  ["Is my code sent anywhere besides my model provider?", "Only to the provider you configured, and only when you send a message. async-coder makes no other outbound requests except optional web search (which you also configure)."],
  ["Can I use it with a self-hosted model?", "Yes. Point the custom provider at any OpenAI-compatible endpoint — Ollama, vLLM, LM Studio, LiteLLM."],
  ["What's the relationship to OpenCode and MiMo-Code?", "async-coder is forked from OpenCode (sst/opencode) via MiMo-Code. We removed Xiaomi-specific telemetry/integrations and refocused on BYOK + multi-provider."],
  ["Why lavender?", "Distinct from the upstream and from every other terminal tool. Also calming."],
  ["Is it free?", "MIT, free forever. You pay your model provider directly. We never proxy."],
  ["How is it different from Aider or Cursor?", "Terminal-native like Aider, but multi-provider out of the box, with a built-in cost dashboard and pluggable web search. Not an editor like Cursor."],
];

export const Route = createFileRoute("/docs/faq")({
  head: () => ({ meta: [{ title: "FAQ — async-coder docs" }] }),
  component: () => (
    <DocsLayout title="FAQ" description="Common questions, candid answers.">
      <H2 id="faq">Frequently asked</H2>
      <div className="space-y-6 mt-4">
        {QA.map(([q, a]) => (
          <div key={q}>
            <div className="font-semibold text-foreground">{q}</div>
            <P>{a}</P>
          </div>
        ))}
      </div>
    </DocsLayout>
  ),
});
