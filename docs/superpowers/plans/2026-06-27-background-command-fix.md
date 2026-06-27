# Background Command Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute `/background` and every exact client-only slash command before model validation or session creation.

**Architecture:** Extract exact client-slash matching into the beginning of TUI prompt submission. A matched client command executes and returns without entering any model, session, history, or navigation path.

**Tech Stack:** TypeScript, SolidJS/OpenTUI, Bun test

---

### Task 1: Reproduce the dispatch-order regression

**Files:**
- Create: `packages/opencode/test/cli/cmd/tui/client-slash.test.ts`
- Modify: `packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx`

- [ ] **Step 1: Extract a pure exact-match helper and write failing tests for early classification**

```ts
export function findClientSlash(input: string, slashes: { display: string; onSelect?: () => void }[]) {
  if (!input.startsWith("/")) return
  return slashes.find((slash) => slash.display === input.trim())
}
```

Test exact `/background`, whitespace trimming, argument rejection, and ordinary prompts with `bun test test/cli/cmd/tui/client-slash.test.ts` from `packages/opencode`.

- [ ] **Step 2: Verify the new test fails before the helper exists**

Run: `bun test test/cli/cmd/tui/client-slash.test.ts`

Expected: FAIL because `findClientSlash` is not exported.

- [ ] **Step 3: Move client-command execution ahead of model and session gates**

At the start of `submit()`, after synchronizing editor text and handling exit aliases, resolve `findClientSlash(store.prompt.input, command.slashes())`. Invoke the match, clear the prompt/editor, and return `true`. Remove the later `clientSlash` branch.

- [ ] **Step 4: Run focused tests and type checking**

Run from `packages/opencode`:

```bash
bun test test/cli/cmd/tui/client-slash.test.ts
bun typecheck
```

Expected: PASS and no type errors.

- [ ] **Step 5: Commit the isolated fix**

```bash
git add packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx packages/opencode/test/cli/cmd/tui/client-slash.test.ts
git commit -m "fix(tui): dispatch local slash commands before sessions"
```
