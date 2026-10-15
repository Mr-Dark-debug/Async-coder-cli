export * as BestOf from "./index"

/**
 * Task-level best-of-N: the same task is given to several models, each in its own worktree, and the
 * results are ranked by deterministic evidence (gate outcome, then cost, then time). This is different
 * from the step-level `max` agent, which samples one model inside a single session.
 *
 * State lives in a receipt file next to the project (`.async-coder/best-of/<id>.json`); nothing here
 * depends on job schema fields, so it works with the current jobs API.
 */

export const MAX_CANDIDATES = 4

export type Candidate = {
  model: string
  job_id: string
  branch: string | null
  status: "queued" | "running" | "done" | "failed" | "cancelled"
  /** true: gate ran and passed. false: gate ran and failed. null: no gate was configured. */
  passed: boolean | null
  cost_usd: number
  duration_ms: number | null
  files: number | null
  insertions: number | null
  deletions: number | null
  error: string | null
}

export type Receipt = {
  id: string
  created_at: number
  prompt: string
  verify: string[]
  budget_usd: number
  candidates: Candidate[]
  /** model of the recommended candidate, or null when nothing finished cleanly */
  recommended: string | null
  promoted: { model: string; branch: string; at: number } | null
}

export type Check = { ok: true; models: string[] } | { ok: false; reason: string }

/** Validate the model list: at least two distinct models, bounded by MAX_CANDIDATES unless raised explicitly. */
export function check(models: string[], limit = MAX_CANDIDATES): Check {
  const unique = [...new Set(models.map((model) => model.trim()).filter(Boolean))]
  if (unique.length < 2) return { ok: false, reason: "Best-of-N needs at least two distinct models (--models a,b,c)." }
  if (unique.length > limit) {
    return { ok: false, reason: `${unique.length} candidates exceeds the limit of ${limit}. Raise it with --max-candidates if you really want that spend.` }
  }
  return { ok: true, models: unique }
}

const rankOf = (candidate: Candidate) => {
  if (candidate.status !== "done") return 3
  if (candidate.passed === true) return 0
  if (candidate.passed === null) return 1 // finished, but nothing verified it
  return 2
}

/** Best first: gate passed, then unverified, then gate failed, then not finished; ties by cost then time. */
export function rank(candidates: Candidate[]) {
  return [...candidates].sort(
    (a, b) =>
      rankOf(a) - rankOf(b) ||
      a.cost_usd - b.cost_usd ||
      (a.duration_ms ?? Number.MAX_SAFE_INTEGER) - (b.duration_ms ?? Number.MAX_SAFE_INTEGER) ||
      a.model.localeCompare(b.model),
  )
}

/** The model to recommend. Only a finished job whose gate did not fail is eligible. */
export function recommend(candidates: Candidate[]) {
  const best = rank(candidates)[0]
  if (!best || rankOf(best) > 1) return null
  return best.model
}

export const label = (candidate: Candidate) =>
  candidate.status !== "done"
    ? candidate.status
    : candidate.passed === true
      ? "passed"
      : candidate.passed === false
        ? "gate failed"
        : "unverified"

/** A readable comparison table for the terminal. */
export function table(receipt: Receipt) {
  const rows = rank(receipt.candidates).map((c) => [
    c.model === receipt.recommended ? "*" : " ",
    c.model,
    label(c),
    `$${c.cost_usd.toFixed(4)}`,
    c.duration_ms === null ? "-" : `${Math.round(c.duration_ms / 1000)}s`,
    c.files === null ? "-" : `${c.files} files +${c.insertions ?? 0}/-${c.deletions ?? 0}`,
    c.branch ?? "-",
  ])
  const head = [" ", "model", "result", "cost", "time", "change", "branch"]
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)))
  const line = (cells: string[]) => cells.map((cell, i) => cell.padEnd(widths[i])).join("  ").trimEnd()
  return [line(head), ...rows.map(line)].join("\n")
}

export const newID = (now = Date.now()) => `bon-${now.toString(36)}`
