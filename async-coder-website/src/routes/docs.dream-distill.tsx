import { createFileRoute } from "@tanstack/react-router";
import { DocsLayout, H2, P, InlineCode } from "@/components/docs-layout";

export const Route = createFileRoute("/docs/dream-distill")({
  head: () => ({ meta: [{ title: "Dream & Distill — async-coder docs" }] }),
  component: () => (
    <DocsLayout
      title="Dream & Distill"
      description="Two thinking modes. Dream explores without touching code. Distill compresses a long conversation into the few facts worth remembering."
    >
      <H2 id="dream">/dream</H2>
      <P>
        Brainstorm ideas, explore design space, sketch options. Tools are disabled — no diffs, no
        shell, no writes. Use it to think out loud before committing to a direction.
      </P>
      <H2 id="distill">/distill</H2>
      <P>
        At the end of a long session, run <InlineCode>/distill</InlineCode>. async-coder produces a
        short summary plus a list of candidate memories. Accept the ones you want and the rest is
        thrown away — your next session starts clean but informed.
      </P>
    </DocsLayout>
  ),
});
