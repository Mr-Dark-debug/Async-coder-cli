import type { RepoMap } from "./types"

export function format(map: RepoMap, options: { query?: string; tokens?: number } = {}) {
  const budget = Math.max(0, Math.floor(options.tokens ?? 3000)) * 4
  const query = options.query?.toLowerCase()
  const ordered = [...map.files.values()].sort((a, b) => {
    const score = (file: typeof a) => (query && `${file.path} ${file.symbols.map((s) => s.name).join(" ")}`.toLowerCase().includes(query) ? 1000 : 0) + file.symbols.filter((s) => s.exported).length
    return score(b) - score(a) || a.path.localeCompare(b.path)
  })
  const lines = ordered.flatMap((file) => [
    `${file.path} (${file.language}, ${file.lineCount} lines)`,
    ...file.imports.map((item) => `  ${item}`),
    ...file.symbols.map((symbol) => `  ${symbol.startLine}: ${symbol.signature}`),
  ])
  const result = lines.reduce((out, line) => out.length + line.length + 1 <= budget ? out + line + "\n" : out, "")
  return result.trimEnd()
}

export function findSymbols(map: RepoMap, query: string) {
  return [...map.files.values()].flatMap((file) => file.symbols
    .filter((symbol) => symbol.name.toLowerCase().includes(query.toLowerCase()))
    .map((symbol) => ({ file: file.path, ...symbol })))
}

export function dependencies(map: RepoMap, file: string) {
  return { imports: map.dependencies.get(file) ?? [], importedBy: [...map.dependencies].filter(([, deps]) => deps.includes(file)).map(([name]) => name) }
}
