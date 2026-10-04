#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import os from "node:os"
import { fileURLToPath } from "node:url"

const directory = path.dirname(fileURLToPath(import.meta.url))

function main() {
  // Older installers cached the base binary here, bypassing the wrapper's
  // CPU/libc selection. Remove only that generated file, including symlinks.
  fs.rmSync(path.join(directory, "bin", ".async-coder"), { force: true })
  if (os.platform() === "win32") return

  const prefix = `binary-${os.platform()}-${os.arch()}`
  const directories = [directory]
  while (path.dirname(directories.at(-1)) !== directories.at(-1)) {
    directories.push(path.dirname(directories.at(-1)))
  }

  // Prepare all installed candidates; the wrapper remains the sole owner of
  // AVX2/baseline and glibc/musl selection. Source manifests need not contain
  // the public package's full optional dependency matrix.
  const candidates = directories.flatMap((current) => {
    const scope = path.join(current, "node_modules", "@async-coder")
    if (!fs.existsSync(scope)) return []
    return fs.readdirSync(scope)
      .filter((name) => name === prefix || name.startsWith(`${prefix}-`))
      .map((name) => path.join(scope, name, "bin", "async-coder"))
      .filter((file) => fs.existsSync(file) && fs.statSync(file).isFile())
  })
  if (!candidates.length) throw new Error(`Could not find an installed @async-coder/${prefix} runtime candidate`)
  candidates.forEach((file) => fs.chmodSync(file, 0o755))
}

try {
  main()
} catch (error) {
  console.error("Failed to setup async-coder binary:", error.message)
  process.exit(1)
}
