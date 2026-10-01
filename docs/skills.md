# Reusable skills

Skills contain YAML frontmatter followed by markdown instructions. Place `SKILL.md` in `.async-coder/skills/<name>/` or the user configuration directory's `skills/<name>/`. The singular `skill/` path remains supported. Existing Claude, Codex, OpenCode, and `.agents` skill discovery is preserved and can be disabled using the existing compatibility flags.

```markdown
---
name: api-review
description: Check an API change against its existing consumers.
---

Read the API implementation and its consumers. Identify breaking changes,
check relevant tests, and report concrete failure scenarios with file references.
```

The `/skills` interface lists available skills. The `skill` agent tool loads a selected skill's content and nearby support files, with skill permissions checked against the active agent. Relative paths in a skill resolve against its directory. Additional directories and remote skill catalogs can be configured with `skills.paths` and `skills.urls`.

The bundled workflow collection includes `commit-message`, `code-review`, `write-tests`, `explain-code`, `refactor`, and `debug`, alongside existing compose workflows. Discovered user or project skills with a matching name override bundled skills. Project skills override user configuration skills. `ASYNC_CODER_DISABLE_COMPOSE_SKILLS=true` disables the bundled collection.

Bundled skills require actual diffs, implementation inspection, and meaningful verification. They do not fabricate test results or authorize unrelated public actions.
