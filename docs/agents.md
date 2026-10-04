# Agents and subagents

Primary modes retain build, plan, and compose. Build performs the requested work under configured permissions; plan restricts edit tools; compose loads reusable workflow skills. Lavender async-coder styling is preserved.

The existing actor system runs subagents with independent conversation state, supports concurrent work, messaging, follow-up work, cancellation, and returned results. Use the available actor tools and agent mentions in the interface. Existing general and explore agents remain supported.

Version 0.2.0 adds these specialized subagents:

| Agent | Purpose |
| --- | --- |
| `review` | Inspect changes for actionable defects; edit tools are disabled by default. |
| `test-writer` | Use the repository's test framework, write behavior tests, and verify results. |
| `docs` | Update documentation from the actual implementation and verified behavior. |

User permissions and named agent configuration remain authoritative. General subagents cannot modify the parent's todo list by default. All specialized agents support the existing custom model, prompt, permission, and step configuration.

Custom agents are markdown files under `.async-coder/agents/` or the user configuration directory's `agents/`. The singular `agent/` path remains compatible. For example:

```markdown
---
description: Review API compatibility
mode: subagent
permission:
  edit: deny
---
Inspect API consumers and identify concrete compatibility regressions.
```

You can also configure agents through the `agent` map in `async-coder.json`. Instructions from `AGENTS.md` and loaded skills apply to agent work; each agent still reports its actual test and tool outcomes.
