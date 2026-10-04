# Persistent project instructions

async-coder reads user and project instruction files on each session and adds them to the system prompt. Existing `CLAUDE.md`, deprecated `CONTEXT.md`, explicit instruction paths, and remote instruction URLs remain compatible.

The user config directory's `AGENTS.md` supplies general defaults. `ASYNC_CODER_CONFIG_DIR/AGENTS.md`, when present, takes precedence over that user file. Project `AGENTS.md` files are loaded from the repository root toward the current directory. `.async-coder/AGENTS.md` adds project guidance, followed by `.async-coder/AGENTS.local.md` for local overrides. More specific instructions should resolve conflicts in general guidance.

When the agent reads a file below the current directory, nearby directory `AGENTS.md` files are attached in parent-to-child order. Repeated reads do not attach the same instructions twice in a turn. Sibling directories cannot accidentally inherit each other's instructions through a shared path prefix.

Use normal file-edit tools to update instruction files. Keep shared project guidance in committed `AGENTS.md`; keep personal project overrides in `AGENTS.local.md`. async-coder adds an `AGENTS.local.md` entry to the configuration directory's `.gitignore`, preserving existing excludes.

The separate existing memory tool stores and searches project, session, and global notes. Windows and POSIX file paths are supported, including Claude Code memory compatibility and CRLF frontmatter. Scope IDs and keys reject path traversal and absolute-path injection.
