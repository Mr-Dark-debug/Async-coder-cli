export * as ConfigAdvisor from "./advisor"

import { Schema } from "effect"
import { ConfigModelID } from "./model-id"

export const Info = Schema.Struct({
  model: ConfigModelID,
  variant: Schema.optional(Schema.String),
})

export type Info = Schema.Schema.Type<typeof Info>
