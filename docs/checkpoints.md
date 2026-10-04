# File and conversation checkpoints

```sh
async-coder checkpoint create SESSION_ID --description "Before refactor" --files src/api.ts
async-coder checkpoint list SESSION_ID
async-coder checkpoint restore SESSION_ID CHECKPOINT_ID
```

Checkpoints store conversations and retained Git snapshots in SQLite. File checkpoints require a Git project and enabled snapshots. Defaults keep ten per session; configure `checkpoints: { "enabled": true, "retention": 10 }`. Mutating tools and commands checkpoint before execution.

Normal restore rewinds files identified by checkpoint ownership and later session patches, preserving unrelated edits. `--files` explicitly includes additional paths. `--all-files` includes every changed snapshot file, including manual edits. Stop active agents first; outside-workspace paths are rejected.

The TUI `/rewind` dialog lists checkpoints; `/checkpoint` saves one. The tool and typed session API use the same implementation. A durable `restoring` marker precedes disk changes. Conversation restoration is transactional after successful file restoration; failure preserves it and allows retry. Retained Git refs prevent garbage collection. This is local recovery, not backup of ignored files or other workspaces.

Tests restore modifications/additions/deletions, conversation anchors and unrelated edits, and check retention and active-session/scope rejection.
