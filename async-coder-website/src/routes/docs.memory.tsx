import { createFileRoute } from "@tanstack/react-router";
import { DocsLayout, H2, P, InlineCode } from "@/components/docs-layout";

export const Route = createFileRoute("/docs/memory")({
  head: () => ({ meta: [{ title: "Persistent memory — async-coder docs" }] }),
  component: () => (
    <DocsLayout
      title="Persistent memory"
      description="Long-term rules and facts that survive across sessions. Project-scoped and global."
    >
      <H2 id="scopes">Scopes</H2>
      <P>
        Memories live in two places: <InlineCode>./.async-coder/memory.md</InlineCode> (project, commit it)
        and <InlineCode>~/.async-coder/memory.md</InlineCode> (global, personal).
      </P>
      <H2 id="commands">Commands</H2>
      <pre className="rounded-lg border border-border/60 bg-elevated/60 px-4 py-3 font-mono text-sm overflow-x-auto"><code>{`/memory list
/memory add "always use bun, never npm"
/memory pin <id>
/memory forget <id>`}</code></pre>
      <H2 id="auto">Auto-capture</H2>
      <P>
        After every session, async-coder distills the conversation into candidate memories. You approve
        or discard. Nothing is auto-saved silently.
      </P>
    </DocsLayout>
  ),
});
