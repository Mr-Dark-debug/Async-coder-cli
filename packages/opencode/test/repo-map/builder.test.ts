import { describe, expect, test } from "bun:test"
import path from "path"
import { tmpdir } from "../fixture/fixture"
import { build } from "../../src/repo-map/builder"
import { parse } from "../../src/repo-map/parser"
import { format, findSymbols, dependencies } from "../../src/repo-map/formatter"

describe("tree-sitter repository map", () => {
  test("extracts definitions in all supported languages without function bodies", async () => {
    const fixtures = [
      ["index.ts", "export function greet(name: string): string { return 'secret body' }", "greet"],
      ["component.tsx", "export const View = () => { return <div>private body</div> }", "View"],
      ["index.js", "export function start() { return 'private body' }", "start"],
      ["main.py", "def greet(name: str):\n    return 'private body'\n", "greet"],
      ["main.go", "package main\nfunc Start() string { return \"private body\" }", "Start"],
      ["main.rs", "pub fn start() -> i32 { 123 }", "start"],
      ["Main.java", "class Main { public void start() { System.out.println(123); } }", "start"],
      ["main.c", "int start(int a) { return a + 123; }", "start"],
      ["main.cpp", "class Main { public: int start() { return 123; } };", "start"],
      ["main.rb", "def start(name)\n  puts 'private body'\nend", "start"],
    ]
    await Promise.all(fixtures.map(async ([file, source, name]) => {
      const result = await parse(file, source)
      expect(result.symbols.some((symbol) => symbol.name.includes(name))).toBe(true)
      expect(result.symbols.map((symbol) => symbol.signature).join("\n")).not.toContain("private body")
      expect(result.symbols.map((symbol) => symbol.signature).join("\n")).not.toContain("secret body")
    }))
  })

  test("resolves dependencies, reuses unchanged parses and updates/deletes incrementally", async () => {
    await using tmp = await tmpdir({ init: async (root) => {
      await Bun.write(path.join(root, "main.ts"), "import { greet } from './greet'\nexport function run() { greet() }")
      await Bun.write(path.join(root, "greet.ts"), "export function greet() {}")
    } })
    const first = await build(tmp.path, ["main.ts", "greet.ts"])
    expect(dependencies(first, "main.ts").imports).toEqual(["greet.ts"])
    expect(dependencies(first, "greet.ts").importedBy).toEqual(["main.ts"])
    const second = await build(tmp.path, ["main.ts", "greet.ts"], first)
    expect(second.files.get("main.ts")).toBe(first.files.get("main.ts"))
    await Bun.write(path.join(tmp.path, "greet.ts"), "export function goodbye() {}")
    const third = await build(tmp.path, ["main.ts", "greet.ts"], second)
    expect(findSymbols(third, "goodbye")).toHaveLength(1)
    expect(findSymbols(third, "greet")).toHaveLength(0)
    const removed = await build(tmp.path, ["main.ts"], third)
    expect(removed.files.has("greet.ts")).toBe(false)
    expect(dependencies(removed, "main.ts").imports).toEqual([])
  })

  test("excludes dependency directories, oversize files and paths outside the workspace", async () => {
    await using tmp = await tmpdir({ init: async (root) => {
      await Bun.write(path.join(root, "small.ts"), "export function small() {}")
      await Bun.write(path.join(root, "large.ts"), "a".repeat(1024 * 1024 + 1))
      await Bun.write(path.join(root, "node_modules", "ignored.ts"), "export function ignored() {}")
    } })
    const result = await build(tmp.path, ["small.ts", "large.ts", "node_modules/ignored.ts", "../escape.ts"])
    expect([...result.files.keys()]).toEqual(["small.ts"])
    expect(result.skipped).toBe(3)
  })

  test("prioritizes relevant symbols and respects estimated token budget", async () => {
    const map = { files: new Map(await Promise.all(["aaa.ts", "zebra.ts"].map(async (file) => [file, await parse(file, `export function ${file.split('.')[0]}() {}`)] as const))), dependencies: new Map<string, string[]>(), skipped: 0 }
    expect(format(map, { query: "zebra", tokens: 100 }).startsWith("zebra.ts")).toBe(true)
    expect(format(map, { tokens: 10 }).length).toBeLessThanOrEqual(40)
    expect(format(map, { tokens: 0 })).toBe("")
  })
})
