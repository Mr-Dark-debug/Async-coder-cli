import path from "path"
import { realpath } from "fs/promises"
import { FileIgnore } from "@/file/ignore"
import { language, parse } from "./parser"
import type { FileMap, RepoMap } from "./types"

export async function build(root: string, paths: string[], previous?: RepoMap): Promise<RepoMap> {
  const directory = await realpath(root)
  const selected = paths.filter((file) => language(file) && !FileIgnore.match(file)).sort().slice(0, 2000)
  const files = new Map<string, FileMap>()
  const budget = { bytes: 0, skipped: paths.length - selected.length }
  await selected.reduce(async (pending, file) => {
    await pending
    const absolute = await realpath(path.resolve(directory, file)).catch(() => undefined)
    const relative = absolute && path.relative(directory, absolute)
    if (!absolute || !relative || relative.startsWith("..") || path.isAbsolute(relative)) {
      budget.skipped++
      return
    }
    const input = Bun.file(absolute)
    if (input.size > 1024 * 1024 || budget.bytes + input.size > 16 * 1024 * 1024) {
      budget.skipped++
      return
    }
    budget.bytes += input.size
    const source = await input.text().catch(() => undefined)
    if (source === undefined || source.includes("\0")) {
      budget.skipped++
      return
    }
    const hash = Bun.hash(source).toString(16)
    const cached = previous?.files.get(file)
    files.set(file, cached?.hash === hash ? cached : await parse(file, source))
  }, Promise.resolve())
  const dependencies = new Map(
    [...files].map(([file, info]) => [file, info.imports.flatMap((item) => {
      const specifier = /["'](\.[^"']+)["']/.exec(item)?.[1]
      if (!specifier) return []
      const target = path.normalize(path.join(path.dirname(file), specifier))
      const candidates = [target, ...[".ts", ".tsx", ".js", ".jsx", ".py", ".rs", ".go", ".java", ".rb", ".c", ".cpp"].flatMap((ext) => [target + ext, path.join(target, "index" + ext)])]
      const resolved = candidates.find((candidate) => files.has(candidate) || files.has(candidate.replaceAll("\\", "/")))
      return resolved ? [files.has(resolved) ? resolved : resolved.replaceAll("\\", "/")] : []
    })]),
  )
  return { files, dependencies, skipped: budget.skipped }
}
