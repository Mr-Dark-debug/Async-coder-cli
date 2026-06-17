import { createFileRoute } from "@tanstack/react-router";
import { DocsLayout, H2, P } from "@/components/docs-layout";
import { CodeBlock } from "@/components/code-block";

export const Route = createFileRoute("/docs/configuration")({
  head: () => ({
    meta: [
      { title: "Configuration — async-coder docs" },
      { name: "description", content: "Every field in async-coder.json, with examples." },
      { property: "og:title", content: "Configuration — async-coder" },
      { property: "og:url", content: "/docs/configuration" },
    ],
    links: [{ rel: "canonical", href: "/docs/configuration" }],
  }),
  component: Config,
});

const TOC = [
  { id: "location", label: "File location" },
  { id: "shape", label: "Schema" },
  { id: "example", label: "Full example" },
];

function Config() {
  return (
    <DocsLayout
      title="Configuration"
      description="async-coder reads a JSON config from your project root or home directory."
      toc={TOC}
    >
      <H2 id="location">File location</H2>
      <P>
        async-coder looks for <code className="font-mono text-foreground">async-coder.json</code> in
        these locations, in order. The first one found wins.
      </P>
      <CodeBlock code={`./async-coder.json
./.async-coder/config.json
~/.config/async-coder/config.json`} />

      <H2 id="shape">Schema</H2>
      <P>All keys are optional. Defaults are sensible.</P>
      <CodeBlock
        filename="schema"
        lang="ts"
        code={`type Config = {
  provider?: "groq" | "openrouter" | "openai" | "anthropic"
           | "google" | "xai" | "copilot" | "custom";
  model?: string;          // e.g. "llama-3.3-70b-versatile"
  websearch?: {
    provider: "duckduckgo" | "tavily" | "brave" | "google" | "exa";
    numResults?: number;   // default 5
    timeout?: number;      // seconds, default 20
  };
  memory?: {
    enabled?: boolean;     // default true
    maxTokens?: number;    // injected memory budget
  };
  ui?: { theme?: "lavender" | "system" };
};`}
      />

      <H2 id="example">Full example</H2>
      <CodeBlock
        filename="async-coder.json"
        lang="json"
        code={`{
  "provider": "groq",
  "model": "llama-3.3-70b-versatile",
  "websearch": {
    "provider": "tavily",
    "numResults": 8,
    "timeout": 25
  },
  "memory": { "enabled": true, "maxTokens": 4000 },
  "ui": { "theme": "lavender" }
}`}
      />
    </DocsLayout>
  );
}
