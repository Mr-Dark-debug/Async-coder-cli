import { createFileRoute } from "@tanstack/react-router";
import { DocsLayout, H2, P, InlineCode, UL } from "@/components/docs-layout";
import { CodeBlock } from "@/components/code-block";

export const Route = createFileRoute("/docs/safety")({
  head: () => ({
    meta: [
      { title: "Safety, sandbox and trust — async-coder docs" },
      { name: "description", content: 'No implicit share host, trusted project skills, OS sandbox modes and lifecycle hooks.' },
      { property: "og:title", content: "Safety, sandbox and trust — async-coder" },
      { property: "og:url", content: "/docs/safety" },
    ],
    links: [{ rel: "canonical", href: "/docs/safety" }],
  }),
  component: () => (
    <DocsLayout
      title="Safety, sandbox and trust"
      description={'No implicit share host, trusted project skills, OS sandbox modes and lifecycle hooks.'}
    >
      <H2 id="defaults">Safer defaults</H2>
      <UL>
        <li><InlineCode>/share</InlineCode> has no default host: set <InlineCode>enterprise.url</InlineCode> or <InlineCode>ASYNC_CODER_SHARE_URL</InlineCode>. Offline export is always available.</li>
        <li>A repository's own <InlineCode>.claude</InlineCode>, <InlineCode>.codex</InlineCode> and <InlineCode>.opencode</InlineCode> skills load only after <InlineCode>async-coder trust grant</InlineCode> (or <InlineCode>skills.trust_project</InlineCode>). Your user-level skills always load.</li>
      </UL>
      <H2 id="sandbox">Sandbox</H2>
      <CodeBlock code={`{ "sandbox": { "mode": "writes", "writable_paths": ["~/.cache"] } }`} />
      <P><InlineCode>writes</InlineCode> confines shell commands and file tools to the project, the temp directory and <InlineCode>writable_paths</InlineCode>; <InlineCode>full</InlineCode> also blocks the network. Linux uses bubblewrap, macOS uses Seatbelt. If no backend is available the command is refused rather than run unconfined, and Windows has no backend so confined modes are unavailable there. <InlineCode>/sandbox</InlineCode> cycles the mode and the footer shows it.</P>
      <H2 id="hooks">Hooks</H2>
      <P>Shell hooks run on lifecycle events: tool calls, file edits, commands, session start and end, user prompt, permission request, compaction, subagent start and stop, notification and errors. <InlineCode>pre_*</InlineCode> hooks can block with a non-zero exit. <InlineCode>/hooks</InlineCode> lists them and toggles <InlineCode>enabled</InlineCode>.</P>
    </DocsLayout>
  ),
});
