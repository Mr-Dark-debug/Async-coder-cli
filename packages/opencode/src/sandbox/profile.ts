import path from "path"
import os from "os"
import type { ConfigSandbox } from "@/config/sandbox"

export type Profile = {
  mode: ConfigSandbox.Mode
  /** Absolute directories that may be written to. */
  writable: string[]
  hosts: string[]
}

const norm = (value: string) => path.resolve(value)

/** Build a profile from config. The project root and the OS temp dir are always writable in confined modes. */
export function build(input: { cfg: ConfigSandbox.Info | undefined; root: string; tmp?: string; home?: string }): Profile {
  const mode = input.cfg?.mode ?? "off"
  const home = input.home ?? os.homedir()
  const extra = (input.cfg?.writable_paths ?? []).map((item) =>
    item.startsWith("~") ? path.join(home, item.slice(1)) : item,
  )
  return {
    mode,
    writable: [...new Set([input.root, input.tmp ?? os.tmpdir(), ...extra].map(norm))],
    hosts: [...(input.cfg?.allowed_hosts ?? [])],
  }
}

const inside = (root: string, target: string) => {
  const rel = path.relative(root, target)
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel))
}

/** True when a write to `target` is permitted by the profile. */
export function canWrite(profile: Profile, target: string) {
  if (profile.mode === "off") return true
  const resolved = norm(target)
  return profile.writable.some((root) => inside(root, resolved))
}

export function next(mode: ConfigSandbox.Mode): ConfigSandbox.Mode {
  return mode === "off" ? "writes" : mode === "writes" ? "full" : "off"
}
