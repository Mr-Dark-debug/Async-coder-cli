#!/usr/bin/env bun
import { $ } from "bun"
import fs from "node:fs/promises"
import path from "node:path"
import pkg from "../package.json"
import "./stage-release"

const root = path.resolve(import.meta.dir, "..")
const output = path.join(root, ".artifacts", "release", pkg.version)
await fs.mkdir(output, { recursive: true })
const directories = Array.from(new Bun.Glob("binary-*/package.json").scanSync({ cwd: path.join(root, "dist") }))
  .map((file) => path.dirname(file))
  .sort()
const artifacts: string[] = []
for (const batch of Array.from({ length: Math.ceil((directories.length + 1) / 3) }, (_, index) =>
  [...directories, "@async-coder/cli"].slice(index * 3, index * 3 + 3),
)) {
  artifacts.push(
    ...(await Promise.all(
      batch.map(async (directory) => {
        const manifest: { name: string; version: string; bin: Record<string, string> } = await Bun.file(
          path.join(root, "dist", directory, "package.json"),
        ).json()
        if (manifest.version !== pkg.version) throw new Error(`Version mismatch: ${manifest.name}`)
        if (!(await Bun.file(path.join(root, "dist", directory, manifest.bin["async-coder"])).exists()))
          throw new Error(`Executable missing: ${manifest.name}`)
        const packed: { filename: string; files: { path: string }[] }[] = JSON.parse(
          await $`npm pack --json --pack-destination ${output}`
            .cwd(path.join(root, "dist", directory))
            .quiet()
            .text(),
        )
        if (!packed[0]?.files.some((file) => file.path === manifest.bin["async-coder"].replace(/^\.\//, "")))
          throw new Error(`Packed executable missing: ${manifest.name}`)
        console.log(`Packed ${manifest.name}@${manifest.version}`)
        return packed[0].filename
      }),
    )),
  )
}
await Bun.write(
  path.join(output, "SHA256SUMS.txt"),
  (
    await artifacts
      .sort()
      .reduce(
        async (result, file) => [
          ...(await result),
          `${new Bun.CryptoHasher("sha256").update(await Bun.file(path.join(output, file)).arrayBuffer()).digest("hex")}  ${file}`,
        ],
        Promise.resolve([] as string[]),
      )
  ).join("\n") + "\n",
)
console.log(`Verified ${artifacts.length} tarballs: ${output}`)
