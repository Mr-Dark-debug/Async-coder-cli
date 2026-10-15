import matter from "gray-matter"

/**
 * Steering files: `.async-coder/steering/*.md` (project) and `<config dir>/steering/*.md` (user).
 *
 *   ---
 *   inclusion: always | fileMatch | manual     # default: always
 *   fileMatchPattern: "src/api/**\/*.ts"        # string or list; used by fileMatch
 *   ---
 *
 * always    -> part of the system prompt, like AGENTS.md
 * fileMatch -> attached when the agent reads a file matching a pattern
 * manual    -> never attached automatically (reserved for explicit mentions)
 */
export type Inclusion = "always" | "fileMatch" | "manual"

export type Rule = { inclusion: Inclusion; patterns: string[] }

const INCLUSIONS = new Set<string>(["always", "fileMatch", "manual"])

export function parse(text: string): Rule {
  const data = (() => {
    try {
      return matter(text).data as Record<string, unknown>
    } catch {
      return {}
    }
  })()
  const inclusion = typeof data.inclusion === "string" && INCLUSIONS.has(data.inclusion) ? (data.inclusion as Inclusion) : "always"
  const raw = data.fileMatchPattern ?? data.fileMatchPatterns
  const patterns = (Array.isArray(raw) ? raw : raw === undefined ? [] : [raw]).filter((item): item is string => typeof item === "string" && item.length > 0)
  return { inclusion, patterns }
}

/** Body without the frontmatter block, for attaching to a prompt. */
export function body(text: string) {
  try {
    return matter(text).content.trim()
  } catch {
    return text.trim()
  }
}

/** True when a fileMatch rule's pattern matches a project-relative, forward-slash path. */
export function applies(rule: Rule, relativePath: string) {
  if (rule.inclusion !== "fileMatch") return false
  return rule.patterns.some((pattern) => new Bun.Glob(pattern).match(relativePath))
}
