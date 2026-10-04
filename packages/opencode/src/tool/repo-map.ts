import z from "zod"
import { Effect } from "effect"
import * as Tool from "./tool"
import { RepoMap } from "@/repo-map"

export const RepoMapTool = Tool.define("repo_map", Effect.gen(function* () {
  const maps = yield* RepoMap.Service
  return {
    description: "Get a compact tree-sitter structural map of the workspace. Contains signatures, imports and locations without function bodies. Use query to prioritize relevant files.",
    parameters: z.object({ query: z.string().optional(), tokens: z.number().int().min(100).max(10000).default(3000) }),
    execute: (args: { query?: string; tokens: number }, ctx: Tool.Context) => Effect.gen(function* () {
      yield* ctx.ask({ permission: "repo_map", patterns: ["*"], always: ["*"], metadata: {} })
      const map = yield* maps.get(ctx.abort)
      return { title: "Repository map", output: RepoMap.format(map, args) || "No supported source files found.", metadata: { files: map.files.size, skipped: map.skipped } }
    }).pipe(Effect.orDie),
  }
}))

export const FindSymbolTool = Tool.define("find_symbol", Effect.gen(function* () {
  const maps = yield* RepoMap.Service
  return {
    description: "Find function, method, class, interface and type definitions in the workspace by name.",
    parameters: z.object({ query: z.string().min(1) }),
    execute: (args: { query: string }, ctx: Tool.Context) => Effect.gen(function* () {
      yield* ctx.ask({ permission: "repo_map", patterns: ["*"], always: ["*"], metadata: {} })
      const results = RepoMap.findSymbols(yield* maps.get(ctx.abort), args.query)
      return { title: `Symbols: ${args.query}`, output: JSON.stringify(results.slice(0, 100), null, 2), metadata: { matches: results.length } }
    }).pipe(Effect.orDie),
  }
}))

export const FindDependenciesTool = Tool.define("find_dependencies", Effect.gen(function* () {
  const maps = yield* RepoMap.Service
  return {
    description: "Find resolved relative source imports and files importing a workspace-relative file.",
    parameters: z.object({ file: z.string() }),
    execute: (args: { file: string }, ctx: Tool.Context) => Effect.gen(function* () {
      yield* ctx.ask({ permission: "repo_map", patterns: ["*"], always: ["*"], metadata: {} })
      return { title: `Dependencies: ${args.file}`, output: JSON.stringify(RepoMap.dependencies(yield* maps.get(ctx.abort), args.file), null, 2), metadata: {} }
    }).pipe(Effect.orDie),
  }
}))
