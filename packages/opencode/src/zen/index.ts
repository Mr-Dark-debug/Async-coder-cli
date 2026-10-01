export * as Zen from "./index"
import type { Provider } from "@/provider"
import type { ModelsDev } from "@/provider"

export type Task = "coding" | "review" | "planning" | "writing" | "quick"

export function isFree(model: Provider.Model, catalog: Record<string, ModelsDev.Provider>) {
  const price = catalog[model.providerID]?.models[model.id]?.cost
  // Live-discovered models with unknown pricing default to zero internally.
  // Only authoritative catalog pricing may qualify a remote model as free.
  return model.status !== "deprecated" && model.capabilities.toolcall && price?.input === 0 && price.output === 0 &&
    (price.cache_read ?? 0) === 0 && (price.cache_write ?? 0) === 0 && model.cost.input === 0 && model.cost.output === 0
}

export function list(providers: Record<string, Provider.Info>, catalog: Record<string, ModelsDev.Provider>) {
  return Object.values(providers).flatMap((provider) => Object.values(provider.models)
    .filter((model) => isFree(model, catalog))
    .map((model) => ({
      model,
      authentication: provider.id === "opencode" ? "Public free endpoint; availability is controlled by OpenCode" : "Provider credentials required",
      bestFor: model.capabilities.reasoning ? ["planning", "review", "coding"] : ["quick", "writing", "coding"],
    })))
}

export function recommend(models: Provider.Model[], options: { task?: Task; context?: number; maxCost?: number } = {}) {
  const task = options.task ?? "coding"
  return models.filter((model) => model.status !== "deprecated" && model.capabilities.toolcall && model.limit.context >= (options.context ?? 0) &&
    (options.maxCost === undefined || model.cost.input + model.cost.output <= options.maxCost))
    .map((model) => ({ model, score:
      ((task === "review" || task === "planning") && model.capabilities.reasoning ? 5 : 0) +
      (task === "coding" && /codex|coder|code|sonnet|sol|devstral/i.test(model.id) ? 4 : 0) +
      (task === "quick" && /flash|mini|nano|haiku|luna|fast/i.test(model.id) ? 5 : 0) +
      (task === "writing" && model.capabilities.input.text ? 1 : 0) }))
    .sort((a, b) => b.score - a.score || a.model.cost.output - b.model.cost.output || b.model.release_date.localeCompare(a.model.release_date) || a.model.id.localeCompare(b.model.id))
    .map((item) => item.model)
}

export function route(providers: Record<string, Provider.Info>, catalog: Record<string, ModelsDev.Provider>, options: { task?: Task; context?: number }, fallback?: Provider.Model) {
  return recommend(list(providers, catalog).map((item) => item.model), options)[0] ?? fallback
}

export function estimate(model: Pick<Provider.Model, "cost">, input: number, output: number) {
  if (!Number.isFinite(input) || !Number.isFinite(output) || input < 0 || output < 0) throw new Error("Token counts must be non-negative finite numbers")
  return (input * model.cost.input + output * model.cost.output) / 1_000_000
}
