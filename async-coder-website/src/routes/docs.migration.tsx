import { createFileRoute, Link } from "@tanstack/react-router";
import { DocsLayout, H2, P, UL } from "@/components/docs-layout";
import { CodeBlock } from "@/components/code-block";

export const Route = createFileRoute("/docs/migration")({
  head: () => ({
    meta: [
      { title: "Migration from MiMo-Code — async-coder docs" },
      { name: "description", content: "Move from MiMo-Code to async-coder. It's one launch — your sessions and config carry over." },
      { property: "og:title", content: "Migration — async-coder" },
      { property: "og:url", content: "/docs/migration" },
    ],
    links: [{ rel: "canonical", href: "/docs/migration" }],
  }),
  component: Mig,
});

const TOC = [
  { id: "auto", label: "What happens automatically" },
  { id: "manual", label: "Manual checks" },
  { id: "rollback", label: "Rollback" },
];

function Mig() {
  return (
    <DocsLayout
      title="Migrate from MiMo-Code"
      description="If you used MiMo-Code, async-coder picks up exactly where you left off."
      toc={TOC}
    >
      <H2 id="auto">What happens automatically</H2>
      <P>On first launch, async-coder does a one-time, idempotent migration:</P>
      <UL>
        <li>Copies <code className="font-mono text-foreground">~/.local/share/mimocode/mimocode.db</code> → <code className="font-mono text-foreground">~/.local/share/async-coder/async-coder.db</code></li>
        <li>Copies <code className="font-mono text-foreground">~/.config/mimocode/</code> → <code className="font-mono text-foreground">~/.config/async-coder/</code></li>
        <li>Renames provider env-var <em>fallbacks</em> (MiMo originals still work)</li>
        <li>Never deletes the old directories</li>
      </UL>

      <H2 id="manual">Manual checks</H2>
      <P>Worth a 30-second sanity check after first launch:</P>
      <CodeBlock code={`async-coder /usage    # verify historical metrics are present
async-coder /memory   # verify memories carried over
async-coder /agents   # verify your custom agents are present`} />

      <H2 id="rollback">Rollback</H2>
      <P>
        The original MiMo-Code directories are left untouched. Uninstall async-coder and your
        MiMo-Code install resumes exactly as it was.
      </P>
      <CodeBlock code={`npm uninstall -g async-coder
# MiMo-Code is unaffected.`} />
      <P>
        Need more help? See the{" "}
        <Link to="/docs/configuration" className="text-lavender hover:underline">
          configuration guide
        </Link>{" "}
        or open a discussion on GitHub.
      </P>
    </DocsLayout>
  );
}
