export * as Routines from "./index"

import { Instance } from "@/project/instance"
import { Log } from "@/util"
import type { ConfigRoutines } from "@/config/routines"
import { matches, parse } from "./cron"
import { registerDisposer } from "@/effect/instance-registry"

const log = Log.create({ service: "routines" })

export type Config = ConfigRoutines.Info

/** Names of routines that should fire at `now`, skipping any that already fired in this same minute. */
export function due(routines: Config | undefined, now: Date, fired: Map<string, number>) {
  const minute = Math.floor(now.getTime() / 60_000)
  return Object.entries(routines ?? {}).flatMap(([name, routine]) => {
    if (routine.enabled === false) return []
    if (fired.get(name) === minute) return []
    try {
      if (!matches(parse(routine.cron), now)) return []
    } catch (error) {
      log.warn("invalid routine schedule", { name, error: String(error) })
      return []
    }
    fired.set(name, minute)
    return [name]
  })
}

/** Validate every schedule up front so a typo is reported at load rather than silently never firing. */
export function problems(routines: Config | undefined) {
  return Object.entries(routines ?? {}).flatMap(([name, routine]) => {
    try {
      parse(routine.cron)
      return []
    } catch (error) {
      return [`${name}: ${error instanceof Error ? error.message : String(error)}`]
    }
  })
}

const timers = new Map<string, ReturnType<typeof setInterval>>()

/**
 * Start the scheduler for the current project: every 20 seconds, routines whose cron matches the
 * current minute are started as background jobs, inheriting the job defaults (worktree isolation,
 * gates, budget). A routine fires at most once per minute.
 */
export async function arm() {
  const directory = Instance.directory
  const { Config } = await import("@/config")
  const { AppRuntime } = await import("@/effect/app-runtime")
  const initial = (await AppRuntime.runPromise(Config.Service.use((svc) => svc.get()))).routines
  const bad = problems(initial)
  for (const line of bad) log.warn("routine ignored", { problem: line })
  if (!initial || Object.keys(initial).length === 0 || timers.has(directory)) return
  const fired = new Map<string, number>()
  const tick = Instance.bind(async () => {
    if (timers.get(directory) !== timer) return
    const routines = (await AppRuntime.runPromise(Config.Service.use((svc) => svc.get()))).routines
    const { Jobs } = await import("@/jobs")
    if (timers.get(directory) !== timer) return
    for (const name of due(routines, new Date(), fired)) {
      if (timers.get(directory) !== timer) return
      const routine = routines![name]
      log.info("routine firing", { name })
      await Jobs.start({
        prompt: routine.prompt,
        agent: routine.agent,
        model: routine.model,
        budget_usd: routine.budget_usd,
        worktree: routine.worktree ?? true,
        verify: routine.verify ? [...routine.verify] : undefined,
        verify_retries: routine.verify_retries,
      }).catch((error) => log.error("routine failed to start", { name, error: String(error) }))
    }
  })
  const timer = setInterval(
    () => void tick().catch((error) => log.error("routine tick failed", { error: String(error) })),
    20_000,
  )
  timer.unref?.()
  timers.set(directory, timer)
}

export function disarm(directory?: string) {
  for (const [dir, timer] of timers) {
    if (directory && dir !== directory) continue
    clearInterval(timer)
    timers.delete(dir)
  }
}

registerDisposer(async (directory) => disarm(directory))
