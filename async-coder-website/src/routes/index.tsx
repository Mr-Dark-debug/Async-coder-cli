import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { Hero } from "@/components/sections/hero";
import { Features } from "@/components/sections/features";
import { ProviderShowcase } from "@/components/sections/providers";
import { UsageDashboard } from "@/components/sections/usage-dashboard";
import { WebSearch } from "@/components/sections/web-search";
import { Migration } from "@/components/sections/migration";
import { QuickInstall } from "@/components/sections/quick-install";
import {
  CommunityStats,
  LatestReleases,
  ContributorsWall,
} from "@/components/sections/community";
import { FinalCTA } from "@/components/sections/final-cta";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "async-coder — the async coding agent for every model" },
      {
        name: "description",
        content:
          "Bring your own key — Groq, OpenRouter, OpenAI, Anthropic, Google, xAI, Copilot. Per-model cost dashboards. Pluggable web search. MIT-licensed, zero telemetry.",
      },
      { property: "og:title", content: "async-coder" },
      {
        property: "og:description",
        content: "The async coding agent for every model. Terminal-native, BYOK, MIT.",
      },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Home,
});

function Home() {
  return (
    <SiteLayout>
      <Hero />
      <CommunityStats />
      <Features />
      <ProviderShowcase />
      <UsageDashboard />
      <WebSearch />
      <Migration />
      <QuickInstall />
      <LatestReleases />
      <ContributorsWall />
      <FinalCTA />
    </SiteLayout>
  );
}
