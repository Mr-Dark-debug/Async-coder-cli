import { describe, expect, test } from "bun:test"
import path from "path"
import { Sandbox } from "../../src/sandbox"

const root = path.resolve("/work/project")
const tmp = path.resolve("/tmp")
const profile = (cfg?: Parameters<typeof Sandbox.build>[0]["cfg"]) => Sandbox.build({ cfg, root, tmp, home: path.resolve("/home/u") })

describe("sandbox profile", () => {
  test("off is the default and allows everything", () => {
    const p = profile()
    expect(p.mode).toBe("off")
    expect(Sandbox.canWrite(p, "/etc/passwd")).toBe(true)
  })

  test("writes mode confines writes to project, tmp and writable_paths", () => {
    const p = profile({ mode: "writes", writable_paths: ["~/cache"] })
    expect(Sandbox.canWrite(p, path.join(root, "src/a.ts"))).toBe(true)
    expect(Sandbox.canWrite(p, path.join(tmp, "x"))).toBe(true)
    expect(Sandbox.canWrite(p, path.resolve("/home/u/cache/y"))).toBe(true)
    expect(Sandbox.canWrite(p, path.resolve("/home/u/.ssh/id"))).toBe(false)
    expect(Sandbox.canWrite(p, path.resolve("/work/project/../other/z"))).toBe(false)
    expect(Sandbox.canWrite(p, path.resolve("/work/project-evil/z"))).toBe(false)
  })

  test("writeDenied explains the block", () => {
    expect(Sandbox.writeDenied(profile({ mode: "writes" }), "/etc/hosts")).toContain("Write blocked by sandbox")
    expect(Sandbox.writeDenied(profile({ mode: "writes" }), path.join(root, "a"))).toBeUndefined()
  })

  test("mode cycles off -> writes -> full -> off", () => {
    expect(Sandbox.next("off")).toBe("writes")
    expect(Sandbox.next("writes")).toBe("full")
    expect(Sandbox.next("full")).toBe("off")
  })
})

describe("sandbox plan", () => {
  const command = ["/bin/sh", "-c", "echo hi"]
  const has = (...found: string[]) => (binary: string) => found.includes(binary)

  test("off or disabled runs directly", () => {
    expect(Sandbox.plan({ profile: profile(), command, platform: "linux" }).type).toBe("direct")
    expect(Sandbox.plan({ profile: profile({ mode: "full" }), command, platform: "linux", disabled: true }).type).toBe("direct")
  })

  test("linux wraps with bwrap and unshares the network only in full mode", () => {
    const writes = Sandbox.plan({ profile: profile({ mode: "writes" }), command, platform: "linux", has: has("bwrap") })
    expect(writes.type).toBe("wrapped")
    if (writes.type !== "wrapped") return
    expect(writes.argv[0]).toBe("bwrap")
    expect(writes.argv).toContain("--ro-bind")
    expect(writes.argv).not.toContain("--unshare-net")
    expect(writes.argv.slice(-3)).toEqual(command)
    expect(writes.argv).toEqual(expect.arrayContaining(["--bind", root, root]))

    const full = Sandbox.plan({ profile: profile({ mode: "full" }), command, platform: "linux", has: has("bwrap") })
    if (full.type !== "wrapped") throw new Error("expected wrapped")
    expect(full.argv).toContain("--unshare-net")
  })

  test("linux refuses an allowed_hosts list it cannot enforce", () => {
    const result = Sandbox.plan({
      profile: profile({ mode: "full", allowed_hosts: ["example.com"] }),
      command,
      platform: "linux",
      has: has("bwrap"),
    })
    expect(result.type).toBe("denied")
  })

  test("confined modes fail closed when no backend exists", () => {
    const missing = Sandbox.plan({ profile: profile({ mode: "writes" }), command, platform: "linux", has: has() })
    expect(missing.type).toBe("denied")
    const windows = Sandbox.plan({ profile: profile({ mode: "writes" }), command, platform: "win32" })
    expect(windows.type).toBe("denied")
    if (windows.type === "denied") expect(windows.reason).toContain("not supported on win32")
  })

  test("macOS wraps with sandbox-exec and a profile", () => {
    const result = Sandbox.plan({ profile: profile({ mode: "writes" }), command, platform: "darwin", has: has("sandbox-exec") })
    if (result.type !== "wrapped") throw new Error("expected wrapped")
    expect(result.argv.slice(0, 2)).toEqual(["sandbox-exec", "-p"])
    expect(result.argv.slice(-3)).toEqual(command)
  })
})

describe("seatbelt profile", () => {
  test("snapshot: writes mode allows network and confines writes", () => {
    expect(Sandbox.seatbeltProfile(profile({ mode: "writes" }))).toBe(
      [
        "(version 1)",
        "(deny default)",
        "(allow process*)",
        "(allow signal (target self))",
        "(allow sysctl-read)",
        "(allow mach-lookup)",
        "(allow file-read*)",
        '(allow file-write* (literal "/dev/null") (literal "/dev/tty") (regex #"^/dev/fd/"))',
        `(allow file-write* (subpath "${root.replaceAll("\\", "\\\\")}"))`,
        `(allow file-write* (subpath "${tmp.replaceAll("\\", "\\\\")}"))`,
        "(allow network*)",
      ].join("\n"),
    )
  })

  test("full mode drops general network and allows only IP/localhost hosts", () => {
    const text = Sandbox.seatbeltProfile(profile({ mode: "full", allowed_hosts: ["10.0.0.5:443", "localhost", "example.com"] }))
    expect(text).not.toContain("(allow network*)")
    expect(text).toContain('(allow network-outbound (remote ip "10.0.0.5:443"))')
    expect(text).toContain('(allow network-outbound (remote ip "localhost:*"))')
    expect(text).not.toContain("example.com")
  })
})

describe.skipIf(process.platform !== "linux" || !Bun.which("bwrap"))("bwrap integration", () => {
  test("writes inside the project succeed and writes outside fail", async () => {
    const dir = (await import("fs")).mkdtempSync(path.join((await import("os")).tmpdir(), "sbx-"))
    const outside = (await import("fs")).mkdtempSync(path.join("/var/tmp", "sbx-out-"))
    const p = Sandbox.build({ cfg: { mode: "writes" }, root: dir, tmp: dir })
    const run = (target: string) => {
      const plan = Sandbox.plan({ profile: p, command: ["/bin/sh", "-c", `echo x > ${target}/f`] })
      if (plan.type !== "wrapped") throw new Error("expected wrapped")
      return Bun.spawnSync(plan.argv)
    }
    expect(run(dir).exitCode).toBe(0)
    expect(run(outside).exitCode).not.toBe(0)
  })
})
