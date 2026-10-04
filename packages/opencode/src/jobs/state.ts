export type Status = "queued" | "running" | "done" | "failed" | "cancelled"

export const terminal = (status: Status) => status === "done" || status === "failed" || status === "cancelled"

const edges: Record<Status, Status[]> = {
  queued: ["running", "cancelled", "failed"],
  running: ["done", "failed", "cancelled"],
  done: [],
  failed: ["queued"], // retry
  cancelled: ["queued"], // retry
}

export function canTransition(from: Status, to: Status) {
  return edges[from].includes(to)
}

export function transition(from: Status, to: Status) {
  if (!canTransition(from, to)) throw new Error(`Invalid job transition ${from} -> ${to}`)
  return to
}

/** A short, unique-enough branch/worktree slug from the prompt. */
export function slug(prompt: string) {
  const text = prompt
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
    .replace(/-+$/g, "")
  return text || "job"
}

export function name(prompt: string) {
  const line = prompt.trim().split("\n")[0] ?? ""
  return line.length > 48 ? `${line.slice(0, 47)}…` : line || "job"
}
