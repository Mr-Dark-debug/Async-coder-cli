#!/usr/bin/env bun
import fs from "node:fs/promises"
import path from "node:path"

// Bun 1.3.11 on Windows can fail to extract cross-compilation runtimes.
// Keep checksum-verified official runtimes inside build artifacts, not the user's cache.
const directory = path.resolve(import.meta.dir, "../.artifacts/build-runtimes")
const origin = `https://github.com/oven-sh/bun/releases/download/bun-v${Bun.version}`
const response = await fetch(`${origin}/SHASUMS256.txt`)
if (!response.ok) throw new Error(`Runtime checksums: HTTP ${response.status}`)
const sums = await response.text()
const targets = [
  "linux-aarch64",
  "linux-x64",
  "linux-x64-baseline",
  "linux-aarch64-musl",
  "linux-x64-musl",
  "linux-x64-musl-baseline",
  "darwin-aarch64",
  "darwin-x64",
  "darwin-x64-baseline",
  "windows-aarch64",
  "windows-x64",
  "windows-x64-baseline",
]
await fs.mkdir(directory, { recursive: true })
for (const batch of [targets.slice(0, 4), targets.slice(4, 8), targets.slice(8)]) {
  await Promise.all(
    batch.map(async (target) => {
      const name = `bun-${target}.zip`
      const expected = sums
        .split("\n")
        .find((line) => line.trim().endsWith(name))
        ?.trim()
        .split(/\s+/)[0]
      if (!expected || !/^[a-f0-9]{64}$/i.test(expected)) throw new Error(`Checksum missing for ${name}`)
      const archive = path.join(directory, name)
      const download = Bun.spawn(
        [
          "curl",
          "--fail",
          "--location",
          "--silent",
          "--show-error",
          "--retry",
          "2",
          "--connect-timeout",
          "20",
          "--max-time",
          "180",
          "--output",
          archive,
          `${origin}/${name}`,
        ],
        { stdout: "ignore", stderr: "inherit" },
      )
      if (await download.exited) throw new Error(`Download failed for ${name}`)
      if (new Bun.CryptoHasher("sha256").update(await Bun.file(archive).arrayBuffer()).digest("hex") !== expected) {
        throw new Error(`Checksum mismatch for ${name}`)
      }
      const extraction = Bun.spawn(["tar", "-xf", archive, "-C", directory], { stdout: "ignore", stderr: "inherit" })
      if (await extraction.exited) throw new Error(`Extraction failed for ${name}`)
      console.log(`Verified ${name}`)
    }),
  )
}
console.log(`Set ASYNC_CODER_BUILD_RUNTIME_DIR=${directory} before building`)
