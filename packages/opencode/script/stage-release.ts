#!/usr/bin/env bun
import fs from "node:fs/promises"
import path from "node:path"
import pkg from "../package.json"

// Stage only: publication stays sequential and requires npm's interactive authorization.
const root = path.resolve(import.meta.dir, "..")
const binaries = await Promise.all(
  Array.from(new Bun.Glob("binary-*/package.json").scanSync({ cwd: path.join(root, "dist") })).map(async (file) =>
    Bun.file(path.join(root, "dist", file)).json(),
  ),
)
if (!binaries.length) throw new Error("Build the runtime packages before staging a release")
if (binaries.some((binary) => binary.version !== pkg.version)) throw new Error("Runtime versions must match the CLI")
const target = path.join(root, "dist", "@async-coder", "cli")
await fs.mkdir(target, { recursive: true })
await fs.cp(path.join(root, "bin"), path.join(target, "bin"), { recursive: true })
await Promise.all([
  fs.copyFile(path.join(root, "script", "postinstall.mjs"), path.join(target, "postinstall.mjs")),
  fs.copyFile(path.join(root, "..", "..", "LICENSE"), path.join(target, "LICENSE")),
  fs.copyFile(path.join(root, "..", "..", "README_npm.md"), path.join(target, "README.md")),
])
await Bun.write(
  path.join(target, "package.json"),
  JSON.stringify(
    {
      name: pkg.name,
      version: pkg.version,
      description: "async-coder: a multi-provider async coding agent",
      license: "MIT",
      author: "async-coder",
      homepage: "https://github.com/Mr-Dark-debug/Async-coder-cli",
      repository: { type: "git", url: "git+https://github.com/Mr-Dark-debug/Async-coder-cli.git" },
      bugs: { url: "https://github.com/Mr-Dark-debug/Async-coder-cli/issues" },
      keywords: ["ai", "cli", "coding-agent", "groq", "openrouter", "lavender"],
      bin: { "async-coder": "./bin/async-coder" },
      scripts: { postinstall: "bun ./postinstall.mjs || node ./postinstall.mjs" },
      optionalDependencies: Object.fromEntries(binaries.map((binary) => [binary.name, binary.version])),
    },
    null,
    2,
  ) + "\n",
)
console.log(`Staged ${pkg.name}@${pkg.version} with ${binaries.length} platform runtimes at ${target}`)
