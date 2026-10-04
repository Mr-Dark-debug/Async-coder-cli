export * as ConfigUsage from "./usage"

import { Schema } from "effect"

const Usd = Schema.Number.check(Schema.isGreaterThan(0))

export const Budget = Schema.Struct({
  per_session_usd: Schema.optional(Usd).annotate({ description: "Spend cap for one session, subagents included." }),
  per_agent_usd: Schema.optional(Usd).annotate({ description: "Spend cap for a single agent (main or subagent) within a session." }),
  daily_usd: Schema.optional(Usd).annotate({ description: "Spend cap across all sessions since local midnight." }),
  monthly_usd: Schema.optional(Usd).annotate({ description: "Spend cap across all sessions since the first of the month." }),
  default_action: Schema.optional(Schema.Literals(["warn", "downgrade", "stop"])).annotate({
    description: "What happens when a cap is reached: warn keeps going, downgrade continues on the lite model tier, stop ends the turn. Default stop.",
  }),
  warn_at: Schema.optional(Schema.Number.check(Schema.isBetween({ minimum: 0.1, maximum: 1 }))).annotate({
    description: "Fraction of a cap at which a warning is raised. Default 0.8.",
  }),
})
export type Budget = Schema.Schema.Type<typeof Budget>

export const Info = Schema.Struct({
  budget: Schema.optional(Budget),
})
export type Info = Schema.Schema.Type<typeof Info>
