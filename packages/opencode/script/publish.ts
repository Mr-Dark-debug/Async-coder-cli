#!/usr/bin/env bun
import { $ } from "bun"
import pkg from "../package.json"
import { Script } from "@async-coder/script"
import { fileURLToPath } from "url"
import fs from "node:fs/promises"
import path from "node:path"

const dir = fileURLToPath(new URL("..", import.meta.url))
process.chdir(dir)

async function published(name: string, version: string) {
  return (await $`npm view ${`${name}@${version}`} version`.quiet().nothrow()).exitCode === 0
}

async function publish(dir: string, name: string, version: string) {
  if (process.platform !== "win32") await $`chmod -R 755 .`.cwd(dir)
  if (await published(name, version)) {
    console.log(`already published ${name}@${version}`)
    return
  }
  for await (const file of new Bun.Glob("*.tgz").scan({ cwd: dir })) {
    await fs.rm(`${dir}/${file}`, { force: true })
  }
  await $`npm pack`.cwd(dir)
  const tgz = Array.from(new Bun.Glob("*.tgz").scanSync({ cwd: dir })).at(0)
  if (!tgz) throw new Error(`No package tarball generated in ${dir}`)
  await $`npm publish ${tgz} --access public --tag ${Script.channel}`.cwd(dir)
}

const binaries: { dir: string; name: string; version: string }[] = []
for (const filepath of new Bun.Glob("*/package.json").scanSync({ cwd: "./dist" })) {
  const normalized = filepath.replaceAll("\\", "/")
  const p = await Bun.file(`./dist/${filepath}`).json()
  binaries.push({
    dir: path.join(dir, "dist", ...normalized.replace("/package.json", "").split("/")),
    name: p.name,
    version: p.version,
  })
}
console.log("binaries", Object.fromEntries(binaries.map((b) => [b.name, b.version])))
const version = binaries[0].version
const packageDir = path.join(dir, "dist", ...pkg.name.split("/"))

await fs.rm(packageDir, { recursive: true, force: true })
await fs.mkdir(packageDir, { recursive: true })
await fs.cp("./bin", `${packageDir}/bin`, { recursive: true })
await fs.copyFile("./script/postinstall.mjs", `${packageDir}/postinstall.mjs`)
await Bun.file(`${packageDir}/LICENSE`).write(await Bun.file("../../LICENSE").text())
await Bun.file(`${packageDir}/README.md`).write(await Bun.file("../../README_npm.md").text())

await Bun.file(`${packageDir}/package.json`).write(
  JSON.stringify(
    {
      name: pkg.name,
      version: version,
      description: "async-coder: a multi-provider async coding agent",
      license: "MIT",
      author: "async-coder",
      homepage: "https://github.com/Mr-Dark-debug/Async-coder-cli",
      repository: {
        type: "git",
        url: "git+https://github.com/Mr-Dark-debug/Async-coder-cli.git",
      },
      bugs: {
        url: "https://github.com/Mr-Dark-debug/Async-coder-cli/issues",
      },
      keywords: ["ai", "cli", "code", "coding-agent", "groq", "openrouter", "lavender"],
      bin: {
        "async-coder": "./bin/async-coder",
      },
      scripts: {
        postinstall: "bun ./postinstall.mjs || node ./postinstall.mjs",
      },
      optionalDependencies: Object.fromEntries(binaries.map((b) => [b.name, b.version])),
    },
    null,
    2,
  ),
)

const tasks = binaries.map(async (b) => {
  await publish(b.dir, b.name, b.version)
})
await Promise.all(tasks)
await publish(packageDir, pkg.name, version)
