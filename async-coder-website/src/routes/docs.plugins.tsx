import { createFileRoute } from "@tanstack/react-router";
import { DocsLayout, H2, P, UL, InlineCode } from "@/components/docs-layout";

export const Route = createFileRoute("/docs/plugins")({
  head: () => ({ meta: [{ title: "Plugins — async-coder docs" }] }),
  component: () => (
    <DocsLayout
      title="Plugins"
      description="Extend async-coder with TypeScript plugins. Add tools, hook into events, register slash commands."
    >
      <H2 id="install">Install</H2>
      <P>Drop a plugin folder under <InlineCode>~/.async-coder/plugins/</InlineCode> or install from npm:</P>
      <pre className="rounded-lg border border-border/60 bg-elevated/60 px-4 py-3 font-mono text-sm overflow-x-auto"><code>async-coder plugin add @async-coder/plugin-eslint</code></pre>
      <H2 id="shape">Plugin shape</H2>
      <pre className="rounded-lg border border-border/60 bg-elevated/60 px-4 py-3 font-mono text-xs overflow-x-auto"><code>{`import { definePlugin } from "async-coder";
export default definePlugin({
  name: "eslint",
  tools: { lint: { description: "Run ESLint", handler: async () => {/* … */} } },
  hooks: { "session.start": (ctx) => ctx.log("ready") },
});`}</code></pre>
      <H2 id="hooks">Hooks</H2>
      <UL>
        <li><InlineCode>session.start</InlineCode>, <InlineCode>session.end</InlineCode></li>
        <li><InlineCode>tool.before</InlineCode>, <InlineCode>tool.after</InlineCode></li>
        <li><InlineCode>diff.before</InlineCode>, <InlineCode>diff.applied</InlineCode></li>
      </UL>
    </DocsLayout>
  ),
});
