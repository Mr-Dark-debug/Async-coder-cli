import type { Profile } from "./profile"

/** bubblewrap argv: read-only root, writable binds for the profile roots, network unshared in full mode. */
export function argv(profile: Profile, command: string[]) {
  return [
    "bwrap",
    "--ro-bind",
    "/",
    "/",
    "--dev",
    "/dev",
    "--proc",
    "/proc",
    ...profile.writable.flatMap((root) => ["--bind", root, root]),
    "--die-with-parent",
    "--unshare-pid",
    ...(profile.mode === "full" ? ["--unshare-net"] : []),
    "--",
    ...command,
  ]
}
