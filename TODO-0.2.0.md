# async-coder 0.2.0 upgrade

Requested scope: all sixteen tasks in the attached implementation prompt. Existing implementations are retained and audited; completion requires working integration and tests, not matching a proposed directory tree.

- [x] Baseline: architecture audit, dependency install, package tests and typechecks
- [x] 1. MCP: transports, tool bridge, configuration compatibility, CLI/TUI, tests
- [x] 2. LSP: discovery, diagnostics, code intelligence, edit integration, tests
- [x] 3. Agents: specialized agents, skills, lifecycle hooks, permissions, tests
- [x] 4. Worktrees: CLI management, isolated execution, merge/status, tests
- [x] 5. Checkpoints: explicit file/conversation checkpoints, restore, retention, tests
- [x] 6. Repository map: structural parsing, incremental updates, bounded context, tools, tests
- [x] 7. Desktop: sessions/diffs/settings, background tray, completion notifications, tests
- [x] 8. Sharing: offline HTML/JSON exports and existing hosted sharing, tests
- [x] 9. Instructions: global/project/local/directory hierarchy, tests
- [x] 10. Models: verified discovery/pricing/recommendations, no invented model metadata
- [x] 11. Zen: honest free-model discovery/routing/authentication/fallback, tests
- [x] 12. VS Code: async-coder panel/actions/status/diffs/shortcuts, tests
- [x] 13. TUI: command/status/input/rendering/shortcut audit and enhancements, tests
- [x] 14. Reliability: retry/queue/degradation/streaming/recovery audit, tests
- [x] 15. Documentation: English/Chinese README, feature guides and examples
- [ ] 16. Release: 0.2.0 versions, SDK generation, builds/checks, commit/push, npm verification, GitHub release

## Decisions

- Extend existing Effect services, instance scoping, SQLite sessions, MCP SDK and Electron/Solid UI.
- Preserve lavender branding and existing configuration names; add compatibility for `.async-coder` paths where needed.
- Provider discovery is authoritative. Requested model IDs and keyless services must be verified before advertising them.
- Publishing follows AGENTS.md: npm binary then installer, clean-install verification, then GitHub publication.
- The foundation branch was merged in PR #3. Integrated verification uses the isolated `Mr-dark-debug/release-verification-0.2.0` checkout; repository instructions identify `dev` as the default comparison branch.

## Evidence

- Initial checkout clean at `96a30f5`; local branch was `main`. Remote has both `main` and `dev`.
- Dependencies installed and architecture audited. Initial full suite: 3,235 passing, 124 failing, 1 error; Windows fixtures and real defects are being repaired.
- Final integrated core suite: 3,579 passing, 25 skipped, one existing TODO, zero failures and 10,191 assertions across 368 files.
- All twelve workspace package typechecks pass on frozen source. Other package tests: app 320, shared 53, UI 14, desktop 13, VS Code 3, console 17; all 420 pass.
- Real browser session-tab regression passes: create, switch, close, persist; backend sessions survive tab closure.
- All twelve platform binaries rebuild from frozen source with 42 migrations using verified official runtimes. Native Windows x64/baseline version checks, the compiled provider/repository-map roundtrip, app/website/desktop production builds and clean local npm tarball installation pass. Other host execution remains unverified.
- npm login verified. No 0.2.0 npm package or public GitHub release has been published yet.
