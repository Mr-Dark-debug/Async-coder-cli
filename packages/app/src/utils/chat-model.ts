import type { Model } from "@async-coder/sdk/v2"

export function isFreeChatModel(cost: Model["cost"] | undefined) {
  return !!cost && cost.input === 0 && cost.output === 0 && (cost.cache.read ?? 0) === 0 && (cost.cache.write ?? 0) === 0
}

export function chatModelFooter(model: Pick<Model, "cost" | "limit">) {
  const price = isFreeChatModel(model.cost) ? "Free" : `$${model.cost.input}/$${model.cost.output} per 1M tokens`
  return `${model.limit.context.toLocaleString()} context · ${price}`
}

/** Speech/image-only models cannot participate in a coding conversation. */
export function supportsChatModel(model: Pick<Model, "capabilities"> | undefined) {
  return model?.capabilities.input.text === true && model.capabilities.output.text === true
}

export function pickChatModel<T extends Pick<Model, "id" | "capabilities">>(models: readonly T[], preferred?: string) {
  return models.find((model) => model.id === preferred && supportsChatModel(model)) ?? models.find(supportsChatModel)
}
