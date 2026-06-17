import { createFileRoute } from "@tanstack/react-router";
import { DocsLayout, H2, P, InlineCode } from "@/components/docs-layout";

export const Route = createFileRoute("/docs/api")({
  head: () => ({ meta: [{ title: "SDK / API — async-coder docs" }] }),
  component: () => (
    <DocsLayout
      title="SDK reference"
      description="Programmatic API. Use async-coder inside your own scripts, build bots, automate code changes from CI."
    >
      <H2 id="install">Install</H2>
      <pre className="rounded-lg border border-border/60 bg-elevated/60 px-4 py-3 font-mono text-sm overflow-x-auto"><code>npm i async-coder</code></pre>
      <H2 id="example">Example</H2>
      <pre className="rounded-lg border border-border/60 bg-elevated/60 px-4 py-3 font-mono text-xs overflow-x-auto"><code>{`import { createSession } from "async-coder";

const session = await createSession({
  cwd: process.cwd(),
  provider: "groq",
  model: "llama-3.3-70b-versatile",
});

const result = await session.run("add a /health route to the express app");
console.log(result.diffs);
await session.apply();`}</code></pre>
      <H2 id="ref">Surface</H2>
      <P>
        <InlineCode>createSession</InlineCode>, <InlineCode>session.run</InlineCode>,{" "}
        <InlineCode>session.apply</InlineCode>, <InlineCode>session.cost</InlineCode>,{" "}
        <InlineCode>session.close</InlineCode>. Streaming events via{" "}
        <InlineCode>session.on("token" | "tool" | "diff", …)</InlineCode>.
      </P>
    </DocsLayout>
  ),
});
