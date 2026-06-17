import { createFileRoute } from "@tanstack/react-router";
import { DocsLayout, H2, P, UL } from "@/components/docs-layout";
import { CodeBlock } from "@/components/code-block";

export const Route = createFileRoute("/docs/quickstart")({
  head: () => ({
    meta: [
      { title: "Quickstart — async-coder docs" },
      { name: "description", content: "Install async-coder, add a provider key, and ship your first prompt in under 60 seconds." },
      { property: "og:title", content: "Quickstart — async-coder" },
      { property: "og:url", content: "/docs/quickstart" },
    ],
    links: [{ rel: "canonical", href: "/docs/quickstart" }],
  }),
  component: Quickstart,
});

const TOC = [
  { id: "install", label: "1 · Install" },
  { id: "add-key", label: "2 · Add your key" },
  { id: "first-run", label: "3 · First run" },
  { id: "slash", label: "Slash commands" },
];

function Quickstart() {
  return (
    <DocsLayout
      title="Quickstart"
      description="Install async-coder, add a provider key, and ship your first prompt in under 60 seconds."
      toc={TOC}
    >
      <H2 id="install">1 · Install</H2>
      <P>Install globally via your package manager of choice.</P>
      <CodeBlock filename="bash" code={`# npm
npm install -g async-coder

# bun
bun add -g async-coder

# curl installer (Linux/macOS)
curl -fsSL https://async-coder.dev/install.sh | bash`} />

      <H2 id="add-key">2 · Add your key</H2>
      <P>
        On first run, async-coder walks you through picking a provider. We recommend Groq — it's
        free, fast, and a key takes 30 seconds to create at console.groq.com/keys.
      </P>
      <CodeBlock code={`async-coder
# → Pick Groq (recommended)
# → Paste GROQ_API_KEY (gsk_…)
# → Done.`} />

      <H2 id="first-run">3 · First run</H2>
      <P>Run inside any project directory. Ask anything.</P>
      <CodeBlock code={`cd ~/projects/my-app
async-coder
› refactor src/api.ts to use Zod for input validation`} />
      <P>Watch the sidebar — you'll see live token usage, dollar cost, and context-window fill.</P>

      <H2 id="slash">Slash commands</H2>
      <UL>
        <li><code className="font-mono text-foreground">/help</code> — list every command</li>
        <li><code className="font-mono text-foreground">/usage</code> — open the usage dashboard</li>
        <li><code className="font-mono text-foreground">/web</code> — run a web search</li>
        <li><code className="font-mono text-foreground">/agents</code> — switch agent (build / plan / compose)</li>
        <li><code className="font-mono text-foreground">/dream</code> — extract knowledge from this session</li>
        <li><code className="font-mono text-foreground">/distill</code> — package a workflow into a skill</li>
      </UL>
    </DocsLayout>
  );
}
