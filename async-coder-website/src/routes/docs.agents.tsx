import { createFileRoute } from "@tanstack/react-router";
import { DocsLayout, H2, P, UL, InlineCode } from "@/components/docs-layout";

export const Route = createFileRoute("/docs/agents")({
  head: () => ({ meta: [{ title: "Agents — async-coder docs" }] }),
  component: () => (
    <DocsLayout
      title="Agents"
      description="Agents are scoped personalities. Each one has its own system prompt, tool allow-list, and model preference."
      toc={[
        { id: "concept", label: "Concept" },
        { id: "builtin", label: "Built-in agents" },
        { id: "custom", label: "Custom agents" },
      ]}
    >
      <H2 id="concept">Concept</H2>
      <P>
        An agent in async-coder is a configured profile: a system prompt, a list of allowed
        tools, an optional preferred model, and metadata that controls how it shows up in
        the picker. Agents let you switch contexts without re-prompting.
      </P>
      <H2 id="builtin">Built-in agents</H2>
      <UL>
        <li><InlineCode>coder</InlineCode> — default, full tool access, diff-first edits.</li>
        <li><InlineCode>reviewer</InlineCode> — read-only, focuses on critique and risk.</li>
        <li><InlineCode>architect</InlineCode> — high-level design, no file writes.</li>
        <li><InlineCode>debugger</InlineCode> — shell + log access, narrow scope.</li>
      </UL>
      <H2 id="custom">Custom agents</H2>
      <P>
        Drop a YAML file under <InlineCode>~/.async-coder/agents/&lt;name&gt;.yaml</InlineCode>{" "}
        and it appears in <InlineCode>/agent</InlineCode>. Fields: <InlineCode>name</InlineCode>,
        <InlineCode>model</InlineCode>, <InlineCode>tools</InlineCode>, <InlineCode>system</InlineCode>.
      </P>
      <pre className="rounded-lg border border-border/60 bg-elevated/60 px-4 py-3 font-mono text-xs overflow-x-auto"><code>{`name: tests
model: groq/llama-3.3-70b-versatile
tools: [read, write, run]
system: |
  You write tests first. Vitest. Tight assertions. No mocks unless asked.`}</code></pre>
    </DocsLayout>
  ),
});
