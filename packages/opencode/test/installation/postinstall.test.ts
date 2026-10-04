import { describe, expect, test } from "bun:test"
import fs from "node:fs/promises"
import path from "node:path"
import { tmpdir } from "../fixture/fixture"

const node = Bun.which("node") ?? process.execPath
const source = path.resolve(import.meta.dir, "../..")

async function stage(directory: string, platform: string, arch: string) {
  const root = path.join(directory, "node_modules", "@async-coder", "cli")
  await fs.mkdir(path.join(root, "bin"), { recursive: true })
  await Promise.all([
    fs.copyFile(path.join(source, "script", "postinstall.mjs"), path.join(root, "postinstall.mjs")),
    fs.copyFile(path.join(source, "bin", "async-coder"), path.join(root, "bin", "async-coder")),
    Bun.write(path.join(root, "package.json"), JSON.stringify({ name: "@async-coder/cli" })),
    // Change OS capability reporting only; the installer uses real filesystem
    // operations and package layouts in a separate Node process.
    Bun.write(path.join(root, "platform.cjs"), `const os = require("node:os"); os.platform = () => ${JSON.stringify(platform)}; os.arch = () => ${JSON.stringify(arch)};`),
  ])
  return root
}

async function runtime(directory: string, name: string) {
  const file = path.join(directory, "node_modules", "@async-coder", name, "bin", "async-coder")
  await Bun.write(file, `fixture runtime ${name}`)
  await fs.chmod(file, 0o444)
  return file
}

async function install(root: string) {
  const child = Bun.spawn([node, "--require", path.join(root, "platform.cjs"), path.join(root, "postinstall.mjs")], { stdout: "pipe", stderr: "pipe" })
  const result = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()])
  return { code: result[0], stdout: result[1], stderr: result[2] }
}

describe("published installer postinstall", () => {
  test("the unchanged wrapper launches a real installed runtime after stale cache removal", async () => {
    await using directory = await tmpdir()
    const root = await stage(directory.path, process.platform, process.arch)
    const platform = process.platform === "win32" ? "windows" : process.platform
    const file = path.join(directory.path, "node_modules", "@async-coder", `binary-${platform}-${process.arch}`, "bin", process.platform === "win32" ? "async-coder.exe" : "async-coder")
    await fs.mkdir(path.dirname(file), { recursive: true })
    // A copy of the host's executable is a genuine runnable binary fixture;
    // it lets the actual wrapper perform lookup and launch on every host OS.
    await fs.copyFile(node, file)
    await Bun.write(path.join(root, "bin", ".async-coder"), "stale invalid executable")
    expect(await install(root)).toMatchObject({ code: 0, stderr: "" })
    const expected = Bun.spawn([node, "--version"], { stdout: "pipe", stderr: "pipe" })
    const child = Bun.spawn([node, path.join(root, "bin", "async-coder"), "--version"], { stdout: "pipe", stderr: "pipe", env: { ...process.env, ASYNC_CODER_BIN_PATH: "" } })
    const result = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text(), new Response(expected.stdout).text(), expected.exited])
    expect(result[0], result[2]).toBe(0)
    expect(result[1].trim()).toBe(result[3].trim())
    expect(await Bun.file(path.join(root, "bin", ".async-coder")).exists()).toBe(false)
  }, 30000)

  test("accepts an installed baseline-musl runtime without the base package and removes stale cache", async () => {
    await using directory = await tmpdir()
    const root = await stage(directory.path, "linux", "x64")
    const file = await runtime(directory.path, "binary-linux-x64-baseline-musl")
    const cached = path.join(root, "bin", ".async-coder")
    await Bun.write(cached, "stale base runtime")
    expect(await install(root)).toMatchObject({ code: 0, stderr: "" })
    expect(await Bun.file(cached).exists()).toBe(false)
    expect(await Bun.file(file).text()).toBe("fixture runtime binary-linux-x64-baseline-musl")
    expect((await fs.stat(file)).mode & 0o200).toBeGreaterThan(0)
    if (process.platform !== "win32") expect((await fs.stat(file)).mode & 0o111).toBe(0o111)
  })

  test("prepares every nested and hoisted matching candidate while preserving unrelated runtimes and wrapper", async () => {
    await using directory = await tmpdir()
    const root = await stage(directory.path, "linux", "x64")
    const files = await Promise.all([
      runtime(root, "binary-linux-x64"),
      runtime(directory.path, "binary-linux-x64-baseline"),
      runtime(directory.path, "binary-linux-x64-musl"),
      runtime(directory.path, "binary-linux-x64-baseline-musl"),
    ])
    const unrelated = await runtime(directory.path, "binary-linux-arm64")
    const before = await fs.stat(unrelated)
    expect(await install(root)).toMatchObject({ code: 0, stderr: "" })
    for (const file of files) {
      expect((await fs.stat(file)).mode & 0o200).toBeGreaterThan(0)
      if (process.platform !== "win32") expect((await fs.stat(file)).mode & 0o111).toBe(0o111)
    }
    expect((await fs.stat(unrelated)).mode).toBe(before.mode)
    expect(await Bun.file(path.join(root, "bin", ".async-coder")).exists()).toBe(false)
    expect(await Bun.file(path.join(root, "bin", "async-coder")).text()).toBe(await Bun.file(path.join(source, "bin", "async-coder")).text())
    await fs.chmod(unrelated, 0o644)
  })

  test("supports the Darwin runtime family without requiring optionalDependencies in the manifest", async () => {
    await using directory = await tmpdir()
    const root = await stage(directory.path, "darwin", "arm64")
    const file = await runtime(directory.path, "binary-darwin-arm64")
    expect(await install(root)).toMatchObject({ code: 0, stderr: "" })
    expect((await fs.stat(file)).mode & 0o200).toBeGreaterThan(0)
    expect(await Bun.file(path.join(root, "bin", ".async-coder")).exists()).toBe(false)
  })

  test("fails clearly when the POSIX runtime family is missing rather than keeping stale cache", async () => {
    await using directory = await tmpdir()
    const root = await stage(directory.path, "linux", "arm64")
    await Bun.write(path.join(root, "bin", ".async-coder"), "stale")
    const result = await install(root)
    expect(result.code).toBe(1)
    expect(result.stderr).toContain("Could not find an installed @async-coder/binary-linux-arm64 runtime candidate")
    expect(await Bun.file(path.join(root, "bin", ".async-coder")).exists()).toBe(false)
  })

  test("removes a stale cache on Windows while leaving the packaged executable unchanged", async () => {
    await using directory = await tmpdir()
    const root = await stage(directory.path, "win32", "x64")
    const file = path.join(directory.path, "node_modules", "@async-coder", "binary-windows-x64", "bin", "async-coder.exe")
    await Bun.write(file, "fixture Windows executable")
    await Bun.write(path.join(root, "bin", ".async-coder"), "stale")
    expect(await install(root)).toMatchObject({ code: 0, stderr: "" })
    expect(await Bun.file(file).text()).toBe("fixture Windows executable")
    expect(await Bun.file(path.join(root, "bin", ".async-coder")).exists()).toBe(false)
  })
})
