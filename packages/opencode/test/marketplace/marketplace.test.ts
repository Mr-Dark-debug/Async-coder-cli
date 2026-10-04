import { describe, expect, test } from "bun:test"
import { createHash, generateKeyPairSync, sign } from "crypto"
import { mkdtempSync } from "fs"
import { tmpdir } from "os"
import path from "path"
import { Marketplace as M } from "../../src/marketplace"

const keys = generateKeyPairSync("ed25519")
const rawPublic = (keys.publicKey.export({ format: "der", type: "spki" }) as Buffer).subarray(-32).toString("hex")

const body = (text: string) => new TextEncoder().encode(text)
const sha = (text: string) => createHash("sha256").update(body(text)).digest("hex")

const entry = (over: Partial<M.Entry> = {}): M.Entry => ({
  name: "lint-fixer",
  kind: "skill",
  version: "1.0.0",
  description: "Fix lint errors automatically",
  files: [{ path: "SKILL.md", url: "https://reg.test/lint-fixer/SKILL.md", sha256: sha("# v1") }],
  ...over,
})

const sign_ = (registry: M.Registry, signer = keys.privateKey) => ({
  registry,
  signature: sign(null, Buffer.from(M.canonical(registry)), signer).toString("base64"),
})

const files = (map: Record<string, string>): M.Fetch =>
  (async (url: string) => {
    const text = map[url]
    return {
      ok: text !== undefined,
      status: text === undefined ? 404 : 200,
      arrayBuffer: async () => body(text ?? "").buffer as ArrayBuffer,
      json: async () => JSON.parse(text ?? "null"),
    }
  }) as M.Fetch

const dir = () => mkdtempSync(path.join(tmpdir(), "market-"))

describe("registry verification", () => {
  const registry: M.Registry = { version: 1, entries: [entry()] }

  test("a correctly signed registry verifies (raw hex key)", () => {
    expect(M.verify(sign_(registry), rawPublic)).toEqual(registry)
  })

  test("key order does not change the signature", () => {
    const reordered = JSON.parse(JSON.stringify({ entries: registry.entries, version: 1 }))
    expect(M.canonical(reordered)).toBe(M.canonical(registry))
  })

  test("a tampered registry fails with a clear error", () => {
    const signed = sign_(registry)
    const tampered = { ...signed, registry: { ...registry, entries: [entry({ version: "9.9.9" })] } }
    expect(() => M.verify(tampered, rawPublic)).toThrow("signature does not match")
  })

  test("a registry signed by a different key is refused", () => {
    const other = generateKeyPairSync("ed25519")
    expect(() => M.verify(sign_(registry, other.privateKey), rawPublic)).toThrow(M.VerificationError)
  })

  test("malformed documents are refused", () => {
    expect(() => M.verify({ nope: true }, rawPublic)).toThrow("malformed")
    expect(() => M.verify(sign_({ version: 1, entries: [entry({ name: "Bad Name" })] }), rawPublic)).toThrow("malformed")
  })

  test("fetchRegistry verifies what it downloads", async () => {
    const good = await M.fetchRegistry({ url: "https://reg.test/index.json", key: rawPublic, fetch: files({ "https://reg.test/index.json": JSON.stringify(sign_(registry)) }) })
    expect(good.entries).toHaveLength(1)
    await expect(M.fetchRegistry({ url: "https://reg.test/x", key: rawPublic, fetch: files({}) })).rejects.toThrow("404")
  })

  test("search by name, description and kind", () => {
    const reg: M.Registry = { version: 1, entries: [entry(), entry({ name: "api-agent", kind: "agent", description: "Designs REST APIs" })] }
    expect(M.search(reg, "lint").map((e) => e.name)).toEqual(["lint-fixer"])
    expect(M.search(reg, "rest").map((e) => e.name)).toEqual(["api-agent"])
    expect(M.search(reg, "", "agent").map((e) => e.name)).toEqual(["api-agent"])
  })
})

describe("install, update, rollback", () => {
  test("installing a skill writes its files and records the version; reinstall is a no-op", async () => {
    const config = dir()
    const fetcher = files({ "https://reg.test/lint-fixer/SKILL.md": "# v1" })
    const result = await M.install({ entry: entry(), configDir: config, fetch: fetcher })
    expect(result.installed).toBe(true)
    expect(await Bun.file(path.join(config, "skills", "lint-fixer", "SKILL.md")).text()).toBe("# v1")
    expect(await M.readLock(config)).toEqual({ "lint-fixer": { kind: "skill", version: "1.0.0" } })
    expect(await M.install({ entry: entry(), configDir: config, fetch: fetcher })).toEqual({ installed: false, reason: "already installed" })
  })

  test("a checksum mismatch aborts before touching the installed copy", async () => {
    const config = dir()
    await M.install({ entry: entry(), configDir: config, fetch: files({ "https://reg.test/lint-fixer/SKILL.md": "# v1" }) })
    const bad = entry({ version: "1.1.0", files: [{ path: "SKILL.md", url: "https://reg.test/lint-fixer/SKILL.md", sha256: sha("# v2") }] })
    await expect(M.install({ entry: bad, configDir: config, fetch: files({ "https://reg.test/lint-fixer/SKILL.md": "# EVIL" }) })).rejects.toThrow("Checksum mismatch")
    expect(await Bun.file(path.join(config, "skills", "lint-fixer", "SKILL.md")).text()).toBe("# v1")
    expect((await M.readLock(config))["lint-fixer"].version).toBe("1.0.0")
  })

  test("an update replaces the files atomically and is reported by outdated()", async () => {
    const config = dir()
    await M.install({ entry: entry(), configDir: config, fetch: files({ "https://reg.test/lint-fixer/SKILL.md": "# v1" }) })
    const next = entry({ version: "1.2.0", files: [{ path: "SKILL.md", url: "https://reg.test/v2/SKILL.md", sha256: sha("# v2") }] })
    expect((await M.outdated({ registry: { version: 1, entries: [next] }, configDir: config })).map((e) => e.version)).toEqual(["1.2.0"])
    await M.install({ entry: next, configDir: config, fetch: files({ "https://reg.test/v2/SKILL.md": "# v2" }) })
    expect(await Bun.file(path.join(config, "skills", "lint-fixer", "SKILL.md")).text()).toBe("# v2")
    expect(await M.outdated({ registry: { version: 1, entries: [next] }, configDir: config })).toEqual([])
    expect(await Bun.file(path.join(config, "skills", "lint-fixer.previous", "SKILL.md")).exists()).toBe(false)
  })

  test("agents and commands install as single markdown files", async () => {
    const config = dir()
    const agent = entry({ name: "api-agent", kind: "agent", files: [{ path: "agent.md", url: "https://reg.test/a.md", sha256: sha("---\nmode: subagent\n---\nhi") }] })
    await M.install({ entry: agent, configDir: config, fetch: files({ "https://reg.test/a.md": "---\nmode: subagent\n---\nhi" }) })
    expect(await Bun.file(path.join(config, "agent", "api-agent.md")).exists()).toBe(true)
  })

  test("path traversal in a manifest is refused", async () => {
    const config = dir()
    const evil = entry({ files: [{ path: "../../escape.md", url: "https://reg.test/e", sha256: sha("x") }] })
    await expect(M.install({ entry: evil, configDir: config, fetch: files({ "https://reg.test/e": "x" }) })).rejects.toThrow("unsafe")
  })

  test("uninstall removes the files and the lock entry", async () => {
    const config = dir()
    await M.install({ entry: entry(), configDir: config, fetch: files({ "https://reg.test/lint-fixer/SKILL.md": "# v1" }) })
    expect(await M.uninstall({ name: "lint-fixer", configDir: config })).toBe(true)
    expect(await Bun.file(path.join(config, "skills", "lint-fixer", "SKILL.md")).exists()).toBe(false)
    expect(await M.readLock(config)).toEqual({})
    expect(await M.uninstall({ name: "lint-fixer", configDir: config })).toBe(false)
  })

  test("describe hashes local files for publishing", async () => {
    const src = dir()
    await Bun.write(path.join(src, "SKILL.md"), "# mine")
    const described = await M.describe({ name: "mine", kind: "skill", version: "0.1.0", description: "d", baseUrl: "https://x.test/mine/", dir: src, files: ["SKILL.md"] })
    expect(described.files[0]).toEqual({ path: "SKILL.md", url: "https://x.test/mine/SKILL.md", sha256: sha("# mine") })
    expect(M.Entry.safeParse(described).success).toBe(true)
  })
})
