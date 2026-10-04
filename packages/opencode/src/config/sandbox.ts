export * as ConfigSandbox from "./sandbox"

import { Schema } from "effect"

export const Mode = Schema.Literals(["off", "writes", "full"])
export type Mode = Schema.Schema.Type<typeof Mode>

export const Info = Schema.Struct({
  mode: Schema.optional(Mode).annotate({
    description:
      "off: no confinement. writes: shell commands may only write inside the project, temp dirs and writable_paths. full: writes confinement plus no outbound network.",
  }),
  writable_paths: Schema.optional(Schema.Array(Schema.String)).annotate({
    description: "Extra directories shell commands and file tools may write to in writes/full mode.",
  }),
  allowed_hosts: Schema.optional(Schema.Array(Schema.String)).annotate({
    description:
      "Hosts reachable in full mode. macOS enforces IP addresses and localhost only; Linux cannot filter by host, so a non-empty list there is refused rather than silently ignored.",
  }),
})
export type Info = Schema.Schema.Type<typeof Info>
