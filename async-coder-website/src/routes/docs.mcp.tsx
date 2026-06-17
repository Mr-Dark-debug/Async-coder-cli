import { createFileRoute } from "@tanstack/react-router";
import { DocsLayout, H2, P, InlineCode, UL } from "@/components/docs-layout";

export const Route = createFileRoute("/docs/mcp")({
  head: () => ({ meta: [{ title: "MCP — async-coder docs" }] }),
  component: () => (
    <DocsLayout
      title="Model Context Protocol (MCP)"
      description="async-coder is an MCP client. Connect it to any MCP server to expand its tool surface — databases, browsers, ticket systems, anything."
      toc={[
        { id: "configure", label: "Configure servers" },
        { id: "popular", label: "Popular servers" },
      ]}
    >
      <H2 id="configure">Configure servers</H2>
      <P>Add an <InlineCode>mcp</InlineCode> block to <InlineCode>async-coder.json</InlineCode>:</P>
      <pre className="rounded-lg border border-border/60 bg-elevated/60 px-4 py-3 font-mono text-xs overflow-x-auto"><code>{`{
  "mcp": {
    "filesystem": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem", "."] },
    "github":     { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-github"], "env": { "GITHUB_TOKEN": "\${GITHUB_TOKEN}" } },
    "postgres":   { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-postgres", "\${DATABASE_URL}"] }
  }
}`}</code></pre>
      <H2 id="popular">Popular MCP servers</H2>
      <UL>
        <li><strong>filesystem</strong> — bounded local file access</li>
        <li><strong>github</strong> — issues, PRs, code search</li>
        <li><strong>postgres / sqlite</strong> — schema-aware SQL</li>
        <li><strong>playwright</strong> — browser automation</li>
        <li><strong>linear / jira</strong> — ticket sync</li>
      </UL>
    </DocsLayout>
  ),
});
