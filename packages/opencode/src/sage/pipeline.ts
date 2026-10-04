import type { ConfigSage } from "@/config/sage"

export type Change = {
  /** Paths touched by the job, relative to the repository. */
  files: string[]
  /** Lines added plus removed. */
  lines: number
}

const SENSITIVE: [RegExp, string][] = [
  [/(^|\/)(auth|security|crypto|permission|session)[\w.-]*/i, "touches authentication, security or session code"],
  [/(^|\/)(migrations?|schema)(\/|\.|$)/i, "changes a database schema or migration"],
  [/(^|\/)\.env|secret|credential|\.pem$|\.key$/i, "touches secrets or credentials"],
  [/(^|\/)\.github\/workflows\/|(^|\/)(Dockerfile|docker-compose)|\.gitlab-ci/i, "changes CI or container configuration"],
  [/(^|\/)(package\.json|bun\.lock|pnpm-lock\.yaml|package-lock\.json|Cargo\.toml|go\.mod|requirements\.txt)$/i, "changes dependencies"],
  [/(sandbox|policy)[\w.-]*\.(ts|js|json|toml|ya?ml)$/i, "changes sandbox or policy configuration"],
]

export type Risk = { score: number; reasons: string[] }

/**
 * A 0..1 risk score from signals that cost nothing to compute: diff size, sensitive paths and
 * how often the gate has already failed. Small, unremarkable changes score near zero.
 */
export function risk(input: { change: Change; failures?: number }): Risk {
  const reasons: string[] = []
  let score = 0
  const { lines, files } = input.change
  if (lines > 800) (score += 0.4), reasons.push(`large change (${lines} lines)`)
  else if (lines > 250) (score += 0.25), reasons.push(`sizeable change (${lines} lines)`)
  else if (lines > 80) score += 0.1
  if (files.length > 15) (score += 0.2), reasons.push(`${files.length} files touched`)
  else if (files.length > 6) score += 0.1
  const hits = new Set<string>()
  for (const file of files) for (const [pattern, why] of SENSITIVE) if (pattern.test(file)) hits.add(why)
  for (const why of hits) (score += 0.3), reasons.push(why)
  if ((input.failures ?? 0) > 0) (score += Math.min(0.3, 0.15 * (input.failures ?? 0))), reasons.push("the gate has failed before")
  return { score: Math.min(1, Number(score.toFixed(2))), reasons }
}

export type Stage = { type: "none" } | { type: "critique"; reason: string }

/**
 * Decide whether a model needs to look at the result. The deterministic gate always runs first;
 * a green gate on a low-risk change ends the pipeline with no extra model call (cost 1.0x).
 */
export function plan(input: {
  cfg: ConfigSage.Info | undefined
  gate: "pass" | "fail" | "none"
  risk: Risk
}): Stage {
  if (!input.cfg?.enabled) return { type: "none" }
  const when = input.cfg.critique_on ?? "gate-fail-or-high-risk"
  if (when === "never") return { type: "none" }
  const high = input.risk.score >= (input.cfg.risk_threshold ?? 0.5)
  const failed = input.gate === "fail"
  if (failed && when !== "high-risk") return { type: "critique", reason: "the verification gate failed" }
  if (high && when !== "gate-fail") return { type: "critique", reason: `high-risk change (${input.risk.reasons.join("; ") || `score ${input.risk.score}`})` }
  return { type: "none" }
}

/** Sage may use at most `budget_share` of the job's budget. Unlimited when the job has no budget. */
export function affordable(input: { cfg: ConfigSage.Info | undefined; budget?: number | null; spent: number }) {
  if (!input.budget) return true
  return input.spent < input.budget * (input.cfg?.budget_share ?? 0.25)
}

/** What the advisor sees: the task, the failing gate and the diff summary, not the whole session. */
export function critiquePrompt(input: { task: string; reason: string; gate?: { command: string; code: number; output: string }; change: Change; diff?: string }) {
  return [
    "You are reviewing the result of an autonomous coding job. Give a short, concrete critique.",
    `Why you were asked: ${input.reason}.`,
    "",
    "<task>",
    input.task,
    "</task>",
    "",
    input.gate ? `<failing-gate>\n$ ${input.gate.command}\nexit ${input.gate.code}\n${input.gate.output}\n</failing-gate>\n` : "",
    `<change files="${input.change.files.length}" lines="${input.change.lines}">`,
    input.change.files.slice(0, 40).join("\n"),
    "</change>",
    input.diff ? `\n<diff>\n${input.diff.slice(0, 12_000)}\n</diff>` : "",
    "",
    "Reply with: (1) the most likely cause of the problem or risk, (2) test cases that are missing, (3) the single next step to take. Do not rewrite the code.",
  ]
    .filter((line, index, all) => line !== "" || all[index - 1] !== "")
    .join("\n")
}
