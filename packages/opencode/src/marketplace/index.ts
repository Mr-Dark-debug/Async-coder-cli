export * as Marketplace from "./index"

import { createHash, createPublicKey, verify as edVerify, type KeyObject } from "crypto"
import path from "path"
import { mkdir, rename, rm, cp, readdir } from "fs/promises"
import z from "zod"

export const Kind = z.enum(["skill", "agent", "command"])
export type Kind = z.infer<typeof Kind>

const File = z.object({
  path: z.string().min(1),
  url: z.string().url(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
})

export const Entry = z.object({
  name: z.string().regex(/^[a-z0-9][a-z0-9._-]*$/, "names are lowercase letters, digits, dots, dashes and underscores"),
  kind: Kind,
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string(),
  author: z.string().optional(),
  files: z.array(File).min(1),
})
export type Entry = z.infer<typeof Entry>

export const Registry = z.object({
  version: z.literal(1),
  entries: z.array(Entry),
})
export type Registry = z.infer<typeof Registry>

export const Signed = z.object({ registry: Registry, signature: z.string() })

/** Deterministic JSON (sorted keys) so signer and verifier hash identical bytes. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`
  if (value && typeof value === "object")
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`
  return JSON.stringify(value)
}

const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex")

/** A public key given as 64 hex characters (raw 32-byte ed25519) or PEM. */
export function publicKey(input: string): KeyObject {
  if (/^[0-9a-f]{64}$/i.test(input.trim()))
    return createPublicKey({ key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(input.trim(), "hex")]), format: "der", type: "spki" })
  return createPublicKey(input)
}

export class VerificationError extends Error {}

/** Parse a signed registry document and verify its signature. Throws VerificationError on any tampering. */
export function verify(raw: unknown, key: string): Registry {
  const parsed = Signed.safeParse(raw)
  if (!parsed.success) throw new VerificationError(`Registry is malformed: ${parsed.error.issues[0]?.message ?? "invalid"}`)
  const ok = edVerify(null, Buffer.from(canonical(parsed.data.registry)), publicKey(key), Buffer.from(parsed.data.signature, "base64"))
  if (!ok) throw new VerificationError("Registry signature does not match the pinned key; refusing to use it")
  return parsed.data.registry
}

const sha256 = (data: ArrayBuffer | Uint8Array) => createHash("sha256").update(data instanceof Uint8Array ? data : new Uint8Array(data)).digest("hex")

export type Fetch = (url: string) => Promise<{ ok: boolean; status: number; arrayBuffer(): Promise<ArrayBuffer>; json(): Promise<unknown> }>

export async function fetchRegistry(input: { url: string; key: string; fetch?: Fetch }) {
  const get = input.fetch ?? (fetch as unknown as Fetch)
  const res = await get(input.url)
  if (!res.ok) throw new Error(`Registry request failed (${res.status})`)
  return verify(await res.json(), input.key)
}

export function search(registry: Registry, query: string, kind?: Kind) {
  const q = query.trim().toLowerCase()
  return registry.entries.filter(
    (entry) => (!kind || entry.kind === kind) && (!q || entry.name.includes(q) || entry.description.toLowerCase().includes(q)),
  )
}

export type Roots = Record<Kind, string>

/** Where each kind of entry lives under a config directory. */
export const roots = (configDir: string): Roots => ({
  skill: path.join(configDir, "skills"),
  agent: path.join(configDir, "agent"),
  command: path.join(configDir, "command"),
})

const dest = (roots: Roots, entry: Entry) => (entry.kind === "skill" ? path.join(roots.skill, entry.name) : path.join(roots[entry.kind], `${entry.name}.md`))

const safe = (file: string) => !path.isAbsolute(file) && !file.split(/[\\/]/).includes("..")

export type Lock = Record<string, { kind: Kind; version: string }>

const lockFile = (configDir: string) => path.join(configDir, "marketplace.json")

export const readLock = async (configDir: string): Promise<Lock> => Bun.file(lockFile(configDir)).json().catch(() => ({}))

/**
 * Install or update an entry atomically. Files are downloaded to a staging directory and hashed
 * before anything under the real directory changes; the previous version is kept until the swap
 * succeeds and restored if it fails. Installing the same version again is a no-op.
 */
export async function install(input: { entry: Entry; configDir: string; fetch?: Fetch }) {
  const { entry, configDir } = input
  const get = input.fetch ?? (fetch as unknown as Fetch)
  const lock = await readLock(configDir)
  if (lock[entry.name]?.version === entry.version) return { installed: false as const, reason: "already installed" }
  const r = roots(configDir)
  const staging = path.join(configDir, ".market-staging", `${entry.name}-${Date.now()}`)
  await mkdir(staging, { recursive: true })
  try {
    for (const file of entry.files) {
      if (!safe(file.path)) throw new Error(`Refusing unsafe file path in ${entry.name}: ${file.path}`)
      const res = await get(file.url)
      if (!res.ok) throw new Error(`Download failed for ${file.path} (${res.status})`)
      const bytes = new Uint8Array(await res.arrayBuffer())
      if (sha256(bytes) !== file.sha256) throw new Error(`Checksum mismatch for ${file.path}; the download was altered`)
      await Bun.write(path.join(staging, file.path), bytes)
    }
    const target = dest(r, entry)
    const backup = `${target}.previous`
    await mkdir(path.dirname(target), { recursive: true })
    await rm(backup, { recursive: true, force: true })
    const had = await Bun.file(target).exists().catch(() => false) || (await readdir(target).then(() => true).catch(() => false))
    if (had) await rename(target, backup)
    try {
      if (entry.kind === "skill") await cp(staging, target, { recursive: true })
      else await cp(path.join(staging, entry.files[0].path), target)
    } catch (error) {
      await rm(target, { recursive: true, force: true })
      if (had) await rename(backup, target)
      throw error
    }
    await rm(backup, { recursive: true, force: true })
    await Bun.write(lockFile(configDir), JSON.stringify({ ...lock, [entry.name]: { kind: entry.kind, version: entry.version } }, null, 2))
    return { installed: true as const, path: target }
  } finally {
    await rm(staging, { recursive: true, force: true })
  }
}

export async function uninstall(input: { name: string; configDir: string }) {
  const lock = await readLock(input.configDir)
  const found = lock[input.name]
  if (!found) return false
  const r = roots(input.configDir)
  await rm(found.kind === "skill" ? path.join(r.skill, input.name) : path.join(r[found.kind], `${input.name}.md`), { recursive: true, force: true })
  const { [input.name]: _removed, ...rest } = lock
  await Bun.write(lockFile(input.configDir), JSON.stringify(rest, null, 2))
  return true
}

/** Installed entries with a newer version in the registry. */
export async function outdated(input: { registry: Registry; configDir: string }) {
  const lock = await readLock(input.configDir)
  const newer = (a: string, b: string) => {
    const [x, y] = [a, b].map((v) => v.split(".").map(Number))
    for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]
    return false
  }
  return input.registry.entries.filter((entry) => lock[entry.name] && newer(entry.version, lock[entry.name].version))
}

/** Build a registry entry (hashes included) from local files, for `publish`. The author signs the whole registry separately. */
export async function describe(input: { name: string; kind: Kind; version: string; description: string; baseUrl: string; dir: string; files: string[] }): Promise<Entry> {
  return {
    name: input.name,
    kind: input.kind,
    version: input.version,
    description: input.description,
    files: await Promise.all(
      input.files.map(async (file) => ({
        path: file,
        url: `${input.baseUrl.replace(/\/+$/, "")}/${file}`,
        sha256: sha256(new Uint8Array(await Bun.file(path.join(input.dir, file)).arrayBuffer())),
      })),
    ),
  }
}
