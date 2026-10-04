import { createFileRoute } from "@tanstack/react-router";
import { DocsLayout, H2, P, InlineCode, UL } from "@/components/docs-layout";
import { CodeBlock } from "@/components/code-block";

export const Route = createFileRoute("/docs/usage")({
  head: () => ({
    meta: [
      { title: "Usage dashboard — async-coder docs" },
      { name: "description", content: 'Per-model cost tracking for this session, today and this month, computed locally.' },
      { property: "og:title", content: "Usage dashboard — async-coder" },
      { property: "og:url", content: "/docs/usage" },
    ],
    links: [{ rel: "canonical", href: "/docs/usage" }],
  }),
  component: () => (
    <DocsLayout
      title="Usage dashboard"
      description={'Per-model cost tracking for this session, today and this month, computed locally.'}
    >
      <H2 id="how">How it works</H2>
      <P>Every response carries token counts. async-coder prices them with the provider catalog and stores the result with the message, so nothing leaves your machine. Open <InlineCode>/usage</InlineCode> and press tab to move between this session, today and this month.</P>
      <H2 id="breakdown">Breakdown</H2>
      <UL>
        <li>Input, output, reasoning and cache read/write tokens.</li>
        <li>Spend by provider, model and agent.</li>
        <li>A month-end projection from the current run rate.</li>
        <li>Export to CSV with <InlineCode>e</InlineCode> in the session tab.</li>
      </UL>
      <H2 id="budgets">Budgets</H2>
      <P>Set <InlineCode>usage.budget</InlineCode> to cap spend per session, agent, day or month. See the budgets and context page.</P>
    </DocsLayout>
  ),
});
