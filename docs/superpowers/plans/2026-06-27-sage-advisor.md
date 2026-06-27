# Sage Advisor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a user-configured Sage advisor that the working model can call proactively through `consult` and users can force through `/consult`.

**Architecture:** A typed `advisor` config selects model and variant. A hidden tool-free advisor agent runs through the existing actor runtime behind a dedicated `consult` tool, while TUI and desktop first-use wizards persist configuration without changing the working model.

**Tech Stack:** TypeScript, Effect, Zod/Effect Schema, SolidJS, OpenTUI, Bun test, generated JavaScript SDK

---

### Task 1: Add typed advisor configuration

**Files:**
- Create: `packages/opencode/src/config/advisor.ts`
- Modify: `packages/opencode/src/config/config.ts`
- Modify: `packages/opencode/src/config/index.ts`
- Test: `packages/opencode/test/config/advisor.test.ts`

- [ ] **Step 1: Write schema tests**

Test that `{ advisor: { model: "anthropic/claude", variant: "high" } }` parses, that `variant` may be omitted, and that an advisor without `model` fails.

- [ ] **Step 2: Run the test and confirm failure**

Run from `packages/opencode`: `bun test test/config/advisor.test.ts`

Expected: FAIL because `ConfigAdvisor` and `advisor` do not exist.

- [ ] **Step 3: Implement the self-exporting config module**

```ts
export * as ConfigAdvisor from "./advisor"

import { Schema } from "effect"
import { ConfigModelID } from "./model-id"

export const Info = Schema.Struct({
  model: ConfigModelID,
  variant: Schema.optional(Schema.String),
})
export type Info = Schema.Schema.Type<typeof Info>
```

Add `advisor: Schema.optional(ConfigAdvisor.Info)` to `InfoSchema` and export the module from `config/index.ts`.

- [ ] **Step 4: Verify config tests**

Run: `bun test test/config/advisor.test.ts`

Expected: PASS.

### Task 2: Register the hidden advisor and consultation command

**Files:**
- Create: `packages/opencode/src/agent/prompt/advisor.txt`
- Modify: `packages/opencode/src/agent/agent.ts`
- Modify: `packages/opencode/src/command/index.ts`
- Create: `packages/opencode/test/command/consult-command.test.ts`
- Modify: `packages/opencode/test/agent/agent.test.ts`

- [ ] **Step 1: Write failing command and agent tests**

Assert `Command.Default.CONSULT === "consult"`, its template contains `$ARGUMENTS` and requires one `consult` call, and a configured advisor becomes a hidden native subagent with `toolAllowlist: []`, configured model, and variant.

- [ ] **Step 2: Run tests to verify failure**

Run: `bun test test/command/consult-command.test.ts test/agent/agent.test.ts`

- [ ] **Step 3: Add the built-in command template**

```ts
export function consultTemplate() {
  return [
    "Use the consult tool exactly once before answering or continuing the task.",
    "Question from the user (empty means choose the most consequential unresolved uncertainty):",
    "$ARGUMENTS",
    "Provide concise relevant context, evaluate the returned advice, and retain responsibility for the final decision.",
  ].join("\n\n")
}
```

Register it unconditionally in `Command.layer` so autocomplete always receives it.

- [ ] **Step 4: Add the hidden advisor agent**

When `cfg.advisor` exists, register `advisor` with its parsed model, saved variant, `steps: 1`, hidden native subagent mode, denied permissions, the advisor prompt, and an empty allowlist.

- [ ] **Step 5: Verify tests pass**

Run: `bun test test/command/consult-command.test.ts test/agent/agent.test.ts`

### Task 3: Implement the bounded `consult` tool

**Files:**
- Create: `packages/opencode/src/tool/consult.ts`
- Create: `packages/opencode/src/tool/consult.txt`
- Modify: `packages/opencode/src/tool/registry.ts`
- Create: `packages/opencode/test/tool/consult.test.ts`

- [ ] **Step 1: Write failing tool tests**

Cover the 2,000/12,000 character limits, missing configuration, structured result rendering, duplicate calls for one message, and presence in the registry only with advisor configuration.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `bun test test/tool/consult.test.ts test/tool/registry.test.ts`

- [ ] **Step 3: Implement the tool schema and execution**

Use a strict Zod object with `question` and `context`. Resolve `cfg.advisor.model`, validate the saved variant against `model.variants`, spawn the hidden advisor with `context: "none"`, `tools: []`, `background: false`, and this JSON schema:

```ts
const result = z.object({
  recommendation: z.string(),
  reasoning: z.array(z.string()),
  risks: z.array(z.string()),
  alternatives: z.array(z.string()),
})
```

Track the last message per session before spawning to reject concurrent/duplicate calls. Propagate parent interruption and cancel the actor on interruption or five-minute timeout. Return the validated object as JSON tool output.

- [ ] **Step 4: Register and conditionally expose the tool**

Initialize `ConsultTool` in `ToolRegistry`, include it in built-ins, and filter it out of `tools()` when `cfg.advisor` is absent. The advisor's empty allowlist prevents recursion.

- [ ] **Step 5: Run tool tests**

Run: `bun test test/tool/consult.test.ts test/tool/registry.test.ts`

Expected: PASS.

### Task 4: Teach working models about Sage

**Files:**
- Modify: `packages/opencode/src/session/llm.ts`
- Modify: `packages/opencode/test/session/llm-system-prompt.test.ts`

- [ ] **Step 1: Write conditional prompt tests**

Assert the generated system prompt mentions `consult` for configured non-advisor agents and omits the instruction when configuration is absent or the current agent is `advisor`.

- [ ] **Step 2: Implement one central generated instruction**

Append a compact instruction in `buildSystemArray` after reading config: consult only for material uncertainty, minimize context, exclude secrets, verify advice, and keep final responsibility.

- [ ] **Step 3: Run prompt tests**

Run: `bun test test/session/llm-system-prompt.test.ts`

### Task 5: Add the TUI Sage setup wizard

**Files:**
- Create: `packages/opencode/src/cli/cmd/tui/component/dialog-advisor-setup.tsx`
- Modify: `packages/opencode/src/cli/cmd/tui/component/dialog-model.tsx`
- Modify: `packages/opencode/src/cli/cmd/tui/component/dialog-variant.tsx`
- Modify: `packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx`
- Modify: `packages/opencode/src/cli/cmd/tui/app.tsx`
- Create: `packages/opencode/test/cli/cmd/tui/advisor-setup.test.ts`

- [ ] **Step 1: Extract and test the setup decision/state helpers**

Test `needsAdvisorSetup(command, config)`, connected provider filtering, non-deprecated model filtering, variant options with `Default`, and the immutable config patch.

- [ ] **Step 2: Build the wizard from existing `DialogSelect` primitives**

The wizard selects provider, model, then advertised variant without calling `local.model.set`. Persist through `global.config.update`, dispose/bootstrap the instance, close, and invoke an `onConfigured` callback.

- [ ] **Step 3: Intercept first `/consult` and resume once**

Before model/session validation, detect the `consult` server command and missing `sync.data.config.advisor?.model`. Preserve the editor text, show the wizard, and use a boolean resume guard before calling `submit()` after success.

- [ ] **Step 4: Register `/sage-model`**

Add a client command that opens the same wizard without submitting a consultation.

- [ ] **Step 5: Run TUI tests and type checking**

Run from `packages/opencode`:

```bash
bun test test/cli/cmd/tui/advisor-setup.test.ts
bun typecheck
```

### Task 6: Add the desktop Sage setup wizard

**Files:**
- Create: `packages/app/src/components/dialog-advisor-setup.tsx`
- Create: `packages/app/src/components/dialog-advisor-setup.test.ts`
- Modify: `packages/app/src/components/prompt-input/submit.ts`
- Modify: `packages/app/src/components/prompt-input/submit.test.ts`
- Modify: `packages/app/src/pages/session/use-session-commands.tsx`

- [ ] **Step 1: Test the pure desktop setup state**

Cover connected providers, provider-scoped models, default/advertised variants, config patch output, cancellation, and preservation of the working model state.

- [ ] **Step 2: Implement the native desktop wizard**

Compose `Dialog`, `List`, `ProviderIcon`, existing typography/spacing, and `useGlobalSync().updateConfig`. Keep advisor selection in local signals; never call the active-model setters.

- [ ] **Step 3: Intercept first-use submission**

Add a `beforeCommand` hook to prompt submission. When `/consult` lacks advisor configuration, keep the draft intact, open the wizard, and resume once after persistence.

- [ ] **Step 4: Add the Sage model command**

Register a desktop command named `sage.model` that opens the same wizard.

- [ ] **Step 5: Run desktop tests and type checking**

Run from `packages/app`:

```bash
bun test src/components/dialog-advisor-setup.test.ts src/components/prompt-input/submit.test.ts
bun typecheck
```

### Task 7: Regenerate SDK, localize, and verify end to end

**Files:**
- Modify generated files under: `packages/sdk/js/src`
- Modify: `packages/opencode/src/cli/cmd/tui/i18n/en.ts`
- Modify: `packages/app/src/i18n/en.ts`
- Modify: `packages/web/src/content/docs/config.mdx`
- Modify: `packages/web/src/content/docs/agents.mdx`

- [ ] **Step 1: Add English labels and descriptions**

Add strings for Sage setup titles, provider privacy note, model and reasoning steps, Default, setup errors, `/consult`, and reconfiguration.

- [ ] **Step 2: Regenerate the JavaScript SDK**

Run from repository root: `./packages/sdk/js/script/build.ts`

- [ ] **Step 3: Run package verification**

Run from `packages/opencode`:

```bash
bun test test/config/advisor.test.ts test/command/consult-command.test.ts test/tool/consult.test.ts test/session/llm-system-prompt.test.ts test/cli/cmd/tui/advisor-setup.test.ts
bun typecheck
```

Run from `packages/app`:

```bash
bun test src/components/dialog-advisor-setup.test.ts src/components/prompt-input/submit.test.ts
bun typecheck
```

- [ ] **Step 4: Inspect generated and source diffs**

Run: `git diff --check` and confirm no secrets, unrelated formatting, active-model mutation, or publication changes.

- [ ] **Step 5: Commit the verified feature without pushing**

```bash
git add packages/opencode packages/app packages/sdk/js packages/web/src/content/docs
git commit -m "feat: add Sage model consultation"
```
