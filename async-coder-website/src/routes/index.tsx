import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { Hero } from "@/components/sections/hero";
import { Capabilities } from "@/components/sections/capabilities";
import { Parallel } from "@/components/sections/parallel";
import { Models } from "@/components/sections/models";
import { Numbers } from "@/components/sections/numbers";
import { GetStarted } from "@/components/sections/get-started";
import { LatestReleases, ContributorsWall } from "@/components/sections/community";
import { FinalCTA } from "@/components/sections/final-cta";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "async-coder — code that keeps shipping while you're away" },
      {
        name: "description",
        content:
          "Bring your own key — Groq, OpenRouter, OpenAI, Anthropic, Google, xAI, Copilot. Background jobs in isolated worktrees with spend caps and verification gates. Per-model cost dashboards. MIT-licensed, zero telemetry.",
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
      <Capabilities />
      <Parallel />
      <Models />
      <Numbers />
      <GetStarted />
      <LatestReleases />
      <ContributorsWall />
      <FinalCTA />
    </SiteLayout>
  );
}
