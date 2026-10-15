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

## Review of the plan

When the agent has written an `implementation_plan` artifact, `plan_exit` asks you to approve *that* revision. Approving marks it `approved` in `implementation_plan.meta.json`; typing feedback instead marks it `changes` and keeps your text as a comment, so the next revision can address it. A new revision resets the review to `pending`.

## Running a spec

```sh
async-coder spec status auth                 # progress, ready tasks, requirements no task covers
async-coder serve                            # jobs run in the server
async-coder spec run auth --verify "bun test"            # one task at a time
async-coder spec run auth --wave --verify "bun test"     # independent ready tasks together
async-coder spec run auth --task 2.1         # a single task
```

Each task is a background job in its own worktree. The spec documents are embedded in the job prompt (an uncommitted spec is not in a fresh worktree). A task is marked done only after its job finished, its gate passed and its branch merged into the project — in task order, so later tasks start from a tree that contains earlier ones. The run stops at the first failed job, failed gate or merge conflict and says why; optional `*` tasks are never run.

## Not done yet

- `/spec` dialog in the TUI and a client UI for approving or commenting on artifacts (the `plan_exit` question is the only review surface today).
- A server route for artifact review, so desktop and VS Code clients can show it.
