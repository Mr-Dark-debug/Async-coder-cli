import { Config } from "effect"

function truthy(key: string) {
  const value = process.env[key]?.toLowerCase()
  return value === "true" || value === "1"
}

function falsy(key: string) {
  const value = process.env[key]?.toLowerCase()
  return value === "false" || value === "0"
}

function number(key: string) {
  const value = process.env[key]
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

const ASYNC_CODER_EXPERIMENTAL = truthy("ASYNC_CODER_EXPERIMENTAL")

// Defaults to false. When enabled, async-coder runs in pure mode:
//   — does NOT inherit Claude Code's settings (CLAUDE.md, ~/.claude/skills, etc.)
//   — does NOT pick up provider API keys from environment variables
// Set ASYNC_CODER_PURE_MODE=true to disable .claude inheritance and env-based
// provider auto-detection.
const ASYNC_CODER_PURE_MODE = truthy("ASYNC_CODER_PURE_MODE")
const ASYNC_CODER_DISABLE_CLAUDE_CODE_ENV = truthy("ASYNC_CODER_DISABLE_CLAUDE_CODE")
const ASYNC_CODER_DISABLE_CLAUDE_CODE = ASYNC_CODER_PURE_MODE || ASYNC_CODER_DISABLE_CLAUDE_CODE_ENV

const ASYNC_CODER_DISABLE_EXTERNAL_SKILLS = truthy("ASYNC_CODER_DISABLE_EXTERNAL_SKILLS")
const ASYNC_CODER_DISABLE_CLAUDE_CODE_SKILLS =
  ASYNC_CODER_DISABLE_EXTERNAL_SKILLS || ASYNC_CODER_DISABLE_CLAUDE_CODE || truthy("ASYNC_CODER_DISABLE_CLAUDE_CODE_SKILLS")
const copy = process.env["ASYNC_CODER_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"]

export const Flag = {
  OTEL_EXPORTER_OTLP_ENDPOINT: process.env["OTEL_EXPORTER_OTLP_ENDPOINT"],
  OTEL_EXPORTER_OTLP_HEADERS: process.env["OTEL_EXPORTER_OTLP_HEADERS"],

  ASYNC_CODER_AUTO_SHARE: truthy("ASYNC_CODER_AUTO_SHARE"),
  ASYNC_CODER_AUTO_HEAP_SNAPSHOT: truthy("ASYNC_CODER_AUTO_HEAP_SNAPSHOT"),
  ASYNC_CODER_GIT_BASH_PATH: process.env["ASYNC_CODER_GIT_BASH_PATH"],
  ASYNC_CODER_CONFIG: process.env["ASYNC_CODER_CONFIG"],
  ASYNC_CODER_CONFIG_CONTENT: process.env["ASYNC_CODER_CONFIG_CONTENT"],

  ASYNC_CODER_DISABLE_AUTOUPDATE: truthy("ASYNC_CODER_DISABLE_AUTOUPDATE"),

  // Defaults to false. Analytics are disabled in async-coder (no telemetry).
  ASYNC_CODER_ENABLE_ANALYSIS: false,
  ASYNC_CODER_ALWAYS_NOTIFY_UPDATE: truthy("ASYNC_CODER_ALWAYS_NOTIFY_UPDATE"),
  ASYNC_CODER_DISABLE_PRUNE: truthy("ASYNC_CODER_DISABLE_PRUNE"),
  ASYNC_CODER_DISABLE_TERMINAL_TITLE: truthy("ASYNC_CODER_DISABLE_TERMINAL_TITLE"),
  ASYNC_CODER_SHOW_TTFD: truthy("ASYNC_CODER_SHOW_TTFD"),
  ASYNC_CODER_PERMISSION: process.env["ASYNC_CODER_PERMISSION"],
  ASYNC_CODER_DISABLE_DEFAULT_PLUGINS: truthy("ASYNC_CODER_DISABLE_DEFAULT_PLUGINS"),
  ASYNC_CODER_DISABLE_LSP_DOWNLOAD: truthy("ASYNC_CODER_DISABLE_LSP_DOWNLOAD"),
  ASYNC_CODER_ENABLE_EXPERIMENTAL_MODELS: truthy("ASYNC_CODER_ENABLE_EXPERIMENTAL_MODELS"),
  ASYNC_CODER_DISABLE_AUTOCOMPACT: truthy("ASYNC_CODER_DISABLE_AUTOCOMPACT"),
  ASYNC_CODER_DISABLE_MODELS_FETCH: truthy("ASYNC_CODER_DISABLE_MODELS_FETCH"),
  ASYNC_CODER_DISABLE_MOUSE: truthy("ASYNC_CODER_DISABLE_MOUSE"),
  ASYNC_CODER_OUTPUT_LENGTH_CONTINUATION_LIMIT: number("ASYNC_CODER_OUTPUT_LENGTH_CONTINUATION_LIMIT") ?? 3,
  ASYNC_CODER_INVALID_OUTPUT_CONTINUATION_LIMIT: number("ASYNC_CODER_INVALID_OUTPUT_CONTINUATION_LIMIT") ?? 2,

  // Caps applied to image attachments before a prompt is sent. Both default to
  // undefined (no limit). ASYNC_CODER_MAX_PROMPT_IMAGES bounds how many images may
  // be sent per request (oldest excess images are dropped); ASYNC_CODER_MAX_PROMPT_IMAGE_SIZE
  // bounds the decoded byte size of a single image. Values must be positive integers.
  ASYNC_CODER_MAX_PROMPT_IMAGES: number("ASYNC_CODER_MAX_PROMPT_IMAGES"),
  ASYNC_CODER_MAX_PROMPT_IMAGE_SIZE: number("ASYNC_CODER_MAX_PROMPT_IMAGE_SIZE"),
  ASYNC_CODER_PURE_MODE,
  ASYNC_CODER_DISABLE_PROVIDER_ENV: ASYNC_CODER_PURE_MODE || truthy("ASYNC_CODER_DISABLE_PROVIDER_ENV"),
  ASYNC_CODER_DISABLE_CLAUDE_CODE,
  get ASYNC_CODER_DISABLE_CLAUDE_CODE_MCP() {
    // MCP compatibility stays on in pure mode so users can reuse Claude Code
    // MCP servers without inheriting prompts, skills, or provider env keys.
    return ASYNC_CODER_DISABLE_CLAUDE_CODE_ENV || truthy("ASYNC_CODER_DISABLE_CLAUDE_CODE_MCP")
  },
  ASYNC_CODER_DISABLE_CLAUDE_CODE_PROMPT: ASYNC_CODER_DISABLE_CLAUDE_CODE || truthy("ASYNC_CODER_DISABLE_CLAUDE_CODE_PROMPT"),
  // Defaults to false (enabled): markdown commands under ~/.claude/commands and
  // {project}/.claude/commands load as slash commands. Independent of the
  // pure-mode master switch. Set ASYNC_CODER_DISABLE_CLAUDE_CODE_COMMANDS=true to disable.
  ASYNC_CODER_DISABLE_CLAUDE_CODE_COMMANDS: truthy("ASYNC_CODER_DISABLE_CLAUDE_CODE_COMMANDS"),
  ASYNC_CODER_DISABLE_CLAUDE_CODE_SKILLS,
  ASYNC_CODER_DISABLE_EXTERNAL_SKILLS,
  ASYNC_CODER_DISABLE_CODEX_SKILLS: ASYNC_CODER_DISABLE_EXTERNAL_SKILLS || truthy("ASYNC_CODER_DISABLE_CODEX_SKILLS"),
  ASYNC_CODER_DISABLE_OPENCODE_SKILLS: ASYNC_CODER_DISABLE_EXTERNAL_SKILLS || truthy("ASYNC_CODER_DISABLE_OPENCODE_SKILLS"),
  ASYNC_CODER_FAKE_VCS: process.env["ASYNC_CODER_FAKE_VCS"],

  // When enabled, skips all git subprocess calls during project discovery
  // (which git, rev-parse --git-common-dir, rev-parse --show-toplevel) and
  // branch detection. The project is treated as a non-git directory rooted at
  // the working directory. Use to avoid touching git in restricted/sandboxed
  // environments or where git startup probing is undesirable.
  ASYNC_CODER_DISABLE_GIT: truthy("ASYNC_CODER_DISABLE_GIT"),
  ASYNC_CODER_SERVER_PASSWORD: process.env["ASYNC_CODER_SERVER_PASSWORD"],
  ASYNC_CODER_SERVER_USERNAME: process.env["ASYNC_CODER_SERVER_USERNAME"],
  ASYNC_CODER_ENABLE_QUESTION_TOOL: truthy("ASYNC_CODER_ENABLE_QUESTION_TOOL"),

  // Experimental
  ASYNC_CODER_EXPERIMENTAL,
  ASYNC_CODER_EXPERIMENTAL_FILEWATCHER: Config.boolean("ASYNC_CODER_EXPERIMENTAL_FILEWATCHER").pipe(
    Config.withDefault(false),
  ),
  ASYNC_CODER_EXPERIMENTAL_DISABLE_FILEWATCHER: Config.boolean("ASYNC_CODER_EXPERIMENTAL_DISABLE_FILEWATCHER").pipe(
    Config.withDefault(false),
  ),
  ASYNC_CODER_EXPERIMENTAL_ICON_DISCOVERY: ASYNC_CODER_EXPERIMENTAL || truthy("ASYNC_CODER_EXPERIMENTAL_ICON_DISCOVERY"),
  ASYNC_CODER_EXPERIMENTAL_DISABLE_COPY_ON_SELECT:
    copy === undefined ? process.platform === "win32" : truthy("ASYNC_CODER_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"),
  ASYNC_CODER_ENABLE_EXA: truthy("ASYNC_CODER_ENABLE_EXA") || ASYNC_CODER_EXPERIMENTAL || truthy("ASYNC_CODER_EXPERIMENTAL_EXA"),
  ASYNC_CODER_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS: number("ASYNC_CODER_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS"),
  ASYNC_CODER_EXPERIMENTAL_OUTPUT_TOKEN_MAX: number("ASYNC_CODER_EXPERIMENTAL_OUTPUT_TOKEN_MAX"),
  ASYNC_CODER_EXPERIMENTAL_OXFMT: ASYNC_CODER_EXPERIMENTAL || truthy("ASYNC_CODER_EXPERIMENTAL_OXFMT"),
  ASYNC_CODER_EXPERIMENTAL_LSP_TY: truthy("ASYNC_CODER_EXPERIMENTAL_LSP_TY"),
  ASYNC_CODER_EXPERIMENTAL_LSP_TOOL: ASYNC_CODER_EXPERIMENTAL || truthy("ASYNC_CODER_EXPERIMENTAL_LSP_TOOL"),
  // Defaults to true: dynamic workflow + built-in deep-research are on by default.
  // Set ASYNC_CODER_EXPERIMENTAL_WORKFLOW_TOOL=false to opt out.
  ASYNC_CODER_EXPERIMENTAL_WORKFLOW_TOOL: !falsy("ASYNC_CODER_EXPERIMENTAL_WORKFLOW_TOOL"),
  ASYNC_CODER_EXPERIMENTAL_MARKDOWN: !falsy("ASYNC_CODER_EXPERIMENTAL_MARKDOWN"),
  ASYNC_CODER_MODELS_URL: process.env["ASYNC_CODER_MODELS_URL"],
  ASYNC_CODER_MODELS_PATH: process.env["ASYNC_CODER_MODELS_PATH"],
  ASYNC_CODER_DISABLE_EMBEDDED_WEB_UI: truthy("ASYNC_CODER_DISABLE_EMBEDDED_WEB_UI"),
  ASYNC_CODER_DB: process.env["ASYNC_CODER_DB"],

  // Defaults to true — all channels share a single async-coder.db. The per-channel
  // DB isolation (async-coder-{channel}.db) is unnecessary since we don't ship
  // multiple release channels yet. Use ASYNC_CODER_HOME to isolate dev
  // environments instead. Set ASYNC_CODER_DISABLE_CHANNEL_DB=false to restore
  // per-channel isolation.
  ASYNC_CODER_DISABLE_CHANNEL_DB: !falsy("ASYNC_CODER_DISABLE_CHANNEL_DB"),
  ASYNC_CODER_SKIP_MIGRATIONS: truthy("ASYNC_CODER_SKIP_MIGRATIONS"),
  ASYNC_CODER_STRICT_CONFIG_DEPS: truthy("ASYNC_CODER_STRICT_CONFIG_DEPS"),

  ASYNC_CODER_WORKSPACE_ID: process.env["ASYNC_CODER_WORKSPACE_ID"],
  ASYNC_CODER_EXPERIMENTAL_HTTPAPI: truthy("ASYNC_CODER_EXPERIMENTAL_HTTPAPI"),
  ASYNC_CODER_EXPERIMENTAL_WORKSPACES: ASYNC_CODER_EXPERIMENTAL || truthy("ASYNC_CODER_EXPERIMENTAL_WORKSPACES"),

  // Evaluated at access time (not module load) because tests, the CLI, and
  // external tooling set these env vars at runtime.
  get ASYNC_CODER_DISABLE_COMPOSE_SKILLS() {
    return truthy("ASYNC_CODER_DISABLE_COMPOSE_SKILLS")
  },
  get ASYNC_CODER_DISABLE_PROJECT_CONFIG() {
    return truthy("ASYNC_CODER_DISABLE_PROJECT_CONFIG")
  },
  get ASYNC_CODER_TUI_CONFIG() {
    return process.env["ASYNC_CODER_TUI_CONFIG"]
  },
  get ASYNC_CODER_CONFIG_DIR() {
    return process.env["ASYNC_CODER_CONFIG_DIR"]
  },
  get ASYNC_CODER_HOME() {
    return process.env["ASYNC_CODER_HOME"]
  },
  get ASYNC_CODER_PURE() {
    return truthy("ASYNC_CODER_PURE")
  },
  get ASYNC_CODER_PLUGIN_META_FILE() {
    return process.env["ASYNC_CODER_PLUGIN_META_FILE"]
  },
  get ASYNC_CODER_CLIENT() {
    return process.env["ASYNC_CODER_CLIENT"] ?? "cli"
  },
}
