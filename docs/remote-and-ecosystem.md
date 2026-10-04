# Remote control, chat bridges, marketplace, evals and Sage

## Pairing a phone or another machine

Run `async-coder serve` with `ASYNC_CODER_SERVER_PASSWORD` set, then:

```bash
async-coder pair                 # prints a single-use code, valid 5 minutes
async-coder pair devices
async-coder pair revoke <id>
```

On the new device, `POST /pair/exchange {"code":"ABCD-EFGH","name":"phone"}` returns a long-lived token (shown once, only
its hash is stored). Send it as `Authorization: Bearer <token>`, or `?device_token=<token>` for event streams. Five
wrong codes lock the exchange endpoint for a minute. The embedded web UI is on by default for `serve`.
There is no relay: devices must be able to reach the server's address.

## Chat bridges (Telegram, Discord, Slack)

```bash
ASYNC_CODER_TELEGRAM_TOKEN=... async-coder bridge telegram --chat 123456789 --attach http://127.0.0.1:4096
ASYNC_CODER_DISCORD_TOKEN=...  async-coder bridge discord  --user 987654321
ASYNC_CODER_SLACK_BOT_TOKEN=xoxb-... ASYNC_CODER_SLACK_APP_TOKEN=xapp-... async-coder bridge slack --user U0123ABC
```

Each chat maps to a persisted session. Only allowlisted chats/users may talk to the agent (an empty allowlist refuses to
start). The agent's permission requests are put to the chat; answer `/allow` or `/deny`. `/details` returns the rest of
a long reply, `/new` starts a fresh session. Telegram uses long polling, Discord the Gateway (enable the Message Content
intent for the bot) and Slack Socket Mode. The protocol logic is covered by tests with fake services; the adapters have
not been exercised against live Telegram, Discord or Slack accounts.

## Marketplace

A signed JSON registry of skills, agents and commands. Configure it (there is no default registry):

```json
{ "marketplace": { "registry_url": "https://example.com/registry.json", "public_key": "<64 hex chars>" } }
```

```bash
async-coder market search lint
async-coder market install lint-fixer     # checksums verified, installed atomically, previous version restored on failure
async-coder market update
async-coder market uninstall lint-fixer
async-coder market publish --name mine --kind skill --dir ./mine --files SKILL.md --base-url https://example.com/mine
async-coder market sign registry.json --key private.pem
```

A registry whose ed25519 signature does not match the pinned key is refused; every file's sha256 must match; manifest
paths cannot escape the install directory.

## Evals

Golden tasks are markdown files whose frontmatter lists the `verify` gate:

```markdown
---
verify: ["bun test"]
budget_usd: 0.5
---
Fix the failing date-parsing test.
```

```bash
async-coder eval run ./evals/basics --models groq/kimi-k2,ollama/qwen3 --out run.json --baseline previous.json
async-coder eval compare previous.json run.json
```

Each task × model is a worktree job; a task passes only if the gate passes. Output is a table of pass rate, p50/p95
cost and p50 duration; `--baseline` exits non-zero on regressions.

## Sage review for jobs

```json
{ "advisor": { "model": "anthropic/claude-sonnet-5-5" }, "sage": { "enabled": true } }
```

The deterministic gate always runs first. A model reviews only when the gate fails or the change scores as high risk
(large diff, sensitive paths like auth, migrations, CI, dependencies). A green gate on a low-risk change costs no
extra model call. Sage spend is capped at `sage.budget_share` (default 25%) of a job's budget and every review is
listed on the receipt.
