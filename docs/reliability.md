# Reliability and recovery

Provider queues hold four concurrent streams by default and at most 64 waiting requests. Slots last until streams complete or cancel. Finite Retry-After values impose at most five minutes of cooldown. Queue/cooldown cancellation releases capacity. Session retries use bounded exponential backoff.

Only explicit fallback configuration permits another provider/model. Transient failures can switch before text, reasoning or tool activity. Authentication errors, cancellation and partial responses propagate without replay. Switch events update model attribution and usage prices.

SQLite persists conversations. Checkpoints retain Git snapshots and restore markers. Repository indexing bounds bytes/files; file reads and streaming outputs retain existing limits. TUI error boundaries report failures.

Filesystem containment rejects another Windows drive. Memory paths support native separators and CRLF while denying traversal. Combined subprocess output waits for stdout and stderr. Focused tests, full-suite checks and native UI verification are separate release gates.
