---
name: spec
description: Plan a feature or fix as an ordered spec (requirements, design, tasks) and execute it task by task with the spec tool.
---

Use the `spec` tool for the documents; do not write them with the file tools. The tool refuses a document
whose predecessors do not exist, so work in order and stop for the user's review between documents.

1. Pick a short spec name (lowercase letters, digits, hyphens). Read existing code first; do not guess.
2. **requirements**: user stories with numbered acceptance criteria in the form
   `WHEN <event> THEN the system SHALL <response>`. Cover error and edge cases. Ask the user to confirm.
3. **design**: architecture, components and interfaces, data models, error handling, testing strategy.
   Reference requirement ids. Ask the user to confirm.
4. **tasks**: at most two levels. Each sub-task is a concrete coding step that builds on the previous one and
   ends wired into the rest of the code; no orphan code. Put `_Requirements: 1.2_` under each task and
   `_Depends: 1.1_` when order matters. Mark optional test sub-tasks with `*` after the checkbox.
   Call `spec` operation `tasks` and make sure no requirement is reported as uncovered.
5. **execute**: call `ready`, implement one task at a time (independent ready tasks may be delegated to subagents
   in parallel), run the relevant tests, then call `complete`. Never mark a task complete without verification you
   actually ran; if something fails, report it and leave the task open.

Keep the `task` and `walkthrough` artifacts (see the `artifact` tool) for the session summary.
