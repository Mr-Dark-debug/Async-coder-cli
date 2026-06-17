import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/page";
import { Features as FeaturesGrid } from "@/components/sections/features";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — async-coder" },
      {
        name: "description",
        content:
          "Multi-provider onboarding, per-model cost dashboards, pluggable web search, persistent memory, subagents, compose, dream & distill.",
      },
      { property: "og:title", content: "Features — async-coder" },
      { property: "og:url", content: "/features" },
    ],
    links: [{ rel: "canonical", href: "/features" }],
  }),
  component: FeaturesPage,
});

function FeaturesPage() {
  return (
    <Page
      eyebrow="Features"
      title="Everything in async-coder."
      description="A guided tour of the agents, orchestration, memory, dashboards, and workflows that ship in every install."
    >
      <FeaturesGrid />
    </Page>
  );
}
