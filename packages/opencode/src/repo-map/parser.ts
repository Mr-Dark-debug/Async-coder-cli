import path from "path"
import { fileURLToPath } from "url"
import { Language, Parser, type Node } from "web-tree-sitter"
import { lazy } from "@/util/lazy"
import type { FileMap, SymbolInfo } from "./types"

const assets = lazy(async () => {
  const [{ default: runtime }, ts, tsx, js, py, go, rust, java, c, cpp, ruby] = await Promise.all([
    import("web-tree-sitter/tree-sitter.wasm" as string, { with: { type: "wasm" } }),
    import("@repomix/tree-sitter-wasms/out/tree-sitter-typescript.wasm" as string, { with: { type: "wasm" } }),
    import("@repomix/tree-sitter-wasms/out/tree-sitter-tsx.wasm" as string, { with: { type: "wasm" } }),
    import("@repomix/tree-sitter-wasms/out/tree-sitter-javascript.wasm" as string, { with: { type: "wasm" } }),
    import("@repomix/tree-sitter-wasms/out/tree-sitter-python.wasm" as string, { with: { type: "wasm" } }),
    import("@repomix/tree-sitter-wasms/out/tree-sitter-go.wasm" as string, { with: { type: "wasm" } }),
    import("@repomix/tree-sitter-wasms/out/tree-sitter-rust.wasm" as string, { with: { type: "wasm" } }),
    import("@repomix/tree-sitter-wasms/out/tree-sitter-java.wasm" as string, { with: { type: "wasm" } }),
    import("@repomix/tree-sitter-wasms/out/tree-sitter-c.wasm" as string, { with: { type: "wasm" } }),
    import("@repomix/tree-sitter-wasms/out/tree-sitter-cpp.wasm" as string, { with: { type: "wasm" } }),
    import("@repomix/tree-sitter-wasms/out/tree-sitter-ruby.wasm" as string, { with: { type: "wasm" } }),
  ])
  const resolve = (asset: string) =>
    asset.startsWith("file://") ? fileURLToPath(asset) : path.isAbsolute(asset) ? asset : fileURLToPath(new URL(asset, import.meta.url))
  await Parser.init({ locateFile: () => resolve(runtime) })
  return Object.fromEntries(
    await Promise.all(
      Object.entries({ typescript: ts, tsx, javascript: js, python: py, go, rust, java, c, cpp, ruby }).map(
        async ([name, asset]) => [name, await Language.load(resolve(asset.default))],
      ),
    ),
  ) as Record<string, Language>
})

const extensions: Record<string, string> = {
  ".ts": "typescript", ".tsx": "tsx", ".js": "javascript", ".jsx": "javascript", ".mjs": "javascript", ".cjs": "javascript",
  ".py": "python", ".go": "go", ".rs": "rust", ".java": "java", ".c": "c", ".h": "c", ".cpp": "cpp", ".hpp": "cpp", ".cc": "cpp", ".cxx": "cpp", ".rb": "ruby",
}

export function language(filepath: string) {
  return extensions[path.extname(filepath).toLowerCase()]
}

const definitions = new Set([
  "function_declaration", "function_definition", "function_item", "method_definition", "method_declaration", "method", "singleton_method",
  "class_declaration", "class_definition", "class", "interface_declaration", "type_alias_declaration", "type_declaration", "struct_item", "enum_item", "trait_item",
])

export async function parse(filepath: string, source: string): Promise<FileMap> {
  const lang = language(filepath)
  if (!lang) throw new Error(`Unsupported repository map language: ${filepath}`)
  const grammar = (await assets())[lang]
  const parser = new Parser()
  parser.setLanguage(grammar)
  const tree = parser.parse(source)
  if (!tree) {
    parser.delete()
    throw new Error(`Could not parse ${filepath}`)
  }
  const symbols: SymbolInfo[] = []
  const imports: string[] = []
  const visit = (node: Node) => {
    if (/^(import_statement|import_from_statement|import_declaration|use_declaration|preproc_include)$/.test(node.type)) {
      imports.push(node.text.replace(/\s+/g, " ").slice(0, 300))
    }
    const arrow = node.type === "variable_declarator" && node.childForFieldName("value")?.type === "arrow_function"
    if (definitions.has(node.type) || arrow) {
      const name = node.childForFieldName("name") ?? node.childForFieldName("declarator")
      const body = arrow ? node.childForFieldName("value")?.childForFieldName("body") : node.childForFieldName("body")
      if (name) symbols.push({
        name: name.text.replace(/\s+/g, " ").slice(0, 120),
        kind: node.type,
        signature: source.slice(node.startIndex, body?.startIndex ?? node.endIndex).split("\n").slice(0, 8).join(" ").replace(/\s+/g, " ").slice(0, 400),
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        exported: node.parent?.type === "export_statement" || /^(pub|export)\b/.test(node.text),
      })
    }
    node.namedChildren.filter((child): child is Node => child !== null).forEach(visit)
  }
  // Parsers own WASM allocations. Dispose even when extraction fails.
  try {
    visit(tree.rootNode)
    return { path: filepath, language: lang, imports, symbols, lineCount: source.split("\n").length, hash: Bun.hash(source).toString(16) }
  } finally {
    tree.delete()
    parser.delete()
  }
}
