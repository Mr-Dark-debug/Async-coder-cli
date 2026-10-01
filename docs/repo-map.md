# Repository maps

Tree-sitter indexes declarations and imports in TypeScript/TSX, JavaScript, Python, Go, Rust, Java, C, C++, and Ruby. It extracts names, signatures and line locations without injecting function bodies.

`repo_map`, `find_symbol` and `find_dependencies` use the current workspace. Relative source imports form dependency edges; package and runtime imports are not a complete call graph. Use LSP for semantic references.

The instance cache reuses hashes for unchanged files. Watcher events invalidate it; a short refresh interval covers missed events. Discovery is bounded to 10,000 candidates, indexing to 2,000 files, each at most 1 MB and 16 MB total. Dependency/generated directories and paths outside the workspace are excluded. Limits deliberately trade coverage for bounded latency and memory.

Agent requests include about 1,500 estimated tokens when `repo_map` permission is enabled. Queries prioritize relevant symbols. Estimates use characters, not provider tokenizers; explicit reads remain necessary for implementation details. Tests cover all ten language families, updates/deletions, cache reuse, dependencies, scope, sizes and budgets.
