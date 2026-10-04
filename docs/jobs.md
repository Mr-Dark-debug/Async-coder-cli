# Background jobs, teams and verification

A job is a prompt that runs as its own detached session in the server process. It can run inside its own
git worktree, under a spend cap, and finish only when a deterministic gate passes.

Jobs live in the server (`async-coder serve`), so they keep running after a terminal closes. A job started from a
TUI that is not attached to a long-lived server stops when that TUI exits; on the next server start such
jobs are marked **failed** ("Server stopped while the job was running") instead of staying "running" forever.

## Start and manage

```bash
async-coder serve                                   # long-lived server
async-coder jobs run "fix the flaky checkout test" \
  --budget 0.50 --attach http://127.0.0.1:4096      # own worktree by default
async-coder jobs ls
async-coder jobs get <id>
async-coder jobs cancel <id>                        # also removes the job's worktree
```

In the TUI: `/jobs` (alias `/tasks`) opens the panel — `n` new, `x` cancel, `o` open the job's session. The footer
shows how many jobs are running. When a job finishes you get a toast, a terminal bell and an OSC 9
notification (once per job). `notification.quiet_hours` suppresses them:

```json
{ "notification": { "quiet_hours": { "start": "22:00", "end": "07:00" } } }
```

HTTP: `GET/POST /job`, `GET /job/:id`, `POST /job/:id/cancel`, `GET /job/:id/receipt`, `POST /job/:id/pr`.

## Models

`--model provider/model` is a literal. Anything else is resolved as a model group or capability alias:
`ultra`/`standard`/`lite` tiers, your own `model_groups`, and `cheap`, `local`, `long-context`
(chosen from the models that are connected right now, and only tool-capable ones).

## Gates, retries and receipts

```bash
async-coder jobs run "make the tests pass" --verify "bun test" --verify "bun run lint"
```

(`verify` is an array on `POST /job`; `verify_retries` feeds a failing gate's output back to the agent up to N times.)
A job is **done** only if every gate passes. A failing gate marks it **failed** with the failing command and exit code.
`GET /job/:id/receipt` returns a deterministic markdown receipt: status, cost, tokens, duration, branch, each gate
result and any Sage reviews.

`POST /job/:id/pr` pushes the job branch and opens a **draft** pull request whose body is the receipt. It is only
ever run on your explicit request, refuses jobs whose gate failed, and uses your own git credentials and `gh` login.

Finished worktree jobs have their changes committed on their branch (`job: <name>`).

## Teams

A team is a set of workers, each a job on its own worktree branch. Define one in `.async-coder/team/<name>.md`:

```markdown
---
workers:
  - role: backend
    prompt: Add the /export endpoint.
  - role: tests
    prompt: Cover the /export endpoint.
    budget_usd: 0.5
---
Ship the export feature.
```

`/team` (TUI) or `async-coder jobs team <name>` starts every worker. `jobs team-status <id>` shows progress,
`jobs team-merge <id>` merges finished workers into the current branch one at a time, in start order, and stops at the
first conflict (that merge is aborted cleanly). `jobs team-reassign <jobId>` replaces a failed or cancelled worker with
a fresh job carrying the same assignment. The decomposition of a plan into workers is yours (the manifest); the lead
agent does not split plans automatically.

## Routines

```json
{
  "routines": {
    "nightly-deps": {
      "cron": "0 3 * * *",
      "prompt": "audit dependencies for CVEs and upgrade patch versions",
      "budget_usd": 0.2,
      "verify": ["bun test"]
    }
  }
}
```

Routines fire from the server process (checked every 20 seconds, at most once per minute) as ordinary jobs,
so they inherit worktree isolation, gates and budgets. Invalid cron expressions are logged at startup.
