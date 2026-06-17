import { createFileRoute } from "@tanstack/react-router";
import { DocsLayout, H2, P, InlineCode, UL } from "@/components/docs-layout";

export const Route = createFileRoute("/docs/usage")({
  head: () => ({ meta: [{ title: "Usage dashboard — async-coder docs" }] }),
  component: () => (
    <DocsLayout
      title="Usage dashboard"
      description="Per-model cost tracking, in-session and across the project. Always-on, computed locally from response headers."
    >
      <H2 id="how">How it works</H2>
      <P>
        Every response includes token counts. async-coder multiplies them by the model's
        published price and persists the result in <InlineCode>~/.async-coder/usage.db</InlineCode> (SQLite).
        Open the live dashboard with <InlineCode>/cost</InlineCode> or run{" "}
        <InlineCode>async-coder usage --since 30d</InlineCode> from any shell.
      </P>
      <H2 id="breakdown">Breakdown</H2>
      <UL>
        <li>Input tokens, output tokens, cached tokens (when the provider exposes them).</li>
        <li>Effective $/req and rolling $/hour.</li>
        <li>Per-model, per-agent, and per-project pivots.</li>
      </UL>
      <H2 id="export">Export</H2>
      <pre className="rounded-lg border border-border/60 bg-elevated/60 px-4 py-3 font-mono text-sm overflow-x-auto"><code>async-coder usage --json --since 7d &gt; usage.json</code></pre>
    </DocsLayout>
  ),
});
