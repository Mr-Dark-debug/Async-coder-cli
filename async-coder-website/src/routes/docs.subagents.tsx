import { createFileRoute } from "@tanstack/react-router";
import { DocsLayout, H2, P, UL } from "@/components/docs-layout";

export const Route = createFileRoute("/docs/subagents")({
  head: () => ({ meta: [{ title: "Subagents — async-coder docs" }] }),
  component: () => (
    <DocsLayout
      title="Subagents"
      description="Fan out work to parallel agents. Each gets its own context window, returns a structured result, costs are tracked separately."
    >
      <H2 id="when">When to use</H2>
      <UL>
        <li>Codebase-wide refactors (one subagent per file or package).</li>
        <li>Research tasks where you want multiple perspectives in parallel.</li>
        <li>Independent test runs — let three subagents try three approaches.</li>
      </UL>
      <H2 id="example">Example</H2>
      <pre className="rounded-lg border border-border/60 bg-elevated/60 px-4 py-3 font-mono text-xs overflow-x-auto"><code>{`> spawn 3 subagents to add prop-types to every component under src/ui/.
   each one handles one third of the files. report back with diffs.`}</code></pre>
      <P>The parent agent merges the diffs, resolves conflicts, and presents one review.</P>
    </DocsLayout>
  ),
});
