# async-coder 0.2.0 design

Implement the supplied sixteen-part upgrade by extending the fork's existing services. Replacing working MCP, LSP, actors, tasks, snapshots, skills, workspaces or desktop session UI with parallel implementations would break compatibility and duplicate state. Audit each requirement against the real implementation, add missing entry points and capabilities, and test the user-visible behavior.

Core configuration additions use the existing schema and instance-scoped services. Global instructions load first, followed by project and local instructions. MCP configuration supports the existing `mcp` format and the supplied `mcpServers` format. Hooks run bounded child processes with structured input; blocking failures stop pre-events. Repository indexing extracts signatures with tree-sitter, excludes ignored files, and uses bounded output. Explicit checkpoints reuse Git snapshots and persist session anchors with retention.

Independent workstreams cover (1) MCP/LSP/agents/hooks/instructions, (2) desktop/VS Code/TUI, and (3) worktrees/checkpoints/sharing/reliability. The primary integrator owns repository maps, provider verification, documentation and release. Each workstream supplies test evidence and identifies unsupported requirements.

Model listings come from provider/catalog discovery with verified metadata. No requested speculative identifier gets fabricated prices or capabilities. Free models are labeled with actual authentication requirements; no keyless hosted gateway is claimed without a verified service.

Validation proceeds from baseline tests through focused integration tests, package typechecks, SDK regeneration and application builds. Release 0.2.0 is published only when required checks are satisfied; npm publication and clean-install smoke verification precede GitHub publication. Native builds for unavailable platforms and unauthenticated external services are reported honestly.
