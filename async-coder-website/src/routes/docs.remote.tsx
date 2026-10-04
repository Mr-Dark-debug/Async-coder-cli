import { createFileRoute } from "@tanstack/react-router";
import { DocsLayout, H2, P, InlineCode, UL } from "@/components/docs-layout";
import { CodeBlock } from "@/components/code-block";

export const Route = createFileRoute("/docs/remote")({
  head: () => ({
    meta: [
      { title: "Remote control and ecosystem — async-coder docs" },
      { name: "description", content: 'Device pairing, chat bridges, the signed marketplace, evals and Sage review.' },
      { property: "og:title", content: "Remote control and ecosystem — async-coder" },
      { property: "og:url", content: "/docs/remote" },
    ],
    links: [{ rel: "canonical", href: "/docs/remote" }],
  }),
  component: () => (
    <DocsLayout
      title="Remote control and ecosystem"
      description={'Device pairing, chat bridges, the signed marketplace, evals and Sage review.'}
    >
      <H2 id="pairing">Pair a phone or another machine</H2>
      <CodeBlock code={`ASYNC_CODER_SERVER_PASSWORD=secret async-coder serve
async-coder pair            # single-use code, valid 5 minutes
async-coder pair devices
async-coder pair revoke <id>`} />
      <P>On the new device, <InlineCode>POST /pair/exchange</InlineCode> with the code returns a token (shown once, only its hash is stored). Send it as <InlineCode>Authorization: Bearer &lt;token&gt;</InlineCode>. Five wrong codes lock the endpoint for a minute. Devices must be able to reach the server address; there is no relay.</P>
      <H2 id="bridges">Chat bridges</H2>
      <CodeBlock code={`ASYNC_CODER_TELEGRAM_TOKEN=... async-coder bridge telegram --chat 123456789
ASYNC_CODER_DISCORD_TOKEN=...  async-coder bridge discord  --user 987654321
ASYNC_CODER_SLACK_BOT_TOKEN=... ASYNC_CODER_SLACK_APP_TOKEN=... async-coder bridge slack --user U123`} />
      <P>Each chat maps to a persisted session. Only allowlisted chats or users can drive the agent, and an empty allowlist refuses to start. Permission requests are put to the chat; answer <InlineCode>/allow</InlineCode> or <InlineCode>/deny</InlineCode>.</P>
      <H2 id="market">Marketplace</H2>
      <P>A signed registry of skills, agents and commands. Configure <InlineCode>marketplace.registry_url</InlineCode> and <InlineCode>marketplace.public_key</InlineCode>, then use <InlineCode>async-coder market search</InlineCode>, <InlineCode>install</InlineCode>, <InlineCode>update</InlineCode> and <InlineCode>uninstall</InlineCode>. A registry that does not verify against the pinned ed25519 key is refused, every file checksum must match, and updates roll back on failure.</P>
      <H2 id="evals">Evals</H2>
      <CodeBlock code={`async-coder eval run ./evals --models groq/kimi-k2,ollama/qwen3 --out run.json --baseline previous.json`} />
      <P>Golden tasks are markdown files whose frontmatter lists the verify gate. Each task and model runs as a worktree job, and the output is a table of pass rate, cost and duration. <InlineCode>--baseline</InlineCode> exits non-zero on regressions.</P>
      <H2 id="sage">Sage review for jobs</H2>
      <P>With <InlineCode>advisor</InlineCode> configured and <InlineCode>sage.enabled</InlineCode>, the deterministic gate runs first and a model reviews only when the gate fails or the change is high risk. A green, low-risk job costs no extra model call.</P>
    </DocsLayout>
  ),
});
