# Best-of-N

Give one task to several models at once. Each candidate runs as its own background job in its own
git worktree, so nothing touches your checkout until you choose. When all of them finish, async-coder
ranks the results by evidence and recommends one. You promote the winner with a single command.

This is different from the step-level `max` agent, which samples one model *inside* a single
session. Best-of-N compares whole, independently produced results across models.

## Run

The server must be running (`async-coder serve`), because candidates are ordinary jobs.

```bash
async-coder best-of run "Migrate config loading to the v2 schema" \
  --models anthropic/claude-sonnet-5-5,openai/gpt-5,groq/llama-4 \
  --budget 1.50 \
  --verify "bun test" --verify "bun run typecheck"
```

- `--models` needs at least two distinct models. The limit is 4 candidates; raise it deliberately
  with `--max-candidates`.
- `--budget` is required and is the cap **per candidate**. Total spend is at most
  `budget x candidates`; the command prints that figure before it starts.
- `--verify` is a gate: every command must pass in each candidate's worktree. A failing gate is
  fed back to the agent `--retries` times (default 1) before the candidate is marked failed.
- `--timeout <minutes>` cancels candidates that are still running and ranks what finished.

The output is a comparison table:

```
   model                     result       cost     time  change           branch
*  anthropic/claude-sonnet…  passed       $0.8120  214s  6 files +212/-48 async-coder/job-3f1a
   openai/gpt-5              passed       $1.2040  190s  9 files +301/-77 async-coder/job-81c2
   groq/llama-4              gate failed  $0.1100  96s   2 files +18/-3   async-coder/job-0d77
```

`*` marks the recommendation. A receipt is written to `.async-coder/best-of/<id>.json`.

## How candidates are ranked

1. Finished, and the gate passed.
2. Finished, but no gate was configured (nothing verified it).
3. Finished, but the gate failed.
4. Not finished (failed, cancelled, timed out).

Within a group, lower cost wins, then shorter time. Only groups 1 and 2 are ever recommended; if
nothing qualifies, no recommendation is made and the command exits non-zero. The ranking never
uses a model's opinion of its own work.

## Review and promote

```bash
async-coder best-of show <id>
async-coder best-of promote <id>                 # the recommendation
async-coder best-of promote <id> --winner openai/gpt-5
async-coder best-of promote <id> --winner groq/llama-4 --force   # override a failed gate
```

Promote merges the winning branch into your current branch (fast-forward when possible, otherwise
a merge commit; a conflicted merge is aborted and reported). The other candidates' branches are
left alone so you can still read them; delete them with `git branch -D` when finished. A receipt
can be promoted once.

## Limits worth knowing

- Candidates are never merged automatically. Promotion is always an explicit command.
- Cancelled candidates have their worktree removed by the job system, as with any cancelled job.
- Cost and time come from the job records; a candidate that spent money before failing still shows
  its cost, and that spend counts against your total.
