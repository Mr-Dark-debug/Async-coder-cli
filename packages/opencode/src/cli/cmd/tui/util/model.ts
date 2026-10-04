import type { Provider } from "@async-coder/sdk/v2"
import { modelCostLabel } from "../feature-plugins/sidebar/usage-data"

export function modelFooter(model: Provider["models"][string]) {
  return [model.limit.context > 0 ? `${new Intl.NumberFormat("en", { notation: "compact" }).format(model.limit.context)} context` : "Context unknown", modelCostLabel(model.cost)].filter(Boolean).join(" | ")
}

export function index(list: Provider[] | undefined) {
  return new Map((list ?? []).map((item) => [item.id, item] as const))
}

export function get(list: Provider[] | ReadonlyMap<string, Provider> | undefined, providerID: string, modelID: string) {
  const provider =
    list instanceof Map
      ? list.get(providerID)
      : Array.isArray(list)
        ? list.find((item) => item.id === providerID)
        : undefined
  return provider?.models[modelID]
}

export function name(
  list: Provider[] | ReadonlyMap<string, Provider> | undefined,
  providerID: string,
  modelID: string,
) {
  return get(list, providerID, modelID)?.name ?? modelID
}
