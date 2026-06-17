import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/page";
import { ProviderShowcase } from "@/components/sections/providers";

export const Route = createFileRoute("/providers")({
  head: () => ({
    meta: [
      { title: "Providers — async-coder" },
      {
        name: "description",
        content:
          "Groq, OpenRouter, OpenAI, Anthropic, Google, xAI, Copilot — or any OpenAI-compatible endpoint.",
      },
      { property: "og:title", content: "Providers — async-coder" },
      { property: "og:url", content: "/providers" },
    ],
    links: [{ rel: "canonical", href: "/providers" }],
  }),
  component: ProvidersPage,
});

function ProvidersPage() {
  return (
    <Page
      eyebrow="Providers"
      title="Every provider. One agent."
      description="Add a key once. Models auto-load. Switch any time. No vendor lock-in."
    >
      <ProviderShowcase />
    </Page>
  );
}
