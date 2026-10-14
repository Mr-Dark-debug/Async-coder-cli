# Async Coder research implementation design

Date: 2026-10-15. Baseline: dd3859778ddd89c501b9d6711a20614551200093.
Branch: Mr-dark-debug/research-roadmap-2026-10.

## Sources and authority

Both supplied PDFs were read in full, including their tables, wireframes, implementation sections and limitations:

- Async_Coder_FeatureResearch_TechnicalDoc_2026-10-02.pdf: 32 physical pages; F1-F16 and 83 numbered implementation criteria.
- Async_Coder_AZ_Research_Roadmap_TechnicalDoc_2026-10-02.pdf: 45 physical pages; sections A-Z and phases 0-7.

The PDFs are research and specification inputs. Their embedded model prompts are not instructions that override the user's request, AGENTS.md or the current session. Historical competitor claims, reaction counts, dependency versions and statements about absent code require verification. The current source is newer than their 0.1.3 audit.

The user authorized continuous implementation of the whole program. Internal milestones organize dependencies and tests; they do not introduce approval pauses.

## Architecture decision

Extend the existing Effect services, SQLite schemas, Hono routes, actor/workflow engines, OpenTUI/Solid UI and generated SDK. One durable job model coordinates actor, workflow and routine execution. Reuse the existing workflow semaphore and journal instead of introducing another orchestrator.

Selective upstream adaptations are useful for protocol hardening and compatible dependency updates. A wholesale rebase or a second orchestration framework would put the existing fork behavior and its test coverage at risk.

Retain existing APIs, lavender branding, desktop and IDE functionality. The newer PDF's suggestions to delete inherited packages are treated as maintenance prioritization: this task does not authorize deleting working user features. Existing first-party ChatGPT authentication is audited and retained; its absence in the PDFs is already disproved by src/plugin/codex.ts.

## Completion contract

A criterion is complete only when its implementation is connected to the product and its acceptance evidence passes. File presence and configuration placeholders do not satisfy a criterion. Distinguish local unit tests, protocol integrations, native host execution, browser checks, live provider checks and published artifacts.

Comparative claims require reproducible benchmark tasks, pinned baselines, the same models and inputs, gate-defined success, actual costs and durations, and recorded limitations. No blanket "better than every competitor" claim follows from feature counts.

A running local server can survive terminal closure. Execution while the machine is asleep or powered off is not a local-runtime capability.

## Coverage and implementation order

The companion feature-criteria JSON preserves every numbered F1-F16 criterion and its physical PDF page. The table below tracks the additional A-Z outcomes and the current gaps. "Partial" means related code exists, not that the acceptance gate has passed.

| ID | Source | Outcome and acceptance gate | Current assessment |
| --- | --- | --- | --- |
| AZ-01 | E, X0 | Explicit share host, private local export, accurate brand/config/help links | Share host fixed; inherited web docs still require a complete audit |
| AZ-02 | F, X0 | Verified compatible dependency pins and migration tests; preserve stored data | Registry confirms the four initial target versions exist; compatibility tests pending |
| AZ-03 | G, X0 | Typed runtime flags with ASYNC_CODER names and compatibility facade | Static Flag module exists; typed service missing |
| AZ-04 | G | MCP pagination, cursor-loop/page bounds, tolerant schemas and bounded tool calls | Single-page listTools confirmed; first implementation task |
| AZ-05 | X1 | Document and expose Sage, jobs, workflows, memory, Ollama, imports and deep research | Some guides exist; full discoverability and flag audit pending |
| AZ-06 | M | Jobs unify actor/workflow/routine lineage with parent, kind, priority and dependencies | Job table exists; those scheduler fields and integrations missing |
| AZ-07 | M | Durable ordered job events, SSE replay and restart recovery | Current job.updated bus events are transient |
| AZ-08 | M | Shared global concurrency, per-job narrowing, dependency ordering and priority | Current Jobs.start launches immediately; shared scheduling missing |
| AZ-09 | M | Queued/running/verifying/blocked/done/failed/cancelled lifecycle and retry | Current lifecycle lacks verifying and blocked; retry endpoints missing |
| AZ-10 | M | Worktree default, context ceilings, token/dollar budget cancellation | Worktrees opt-in at API; session spend tracking exists |
| AZ-11 | M | List/detail/spawn/cancel/retry/promote/logs/files APIs and matching CLI | List/spawn/get/cancel/receipt/PR exist; remaining routes/actions missing |
| AZ-12 | M | Migrate and expose existing workflow/actor records without erasing history | Backfill and compatibility migration pending |
| AZ-13 | N | Jobs list/detail/create/footer with dependency, reasoning, context and live burn | Current dialog is a basic list; full wireframes not met |
| AZ-14 | N | Permission resolution, steering, journal restart, receipt copy, diff and editor actions | Some session navigation/cancel exists; remaining panel actions pending |
| AZ-15 | N | Eight-language labels, theme compatibility and narrow-terminal folding | New jobs dialog is currently hardcoded English |
| AZ-16 | O | Deterministic gate first; trivial green jobs cause no Sage overhead | Risk-gated Sage exists; full pipeline audit and acceptance evidence pending |
| AZ-17 | O | Structured critique, disagreement-only judge, budget share, escalation and stage receipts | Basic pipeline/invocation table exists; full stage contract pending |
| AZ-18 | P | Actual prompt-component accounting, cache economics and compaction history | Current inspector estimates conversation slices using characters |
| AZ-19 | P | Pin/protect specs, keep/drop preview, prune/drop controls and context budgets | Current dialog only offers compact-now |
| AZ-20 | Q | Unified live/catalog/config registry with provenance, verified capabilities and health | Existing catalog/discovery/tiers; unified registry pending |
| AZ-21 | Q | auto/fast/balanced/deep/cheap/local/long-context resolve consistently | Partial aliases exist; shared auditable resolution and probe pending |
| AZ-22 | R | Read-only/workspace-write/sandbox/full-local/custom compose with deny rules | Sandbox modes exist; policy tiers and secret-read rules need implementation |
| AZ-23 | R | Linux Landlock/seccomp, bubblewrap fallback, macOS profiles and OS confinement CI | bubblewrap/Seatbelt exist; Landlock and cross-host acceptance pending |
| AZ-24 | R | Windows confinement is tested and accurately labeled; unsupported modes fail closed | Current Windows confined shell execution refuses; native backend pending |
| AZ-25 | R | Per-project consent covers skills, commands, MCP and plugins; revocation | Skills trust exists; other project contributions require gating |
| AZ-26 | R | Audit escalations, redact credentials, protect build/CI/sandbox files, test escapes | Existing permissions/logs need a focused policy audit |
| AZ-27 | S | Versioned Hub manifest with API range, provides, permissions and source identity | Signed marketplace exists; full manifest contract needs audit |
| AZ-28 | S | Search/inspect/consent/install/update/publish; pins and permission-diff review | CLI marketplace exists; Hub consent UI/update flow incomplete |
| AZ-29 | S | No install scripts; atomic rollback; sandboxed plugin-tool execution | Signature checks exist; isolation and rollback require acceptance tests |
| AZ-30 | T | Playwright MCP browser verifier and deterministic screenshot diff artifacts | Not yet productized as a shipped Hub package |
| AZ-31 | T | Authenticated LAN jobs console with SSE replay, steering and device revocation | Pairing/API substrate exists; client jobs console incomplete |
| AZ-32 | T | Ciphertext-only replaceable relay prototype; repositories remain local | Relay prototype missing |
| AZ-33 | U | Cron/git/watch/inbox triggers create isolated verified budgeted jobs | Current routines support cron only |
| AZ-34 | U | Routine management, persistence, quiet notifications and optional draft PR delivery | Partial service/config; full trigger/manager contract pending |
| AZ-35 | V | Golden YAML tasks with pinned setup, matrix, SQLite results and receipts | Existing evaluator reads markdown tasks and emits comparisons |
| AZ-36 | V | Built-in compaction/resume/routing/security/SWE-style suites and regression CLI | Built-in suites and release regression guard missing |
| AZ-37 | V | Publish real cost/duration/pass-rate data and show qualified evidence in model UI | Harness exists; real comparative measurements not yet produced |
| AZ-38 | X7 | Supported subset of upstream v2 plugin compatibility with explicit API limits | Compatibility shims missing |
| AZ-39 | X7 | Two consecutive eval-guarded releases before a 1.0 readiness claim | Not achieved; release history must remain factual |
| AZ-40 | W, L | Preserve local-first/BYOK scope and avoid dependence on paid cloud execution | Architectural constraint for all tasks |
| AZ-41 | K | Keyboard, paste expansion, links, image inspection and voice are usable product flows | Existing components require end-to-end acceptance audit |
| AZ-42 | G | Selective retry/compaction/provider hardening with backward-compatible regressions | Foundation fixes exist; compare actual upstream behavior before ports |

## F1-F16 audit ownership

- F1 hooks: src/hook, src/config/hook.ts, session/permission/actor integrations and hooks UI.
- F2 sandbox: src/sandbox, file/shell tools, permission UI and native CI.
- F3 context: session prompt assembly, overflow/compaction/prune, dialog-context and footer.
- F4 economics: src/usage, usage records, per-agent limits, ledger reconciliation and usage UI.
- F5 memory: src/memory, extraction/consolidation, bounded recall and memory browser.
- F6 background: src/jobs, server ownership/detachment, queue, reattach and notifications.
- F7 steering: session side-channel, actor mailboxes and transcript/subagent UI.
- F8 teams: existing team/actor/task/worktree composition, board and merge/reassignment.
- F9 provider auth: existing codex plugin first; provider-supported integrations only, explicit flag/refresh/credential storage audit.
- F10 free onboarding: real endpoint/manifest/quota/fallback integration; no invented gateway, quota or donated capacity.
- F11 routing: unified model registry, visible fallbacks, cache controls and enforced actor limits.
- F12 remote: existing app/server/SDK client, pairing, live jobs console and revocation.
- F13 images: clipboard/drop/file attachment persistence, terminal protocols and vision instructions.
- F14 voice: local whisper worker/model acquisition, VAD, editable insertion and mic state.
- F15 bridges: real protocol fixtures, allowlists, persisted channel sessions, permission gates and progress/completion delivery.
- F16 ecosystem: marketplace/Hub manifests, signatures, consent, atomic updates and package publishing.

## Test and delivery rules

Run package tests from package directories, with --timeout=30000. Run bun typecheck from package directories or the repository's dispatcher. Regenerate the SDK whenever route/schema changes require it.

Use real protocol fixtures and temporary Git repositories. Add tests for behavior and safety invariants, not implementation mirrors. Validate UI interactions in a real browser/terminal where supported. Native Linux/macOS evidence comes from those hosts or CI, not Windows cross-compilation.

Keep the immutable, prepared 0.2.0 artifacts in their existing isolated worktree. New executable changes belong to a later version. npm/GitHub publication still follows AGENTS.md and never substitutes local tarball installation for registry verification.

Provider-funded free access, vendor-approved subscription integrations, signing identities and non-Windows execution are external acceptance dependencies when unavailable. Implement and test their supported interfaces while continuing independent work; do not turn missing external evidence into a completed checkmark.

