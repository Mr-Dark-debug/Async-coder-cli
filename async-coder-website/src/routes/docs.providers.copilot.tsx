import { createFileRoute } from "@tanstack/react-router";
import { DocsLayout, H2, P, InlineCode } from "@/components/docs-layout";

export const Route = createFileRoute("/docs/providers/copilot")({
  head: () => ({ meta: [{ title: "GitHub Copilot — async-coder docs" }] }),
  component: () => (
    <DocsLayout title="GitHub Copilot" description="Use your existing Copilot subscription as a model provider — no separate billing.">
      <H2 id="key">Auth</H2>
      <P>Run <InlineCode>async-coder auth login github</InlineCode> and follow the device-code flow. Requires an active Copilot subscription.</P>
      <H2 id="config">Configure</H2>
      <pre className="rounded-lg border border-border/60 bg-elevated/60 px-4 py-3 font-mono text-sm overflow-x-auto"><code>{`async-coder /model copilot/claude-sonnet-4.5
async-coder /model copilot/gpt-5`}</code></pre>
      <P>Verified students, teachers, and OSS maintainers get Copilot for free.</P>
    </DocsLayout>
  ),
});
