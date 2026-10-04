---
name: refactor
description: Improve code structure while preserving observable behavior and public compatibility.
---

Read instructions, callers, and existing checks. Identify the concrete maintenance problem and keep scope focused.
Preserve public APIs and observable behavior unless a change is requested.
Make small coherent edits following repository conventions. Avoid speculative abstraction and unrelated cleanup.
Run checks that exercise the affected behavior and explain any remaining verification gaps.
