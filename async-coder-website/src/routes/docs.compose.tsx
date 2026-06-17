import { createFileRoute } from "@tanstack/react-router";
import { DocsLayout, H2, P, InlineCode } from "@/components/docs-layout";

export const Route = createFileRoute("/docs/compose")({
  head: () => ({ meta: [{ title: "Compose — async-coder docs" }] }),
  component: () => (
    <DocsLayout
      title="Compose"
      description="Atomic multi-file edits. Stage diffs across N files, preview them as one transaction, accept or reject as a whole."
    >
      <H2 id="invoke">Invoke</H2>
      <P>
        Use <InlineCode>/compose &lt;files…&gt;</InlineCode> or just ask: "compose: rename UserDTO to
        UserSchema across src/." async-coder will hold every diff in memory and present a single
        unified preview.
      </P>
      <H2 id="why">Why</H2>
      <P>
        Refactors that touch many files succeed or fail together. No half-applied state, no broken
        intermediate commits, easy rollback with <InlineCode>/undo</InlineCode>.
      </P>
    </DocsLayout>
  ),
});
