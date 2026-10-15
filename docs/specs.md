# Spec-driven workflow and artifacts

Two built-in tools give the agent durable, reviewable documents instead of long chat plans.

## `spec` tool

Specs live in `.async-coder/specs/<name>/{requirements,design,tasks}.md` of the current project directory. The workflow is **ordered and enforced by the tool**: `design` cannot be written before `requirements`, and `tasks` cannot be written before `design`.

| Operation | Purpose |
| --- | --- |
| `list` | Specs, which documents exist, and task progress |
| `read` / `write` | Read or save a document (writes go through the normal `edit` permission) |
| `tasks` | Parsed task list, progress, and requirement ids no task covers |
| `ready` | Tasks that can run now — independent tasks form a parallel wave |
| `complete` | Mark a task done; refused while its dependencies are open |

Formats the parser understands:

```markdown
### Requirement 1
1.1 WHEN a user signs in THEN the system SHALL create a session

- [ ] 1 Core model
  - [x] 1.1 Define types
    - _Requirements: 1.1_
  - [ ] 1.2 Persistence
    - _Requirements: 2.1_
    - _Depends: 1.1_
  - [ ]* 1.3 Property tests        <!-- `*` after the checkbox = optional, skipped by `ready` -->
```

Spec names are lowercase letters, digits and hyphens (maximum 63), so a name can never address a path outside `.async-coder/specs`.

## `artifact` tool

Session artifacts live in `.async-coder/artifacts/<session-id>/`:

- `task.md` — live checklist updated as work proceeds
- `implementation_plan.md` — written before non-trivial edits
- `walkthrough.md` — what changed and how it was verified

Every write keeps the previous revision as `<name>.rev.<n>.md` and records `{revision, summary, review, comments}` in `<name>.meta.json`. A new revision resets `review` to `pending`.

## Not done yet

- Review gate: nothing blocks `plan_exit` on an artifact review yet, and there is no server route or client UI for approving or commenting.
- `async-coder spec run` (execute ready tasks as gated jobs) and the `/spec` TUI dialog.
- Bundled spec skills that teach the model the document templates.
