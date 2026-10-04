import type { Profile } from "./profile"

const quote = (value: string) => `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`

const ip = /^(\d{1,3}(\.\d{1,3}){3}|localhost)(:(\d+|\*))?$/

const withPort = (host: string) => (host.includes(":") ? host : `${host}:*`)

/** Render a Seatbelt (.sb) profile: read anywhere, write only to the profile's roots, network per mode. */
export function render(profile: Profile) {
  const lines = [
    "(version 1)",
    "(deny default)",
    "(allow process*)",
    "(allow signal (target self))",
    "(allow sysctl-read)",
    "(allow mach-lookup)",
    "(allow file-read*)",
    '(allow file-write* (literal "/dev/null") (literal "/dev/tty") (regex #"^/dev/fd/"))',
    ...profile.writable.map((root) => `(allow file-write* (subpath ${quote(root)}))`),
  ]
  if (profile.mode === "full") {
    lines.push(
      ...profile.hosts.filter((host) => ip.test(host)).map((host) => `(allow network-outbound (remote ip ${quote(withPort(host))}))`),
    )
    lines.push('(allow network* (local ip "localhost:*"))')
  } else lines.push("(allow network*)")
  return lines.join("\n")
}

export function argv(profile: Profile, command: string[]) {
  return ["sandbox-exec", "-p", render(profile), ...command]
}
