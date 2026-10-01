export type SymbolInfo = {
  name: string
  kind: string
  signature: string
  startLine: number
  endLine: number
  exported: boolean
}

export type FileMap = {
  path: string
  language: string
  imports: string[]
  symbols: SymbolInfo[]
  lineCount: number
  hash: string
}

export type RepoMap = {
  files: Map<string, FileMap>
  dependencies: Map<string, string[]>
  skipped: number
}
