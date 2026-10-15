export * as Spec from "./index"

/**
 * Spec-driven workflow: requirements -> design -> tasks.
 *
 * Documents live in `.async-coder/specs/<name>/{requirements,design,tasks}.md`. This module is pure
 * (no I/O) so the ordering guard and the task parser are testable without a project fixture.
 */

export const DOCS = ["requirements", "design", "tasks"] as const
export type Doc = (typeof DOCS)[number]

/** Spec names are directory names: lowercase, digits and hyphens only. */
export const NAME = /^[a-z0-9][a-z0-9-]{0,62}$/

export type Task = {
  id: string
  title: string
  done: boolean
  /** `- [ ]* 2.2 ...` marks an optional (test) sub-task that the runner skips. */
  optional: boolean
  depth: 1 | 2
  /** Requirement ids this task covers, from a `_Requirements: 1.2, 3.1_` line. */
  requirements: string[]
  /** Task ids that must be done first, from a `_Depends: 1.1_` line. */
  depends: string[]
}

export type Guard = { ok: true } | { ok: false; reason: string }

/** Ordered workflow guard: a document may only be written after the documents before it exist. */
export function canWrite(doc: Doc, existing: ReadonlySet<Doc>): Guard {
  const missing = DOCS.slice(0, DOCS.indexOf(doc)).filter((item) => !existing.has(item))
  if (!missing.length) return { ok: true }
  return { ok: false, reason: `Write ${missing.join(" and ")} first; the spec workflow is ordered requirements -> design -> tasks.` }
}

const LINE = /^(\s*)- \[( |x|X)\](\*?)\s+(\d+(?:\.\d+)?)\.?\s+(.*)$/
const SIDE = /_(Requirements?|Depends?):\s*([\d.,\s]+)_/g

const ids = (value: string) => value.split(/[\s,]+/).filter((item) => /^\d+(\.\d+)?$/.test(item))

/** Parse tasks.md. At most two levels; a checkbox with a `*` suffix is optional. */
export function parseTasks(markdown: string): Task[] {
  const lines = markdown.split(/\r?\n/)
  return lines.flatMap((line, index) => {
    const match = LINE.exec(line)
    if (!match) return []
    const indent = match[1].length
    const body = lines.slice(index + 1).reduce<{ text: string[]; stop: boolean }>(
      (acc, next) => {
        if (acc.stop) return acc
        if (!next.trim()) return acc
        const nested = /^(\s*)/.exec(next)![1].length > indent
        if (!nested || LINE.test(next)) return { ...acc, stop: true }
        return { text: [...acc.text, next], stop: false }
      },
      { text: [], stop: false },
    ).text.join("\n")
    const requirements: string[] = []
    const depends: string[] = []
    for (const side of `${match[5]}\n${body}`.matchAll(SIDE)) {
      if (side[1].toLowerCase().startsWith("requirement")) requirements.push(...ids(side[2]))
      else depends.push(...ids(side[2]))
    }
    return [
      {
        id: match[4],
        title: match[5].replace(SIDE, "").trim(),
        done: match[2].toLowerCase() === "x",
        optional: match[3] === "*",
        depth: (match[4].includes(".") ? 2 : 1) as 1 | 2,
        requirements,
        depends,
      },
    ]
  })
}

/**
 * Runnable tasks: not done, not optional, every dependency done. A parent whose sub-tasks are still
 * open is not runnable itself (the sub-tasks are). Independent tasks form a parallel wave.
 */
export function ready(tasks: Task[]) {
  const done = new Set(tasks.filter((task) => task.done).map((task) => task.id))
  const parents = new Set(tasks.filter((task) => task.depth === 2).map((task) => task.id.split(".")[0]))
  return tasks.filter(
    (task) =>
      !task.done &&
      !task.optional &&
      !(task.depth === 1 && parents.has(task.id)) &&
      task.depends.every((dep) => done.has(dep)),
  )
}

export function progress(tasks: Task[]) {
  const required = tasks.filter((task) => !task.optional && !(task.depth === 1 && tasks.some((t) => t.depth === 2 && t.id.startsWith(`${task.id}.`))))
  return { done: required.filter((task) => task.done).length, total: required.length }
}

/** Mark a task done. Returns the unchanged document when the id is not found. */
export function complete(markdown: string, id: string) {
  const eol = markdown.includes("\r\n") ? "\r\n" : "\n"
  return markdown
    .split(/\r?\n/)
    .map((line) => {
      const match = LINE.exec(line)
      if (!match || match[4] !== id) return line
      return line.replace(/- \[ \]/, "- [x]")
    })
    .join(eol)
}

/** Requirement ids declared in requirements.md: `### Requirement 2` headings and `2.1` criteria. */
export function requirementIds(markdown: string) {
  const found = new Set<string>()
  for (const line of markdown.split(/\r?\n/)) {
    const heading = /^#{2,4}\s*Requirement\s+(\d+)/i.exec(line)
    if (heading) found.add(heading[1])
    const criterion = /^\s*(\d+\.\d+)[.)]?\s+\S/.exec(line)
    if (criterion) found.add(criterion[1])
  }
  return [...found]
}

/** Requirement ids no task covers. A task covering `2` also covers `2.x`. */
export function uncovered(requirements: string[], tasks: Task[]) {
  const covered = tasks.flatMap((task) => task.requirements)
  return requirements.filter(
    (id) => !covered.some((c) => c === id || id.startsWith(`${c}.`) || c.startsWith(`${id}.`)),
  )
}
