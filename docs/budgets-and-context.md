# Budgets, usage and context

## Spend caps

```json
{
  "usage": {
    "budget": {
      "per_session_usd": 2,
      "per_agent_usd": 0.5,
      "daily_usd": 10,
      "monthly_usd": 100,
      "default_action": "stop",
      "warn_at": 0.8
    }
  }
}
```

Caps are checked before every model call from stored message costs, across all agents and sessions.
`default_action`:

- `stop` (default): the turn ends with a visible error ("Budget reached: per-session spend $… is at or over the $… cap.").
- `downgrade`: the rest of the loop continues on the `lite` tier.
- `warn`: keep going; you only get warnings.

A warning toast appears once per cap when spend reaches `warn_at` of it. An agent can also carry its own cap in its
frontmatter: `max_usd: 0.25` (always stops that agent) and `fallback: ["groq/llama-3.3-70b", "ollama/qwen3"]`
(an ordered chain used when the agent's model fails with a retryable error; a toast says when a fallback took over).

A single model call can overshoot a cap, because its cost is only known once it finishes.

## Usage dashboard

`/usage` has three tabs (press `tab`): this session, **today** and **month** across all sessions, grouped by provider,
model and agent, with cache read/write tokens and a month-end projection from the current run rate.
`GET /usage/summary?range=day|month` serves the same data.

## Context

`/context` shows the context window: used tokens against the model's limit, a breakdown (system prompt, rules, tool
schemas and memory as one remainder; your messages; assistant text; tool calls and results; reasoning; attachments),
a projection of how many turns until compaction, and `c` to compact now. Conversation slices are estimates
(about four characters per token); the total comes from the provider. The footer shows `ctx N%` (orange from 70%,
red from 85%).

```json
{ "compaction": { "threshold": 0.85 } }
```

`compaction.threshold` starts automatic compaction at that fraction of the usable window instead of waiting until it
is full (default `1`).

## Memory

Relevant notes are recalled into each new user turn (default on, at most 12 notes and ~1,500 tokens):

```json
{ "memory": { "auto": true, "recall_limit": 12, "token_budget": 1500 } }
```

`/memory` lists every note, lets you view, **pin** (always recalled) or **forget** (delete) it. Notes are written by
the existing memory tools and the dream/distill workflows; there is no hidden extraction step, so every note on disk is
one you can see and delete.

## Side notes

While an agent is working, `/btw <note>` adds a note it reads before its next model call; `/steer <note>` frames it as a
course correction. Neither creates a user turn; the note appears muted under your last message. Inside a subagent's
view the note goes to that subagent.
