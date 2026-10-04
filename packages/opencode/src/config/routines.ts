export * as ConfigRoutines from "./routines"

import { Schema } from "effect"

export const Routine = Schema.Struct({
  cron: Schema.String.annotate({ description: "5-field cron expression in local time, e.g. '0 3 * * *'." }),
  prompt: Schema.String,
  agent: Schema.optional(Schema.String),
  model: Schema.optional(Schema.String).annotate({ description: "provider/model" }),
  budget_usd: Schema.optional(Schema.Number.check(Schema.isGreaterThan(0))),
  worktree: Schema.optional(Schema.Boolean).annotate({ description: "Run each firing in its own worktree. Default true." }),
  verify: Schema.optional(Schema.Array(Schema.String)).annotate({ description: "Gate commands that must pass before a run counts as done." }),
  verify_retries: Schema.optional(Schema.Number.check(Schema.isInt())),
  enabled: Schema.optional(Schema.Boolean),
})
export type Routine = Schema.Schema.Type<typeof Routine>

export const Info = Schema.Record(Schema.String, Routine)
export type Info = Schema.Schema.Type<typeof Info>
