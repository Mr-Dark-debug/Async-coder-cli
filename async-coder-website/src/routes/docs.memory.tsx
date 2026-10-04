import { createFileRoute } from "@tanstack/react-router";
import { DocsLayout, H2, P, InlineCode, UL } from "@/components/docs-layout";
import { CodeBlock } from "@/components/code-block";

export const Route = createFileRoute("/docs/memory")({
  head: () => ({
    meta: [
      { title: "Persistent memory — async-coder docs" },
      { name: "description", content: 'Notes that survive across sessions, recalled automatically and fully under your control.' },
      { property: "og:title", content: "Persistent memory — async-coder" },
      { property: "og:url", content: "/docs/memory" },
    ],
    links: [{ rel: "canonical", href: "/docs/memory" }],
  }),
  component: () => (
    <DocsLayout
      title="Persistent memory"
      description={'Notes that survive across sessions, recalled automatically and fully under your control.'}
    >
      <H2 id="recall">Automatic recall</H2>
      <P>At the start of each user turn, relevant notes are recalled into the prompt, bounded to a note count and a token budget. Notes you pin are always recalled.</P>
      <CodeBlock code={`{ "memory": { "auto": true, "recall_limit": 12, "token_budget": 1500 } }`} />
      <H2 id="browser">Memory browser</H2>
      <P><InlineCode>/memory</InlineCode> lists every note and lets you view, pin or forget it. There is no hidden extraction step: notes are written by the memory tools and the <InlineCode>/dream</InlineCode> and <InlineCode>/distill</InlineCode> workflows, so every note on disk is one you can see and delete.</P>
      <H2 id="workflows">Dream and distill</H2>
      <P><InlineCode>/dream</InlineCode> consolidates durable knowledge from session traces; <InlineCode>/distill</InlineCode> packages repeated workflows into skills, agents or commands.</P>
    </DocsLayout>
  ),
});
