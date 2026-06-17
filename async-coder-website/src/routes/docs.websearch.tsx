import { createFileRoute } from "@tanstack/react-router";
import { DocsLayout, H2, P, UL, InlineCode } from "@/components/docs-layout";

export const Route = createFileRoute("/docs/websearch")({
  head: () => ({ meta: [{ title: "Web search — async-coder docs" }] }),
  component: () => (
    <DocsLayout
      title="Web search"
      description="Pluggable search backends. Pick one (or none) — the agent uses it whenever it needs current information."
      toc={[
        { id: "backends", label: "Supported backends" },
        { id: "config", label: "Configuration" },
        { id: "usage", label: "Usage" },
      ]}
    >
      <H2 id="backends">Supported backends</H2>
      <UL>
        <li><strong>Tavily</strong> — fast, ranked, citation-friendly. Free tier: 1k searches/mo.</li>
        <li><strong>Brave Search</strong> — independent index, 2k queries/mo free.</li>
        <li><strong>Serper</strong> — Google SERP, 2.5k queries free.</li>
        <li><strong>Exa</strong> — embedding-based, great for code/research.</li>
        <li><strong>DuckDuckGo</strong> — no key required, lower recall.</li>
      </UL>
      <H2 id="config">Configuration</H2>
      <pre className="rounded-lg border border-border/60 bg-elevated/60 px-4 py-3 font-mono text-xs overflow-x-auto"><code>{`{
  "search": { "provider": "tavily", "apiKey": "\${TAVILY_API_KEY}", "maxResults": 5 }
}`}</code></pre>
      <H2 id="usage">Usage</H2>
      <P>Run <InlineCode>/search how does react 19 transitions work</InlineCode> or just ask — the agent will call search itself when it needs to.</P>
    </DocsLayout>
  ),
});
