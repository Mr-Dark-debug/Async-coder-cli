import { createFileRoute } from "@tanstack/react-router";
import { DocsLayout, H2, P, InlineCode, UL } from "@/components/docs-layout";
import { CodeBlock } from "@/components/code-block";

export const Route = createFileRoute("/docs/jobs")({
  head: () => ({
    meta: [
      { title: "Background jobs — async-coder docs" },
      { name: "description", content: 'Detached sessions with their own worktree, spend cap and verification gate.' },
      { property: "og:title", content: "Background jobs — async-coder" },
      { property: "og:url", content: "/docs/jobs" },
    ],
    links: [{ rel: "canonical", href: "/docs/jobs" }],
  }),
  component: () => (
    <DocsLayout
      title="Background jobs"
      description={'Detached sessions with their own worktree, spend cap and verification gate.'}
    >
      <H2 id="what">What a job is</H2>
      <P>A job is a prompt that runs as its own detached session in the server process. It can run in its own git worktree, under a spend cap, and finish only when a deterministic gate passes. Jobs live in the server (<InlineCode>async-coder serve</InlineCode>), so they keep running after a terminal closes.</P>
      <CodeBlock code={`async-coder serve
async-coder jobs run "fix the flaky checkout test" --budget 0.50 --attach http://127.0.0.1:4096
async-coder jobs ls
async-coder jobs cancel <id>     # also removes the job's worktree`} />
      <P>In the TUI, <InlineCode>/jobs</InlineCode> opens the panel: <InlineCode>n</InlineCode> new, <InlineCode>x</InlineCode> cancel, <InlineCode>o</InlineCode> open the job session. The footer shows how many are running, and a finished job rings the terminal bell once (quiet hours are configurable with <InlineCode>notification.quiet_hours</InlineCode>).</P>
      <H2 id="gates">Verification gates and receipts</H2>
      <P>A job is done only when every gate command passes. A failing gate marks it failed; with <InlineCode>verify_retries</InlineCode> the failure output is fed back to the agent. <InlineCode>GET /job/:id/receipt</InlineCode> returns a deterministic markdown receipt with status, cost, tokens, duration, branch, each gate result and any Sage reviews. <InlineCode>POST /job/:id/pr</InlineCode> pushes the branch and opens a draft pull request with the receipt as its body, only when you ask.</P>
      <H2 id="teams">Teams</H2>
      <P>Define workers in <InlineCode>.async-coder/team/&lt;name&gt;.md</InlineCode>, then start them with <InlineCode>/team</InlineCode> or <InlineCode>async-coder jobs team &lt;name&gt;</InlineCode>. Each worker is a job on its own branch. <InlineCode>jobs team-merge &lt;id&gt;</InlineCode> merges finished workers one at a time and stops at the first conflict; <InlineCode>jobs team-reassign &lt;jobId&gt;</InlineCode> replaces a failed worker.</P>
      <CodeBlock code={`---
workers:
  - role: backend
    prompt: Add the /export endpoint.
  - role: tests
    prompt: Cover the /export endpoint.
---
Ship the export feature.`} />
      <H2 id="routines">Routines</H2>
      <P>Routines are cron-triggered jobs that fire from the server process, so they inherit worktree isolation, gates and budgets.</P>
      <CodeBlock code={`{
  "routines": {
    "nightly-deps": {
      "cron": "0 3 * * *",
      "prompt": "audit dependencies and upgrade patch versions",
      "budget_usd": 0.2,
      "verify": ["bun test"]
    }
  }
}`} />
      <P>A job started from a TUI that is not attached to a long-lived server stops when that TUI exits; on the next server start it is marked failed rather than staying running.</P>
    </DocsLayout>
  ),
});
