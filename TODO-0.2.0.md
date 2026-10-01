# async-coder 0.2.0 upgrade

Requested scope: all sixteen tasks in the attached implementation prompt. Existing implementations are retained and audited; completion requires working integration and tests, not matching a proposed directory tree.

- [ ] Baseline: architecture audit, dependency install, package tests and typechecks
- [ ] 1. MCP: transports, tool bridge, configuration compatibility, CLI/TUI, tests
- [ ] 2. LSP: discovery, diagnostics, code intelligence, edit integration, tests
- [ ] 3. Agents: specialized agents, skills, lifecycle hooks, permissions, tests
- [ ] 4. Worktrees: CLI management, isolated execution, merge/status, tests
- [ ] 5. Checkpoints: explicit file/conversation checkpoints, restore, retention, tests
- [ ] 6. Repository map: structural parsing, incremental updates, bounded context, tools, tests
- [ ] 7. Desktop: sessions/diffs/settings, background tray, completion notifications, tests
- [ ] 8. Sharing: offline HTML/JSON exports and existing hosted sharing, tests
- [ ] 9. Instructions: global/project/local/directory hierarchy, tests
- [ ] 10. Models: verified discovery/pricing/recommendations, no invented model metadata
- [ ] 11. Zen: honest free-model discovery/routing/authentication/fallback, tests
- [ ] 12. VS Code: async-coder panel/actions/status/diffs/shortcuts, tests
- [ ] 13. TUI: command/status/input/rendering/shortcut audit and enhancements, tests
- [ ] 14. Reliability: retry/queue/degradation/streaming/recovery audit, tests
- [ ] 15. Documentation: English/Chinese README, feature guides and examples
- [ ] 16. Release: 0.2.0 versions, SDK generation, builds/checks, commit/push, npm verification, GitHub release

## Decisions

- Extend existing Effect services, instance scoping, SQLite sessions, MCP SDK and Electron/Solid UI.
- Preserve lavender branding and existing configuration names; add compatibility for `.async-coder` paths where needed.
- Provider discovery is authoritative. Requested model IDs and keyless services must be verified before advertising them.
- Publishing follows AGENTS.md: npm binary then installer, clean-install verification, then GitHub publication.
- Work occurs on `Mr-dark-debug/feature-upgrade-0.2.0`; repository instructions identify `dev` as the default comparison branch.

## Evidence

- Initial checkout clean at `96a30f5`; local branch was `main`. Remote has both `main` and `dev`.
- Dependency installation started; baseline checks pending.
