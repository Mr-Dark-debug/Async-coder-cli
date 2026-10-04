export * as ConfigSage from "./sage"

import { Schema } from "effect"

export const Info = Schema.Struct({
  enabled: Schema.optional(Schema.Boolean).annotate({ description: "Run the risk-gated verification pipeline for background jobs." }),
  critique_on: Schema.optional(Schema.Literals(["gate-fail-or-high-risk", "gate-fail", "high-risk", "never"])).annotate({
    description: "When Sage critiques a job's result. Default gate-fail-or-high-risk: green, low-risk jobs never cost an extra model call.",
  }),
  risk_threshold: Schema.optional(Schema.Number.check(Schema.isBetween({ minimum: 0.05, maximum: 1 }))).annotate({
    description: "Risk score (0 to 1) at or above which a change counts as high risk. Default 0.5.",
  }),
  budget_share: Schema.optional(Schema.Number.check(Schema.isBetween({ minimum: 0.05, maximum: 1 }))).annotate({
    description: "Largest share of a job's budget Sage may spend. Default 0.25.",
  }),
})
export type Info = Schema.Schema.Type<typeof Info>
