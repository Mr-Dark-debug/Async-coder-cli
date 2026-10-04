import type { Config } from "@/config"
import type { Provider } from "@/provider"
import { ProviderTransform } from "@/provider"
import type { MessageV2 } from "./message-v2"

const COMPACTION_BUFFER = 20_000

// Cap the output reservation so models with large output windows (e.g. 32K, 64K)
// don't strangle the usable input window. 20K covers >99.99% of compaction
// summary outputs based on production telemetry of summary token counts.
const OUTPUT_CAP = 20_000

export function usable(input: { cfg: Config.Info; model: Provider.Model }) {
  const context = input.model.limit.context
  if (context === 0) return 0

  const reserved =
    input.cfg.compaction?.reserved ?? Math.min(COMPACTION_BUFFER, ProviderTransform.maxOutputTokens(input.model))
  const outputReserve = Math.min(ProviderTransform.maxOutputTokens(input.model), OUTPUT_CAP)

  return input.model.limit.input
    ? Math.max(0, input.model.limit.input - reserved)
    : Math.max(0, context - outputReserve - reserved)
}

export function isOverflow(input: { cfg: Config.Info; tokens: MessageV2.Assistant["tokens"]; model: Provider.Model }) {
  if (input.cfg.compaction?.auto === false) return false
  if (input.model.limit.context === 0) return false

  const count =
    input.tokens.total || input.tokens.input + input.tokens.output + input.tokens.cache.read + input.tokens.cache.write
  return count >= usable(input) * (input.cfg.compaction?.threshold ?? 1)
}

export function pressureLevel(input: {
  cfg: Config.Info
  tokens: MessageV2.Assistant["tokens"]
  model: Provider.Model
}): 0 | 1 | 2 | 3 {
  if (input.cfg.compaction?.auto === false) return 0
  if (input.model.limit.context === 0) return 0

  const count =
    input.tokens.total || input.tokens.input + input.tokens.output + input.tokens.cache.read + input.tokens.cache.write
  const limit = usable(input)
  if (limit === 0) return 0

  const ratio = count / limit
  if (ratio < 0.50) return 0
  if (ratio < 0.70) return 1
  if (ratio < 0.85) return 2
  return 3
}

/** Context usage figures for the current window; `turnsLeft` projects from the average growth per turn. */
export function stats(input: {
  cfg: Config.Info
  model: Provider.Model
  /** Total context tokens after each finished turn, oldest first. */
  history: number[]
}) {
  const limit = usable(input)
  const used = input.history.at(-1) ?? 0
  const threshold = input.cfg.compaction?.threshold ?? 1
  const growth = input.history.length > 1 ? (used - input.history[0]) / (input.history.length - 1) : 0
  const trigger = limit * threshold
  return {
    used,
    limit,
    percent: limit ? Math.min(100, Math.round((used / limit) * 100)) : 0,
    compactAt: Math.round(trigger),
    turnsLeft: growth > 0 ? Math.max(0, Math.ceil((trigger - used) / growth)) : undefined,
  }
}
