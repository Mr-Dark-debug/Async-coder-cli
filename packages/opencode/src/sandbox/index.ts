export * as Sandbox from "./index"

import * as Bwrap from "./bwrap"
import * as Seatbelt from "./seatbelt"
import { canWrite, type Profile } from "./profile"
export { build, canWrite, next, type Profile } from "./profile"
export { render as seatbeltProfile } from "./seatbelt"

export type Plan =
  | { type: "direct" }
  | { type: "wrapped"; backend: "seatbelt" | "bwrap"; argv: string[] }
  | { type: "denied"; reason: string }

/**
 * Decide how a shell command must be launched under a profile. `command` is the full argv
 * (for example ["/bin/bash", "-c", "ls"]). Confined modes fail closed: when no backend is
 * available the command is denied rather than run unsandboxed.
 */
export function plan(input: {
  profile: Profile
  command: string[]
  platform?: NodeJS.Platform
  has?: (binary: string) => boolean
  disabled?: boolean
}): Plan {
  if (input.disabled || input.profile.mode === "off") return { type: "direct" }
  const platform = input.platform ?? process.platform
  const has = input.has ?? ((binary) => Bun.which(binary) !== null)

  if (platform === "darwin") {
    if (!has("sandbox-exec")) return { type: "denied", reason: "sandbox-exec is not available; set sandbox.mode to off to run unconfined." }
    return { type: "wrapped", backend: "seatbelt", argv: Seatbelt.argv(input.profile, input.command) }
  }
  if (platform === "linux") {
    if (!has("bwrap"))
      return { type: "denied", reason: "bubblewrap (bwrap) is not installed; install it or set sandbox.mode to off." }
    if (input.profile.mode === "full" && input.profile.hosts.length > 0)
      return {
        type: "denied",
        reason: "sandbox.allowed_hosts cannot be enforced on Linux (bwrap blocks the network as a whole). Remove allowed_hosts or use mode writes.",
      }
    return { type: "wrapped", backend: "bwrap", argv: Bwrap.argv(input.profile, input.command) }
  }
  return {
    type: "denied",
    reason: `Sandboxing is not supported on ${platform}; set sandbox.mode to off to run unconfined.`,
  }
}

/** Error text for a file-write tool that targets a path outside the profile, or undefined when allowed. */
export function writeDenied(profile: Profile, target: string) {
  if (canWrite(profile, target)) return undefined
  return `Write blocked by sandbox (mode ${profile.mode}): ${target} is outside the project and sandbox.writable_paths.`
}
