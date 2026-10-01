export * as ConfigHooks from "./hooks"

import { Schema } from "effect"

export const Events = [
  "pre_tool_use", "post_tool_use", "pre_file_edit", "post_file_edit", "pre_command", "post_command",
  "session_start", "session_end", "message_sent", "message_received", "agent_start", "agent_end", "error",
] as const

export const Info = Schema.Struct({
  id: Schema.optional(Schema.String),
  event: Schema.Literals(Events),
  command: Schema.String.check(Schema.isMinLength(1)),
  timeout: Schema.optional(Schema.Number.check(Schema.isGreaterThan(0))),
  condition: Schema.optional(Schema.String).annotate({
    description: "Optional tool-name condition, for example tool === 'bash'. No JavaScript is evaluated.",
  }),
})
export type Info = Schema.Schema.Type<typeof Info>
