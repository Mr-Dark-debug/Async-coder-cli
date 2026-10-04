import { createFileRoute } from "@tanstack/react-router";
import { DocsLayout, H2, P, InlineCode, UL } from "@/components/docs-layout";
import { CodeBlock } from "@/components/code-block";

export const Route = createFileRoute("/docs/budgets")({
  head: () => ({
    meta: [
      { title: "Budgets and context — async-coder docs" },
      { name: "description", content: 'Spend caps, the usage dashboard, the context inspector and early compaction.' },
      { property: "og:title", content: "Budgets and context — async-coder" },
      { property: "og:url", content: "/docs/budgets" },
    ],
    links: [{ rel: "canonical", href: "/docs/budgets" }],
  }),
  component: () => (
    <DocsLayout
      title="Budgets and context"
      description={'Spend caps, the usage dashboard, the context inspector and early compaction.'}
    >
      <H2 id="caps">Spend caps</H2>
      <CodeBlock code={`{
  "usage": {
    "budget": {
      "per_session_usd": 2,
      "per_agent_usd": 0.5,
      "daily_usd": 10,
      "monthly_usd": 100,
      "default_action": "stop",
      "warn_at": 0.8
    }
  }
}`} />
      <P>Caps are checked before every model call from stored message costs. <InlineCode>default_action</InlineCode> is <InlineCode>stop</InlineCode> (the turn ends with a clear message), <InlineCode>downgrade</InlineCode> (continue on the lite tier) or <InlineCode>warn</InlineCode>. An agent can carry its own <InlineCode>max_usd</InlineCode> and an ordered <InlineCode>fallback</InlineCode> list in its frontmatter. A single model call can overshoot a cap because its cost is known only when it finishes.</P>
      <H2 id="usage">Usage dashboard</H2>
      <P><InlineCode>/usage</InlineCode> has three tabs (press tab): this session, today and this month across all sessions, grouped by provider, model and agent, with cache tokens and a month-end projection from the current run rate.</P>
      <H2 id="context">Context inspector</H2>
      <P><InlineCode>/context</InlineCode> shows used tokens against the model limit, a breakdown by source, a projection of turns until compaction, and <InlineCode>c</InlineCode> to compact now. The footer shows <InlineCode>ctx N%</InlineCode>. <InlineCode>compaction.threshold</InlineCode> starts automatic compaction at a fraction of the usable window (default 1, meaning only when full).</P>
      <H2 id="notes">Side notes to a running agent</H2>
      <P><InlineCode>/btw note</InlineCode> adds a note the agent reads before its next model call; <InlineCode>/steer note</InlineCode> frames it as a course correction. Neither creates a user turn.</P>
    </DocsLayout>
  ),
});
