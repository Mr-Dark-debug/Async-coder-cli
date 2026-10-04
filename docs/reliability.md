# Reliability and recovery

Provider queues hold four concurrent streams by default and at most 64 waiting requests. Slots last until streams complete or cancel. Finite Retry-After values impose at most five minutes of cooldown. Queue/cooldown cancellation releases capacity. Session retries use bounded exponential backoff.

Only explicit fallback configuration permits another provider/model. Transient failures can switch before text, reasoning or tool activity. Authentication errors, cancellation and partial responses propagate without replay. Switch events update model attribution and usage prices.

```json
{
  "reliability": {
    "provider_concurrency": 4,
    "max_retries": 2,
    "fallback_models": ["your-other-provider/your-configured-model"]
  }
}
```

Fallback destinations must be configured and authenticated. The ordered list authorizes sending the current conversation to those destinations. An unavailable configured fallback is skipped with a log warning. Setup failures and streaming error events follow the same failover boundary. Bun's reusable fetch transport and cached provider SDKs reuse connections; the queue adds stream admission control rather than buffering response bodies.

SQLite persists conversations. Checkpoints retain Git snapshots and restore markers. Repository indexing bounds bytes/files; file reads and streaming outputs retain existing limits. TUI error boundaries report failures.

Filesystem containment rejects another Windows drive. Memory paths support native separators and CRLF while denying traversal. Combined subprocess output waits for stdout and stderr. Focused tests, full-suite checks and native UI verification are separate release gates.
