# Background Command Fix Design

## Problem

`/background` is a client-only TUI command, but prompt submission resolves client commands only after it validates the active model, creates a session, and schedules navigation to that session. On the home route the background picker is therefore either blocked by the missing-model guard or opened briefly and then unmounted by the delayed session navigation. The same ordering defect affects other client-only slash commands.

## Desired behavior

- Client-only slash commands execute without an active model.
- Running one from the home route does not create a session, append prompt history, clear unrelated state, or navigate.
- `/background` opens `DialogImageList` and remains open until the user confirms or dismisses it.
- Server-backed commands and ordinary prompts keep their current session-creation behavior.
- Shell mode continues to require a model and session.

## Design

Prompt submission will classify the trimmed input before the active-agent/model and session-creation gates. When the input exactly matches a registered client slash command, submission will invoke that command, clear the submitted command text, and return immediately.

The early-return path must not:

- call `session.create`;
- schedule `route.navigate`;
- append the command to chat prompt history;
- send a server command or model prompt;
- run the free-model agreement gate.

Client commands remain exact, argument-free matches. Server commands such as `/consult question` continue through the server-command path and retain argument parsing.

## Testing

Add focused prompt-submission tests proving that:

1. `/background` executes when no model is selected.
2. `/background` does not create a session on the home route.
3. `/background` does not navigate after execution.
4. `/background` does not reach `session.command` or `promptAsync`.
5. An unknown slash command and a normal prompt retain existing behavior.
6. A server-backed slash command still creates or uses a session and preserves arguments.

Run tests and type checking from `packages/opencode`, never from the repository root.
