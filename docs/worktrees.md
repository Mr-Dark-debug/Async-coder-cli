# Isolated Git worktrees

```sh
async-coder worktree create fix-login --base dev
async-coder worktree spawn add-tests --base dev --prompt "Add regression tests"
async-coder worktree list
async-coder worktree merge fix-login
async-coder worktree remove fix-login
```

Default base: remote default, `origin/dev`, `dev`, then `HEAD`. `--base` chooses a ref; `--branch` names the new branch. Each checkout has its own instance/session directory. The permission-controlled `worktree` tool exposes management to agents. Existing workflow isolation uses the native worktree service.

Commit before merging. Merge uses `--ff-only` into a clean destination. Removal accepts managed worktrees only and refuses primary/current checkouts, dirty/locked worktrees and unmerged branches. It never force-removes files or deletes branches. Ctrl+T opens TUI controls. Tests use two real worktrees to verify file/session isolation, refusals, merge and cleanup.
