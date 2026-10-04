/**
 * Capability aliases resolved from what is actually connected, never from a hard-coded model id.
 * A model is only ever picked if it can call tools: an agent loop cannot use one that cannot.
 */

export const ALIASES = ["cheap", "local", "long-context"] as const
export type Alias = (typeof ALIASES)[number]

export const isAlias = (ref: string): ref is Alias => (ALIASES as readonly string[]).includes(ref)

export type Candidate = {
  providerID: string
  id: string
  status?: string
  toolcall: boolean
  context: number
  cost: { input: number; output: number }
  /** True for models served from this machine (Ollama, llama.cpp, LM Studio). */
  local: boolean
}

const LOCAL_PROVIDERS = new Set(["ollama", "lmstudio", "llama.cpp", "llamacpp", "jan"])

export function isLocal(input: { providerID: string; baseURL?: unknown }) {
  if (LOCAL_PROVIDERS.has(input.providerID)) return true
  return typeof input.baseURL === "string" && /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(input.baseURL)
}

const price = (model: Candidate) => model.cost.input + model.cost.output

/** Why a model was picked, for display next to the alias. */
export type Pick = { model: Candidate; why: string }

export function pick(alias: Alias, models: Candidate[]): Pick | undefined {
  const usable = models.filter((model) => model.toolcall && model.status !== "deprecated")
  if (alias === "local") {
    const best = usable.filter((model) => model.local).toSorted((a, b) => b.context - a.context)[0]
    return best && { model: best, why: `local model with the largest context (${best.context.toLocaleString("en-US")} tokens)` }
  }
  if (alias === "long-context") {
    const best = usable.toSorted((a, b) => b.context - a.context || price(a) - price(b))[0]
    return best && { model: best, why: `largest tool-capable context window (${best.context.toLocaleString("en-US")} tokens)` }
  }
  // cheapest: local models cost nothing but only win when nothing remote is priced lower; ties prefer more context.
  const best = usable.toSorted((a, b) => price(a) - price(b) || b.context - a.context)[0]
  return best && { model: best, why: price(best) === 0 ? "free or local, tool-capable" : `lowest price per million tokens ($${price(best)})` }
}
