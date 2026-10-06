export * as Jobs from "./index"

import z from "zod"
import { Effect } from "effect"
import { BusEvent } from "@/bus/bus-event"
import { Instance } from "@/project/instance"
import { Log } from "@/util"
import * as Store from "./store"
import * as Notify from "./notify"
import { name, slug, terminal } from "./state"
import { spentInSession, tokensInSession } from "@/usage/budget"
import * as Verify from "./verify"
import type { SessionID } from "@/session/schema"
import { changeSummary, commitAll } from "./git"
import * as Sage from "@/sage/pipeline"

const log = Log.create({ service: "jobs" })

export { Store }

export const Event = {
  Updated: BusEvent.define("job.updated", z.object({ jobID: z.string(), status: z.string(), name: z.string() })),
  Notify: BusEvent.define(
    "job.notify",
    z.object({ jobID: z.string(), title: z.string(), status: z.string(), sequences: z.string() }),
  ),
}

type Live = {
  sessionID?: SessionID
  reason?: "user" | "budget"
  directory: string
  worktree: boolean
  sageSpent?: number
  abort: AbortController
  done?: Promise<void>
}
const live = new Map<string, Live>()

export const alive = () => new Set(live.keys())

export type StartInput = {
  prompt: string
  agent?: string
  model?: string
  budget_usd?: number
  worktree?: boolean
  team_id?: string
  role?: string
  /** Gate commands that must all pass (run in the job directory) before the job counts as done. */
  verify?: string[]
  /** How many times a failing gate is fed back to the agent for another attempt. */
  verify_retries?: number
}

/** Create a job and run it detached in this process. Returns immediately with the queued job. */
export async function start(input: StartInput) {
  const { AppRuntime } = await import("@/effect/app-runtime")
  const { Worktree } = await import("@/worktree")
  const { InstanceBootstrap } = await import("@/project/bootstrap")

  const info = input.worktree
    ? await AppRuntime.runPromise(Worktree.Service.use((svc) => svc.create({ name: `job-${slug(input.prompt)}` })))
    : undefined
  const job = Store.create({
    name: name(input.prompt),
    prompt: input.prompt,
    agent: input.agent,
    model: input.model,
    budget_usd: input.budget_usd,
    directory: info?.directory ?? Instance.directory,
    branch: info?.branch,
    team_id: input.team_id,
    role: input.role,
    verify: input.verify,
    verify_retries: input.verify_retries,
  })
  const state: Live = { directory: job.directory!, worktree: !!info, abort: new AbortController() }
  live.set(job.id, state)

  // Detached: the caller does not await the run.
  state.done = Instance.provide({
    directory: job.directory!,
    init: () => AppRuntime.runPromise(InstanceBootstrap),
    fn: () => AppRuntime.runPromise(run(job.id)),
  })
    .then(() => undefined)
    .catch((error) => {
      log.error("job crashed", { jobID: job.id, error: String(error) })
      if (!terminal(Store.get(job.id)?.status ?? "failed"))
        Store.move(job.id, state.reason === "user" ? "cancelled" : "failed", {
          error: state.reason === "user" ? "Cancelled by user" : String(error),
        })
      live.delete(job.id)
    })
  return job
}

const publish = (jobID: string) =>
  Effect.gen(function* () {
    const job = Store.get(jobID)
    if (!job) return
    const { Bus } = yield* Effect.promise(() => import("@/bus"))
    yield* Bus.Service.use((bus) => bus.publish(Event.Updated, { jobID, status: job.status, name: job.name }))
  }).pipe(Effect.ignore)

const run = (jobID: string) =>
  Effect.gen(function* () {
    const { Session } = yield* Effect.promise(() => import("@/session"))
    const { SessionPrompt } = yield* Effect.promise(() => import("@/session/prompt"))
    const { Config } = yield* Effect.promise(() => import("@/config"))
    const { Bus } = yield* Effect.promise(() => import("@/bus"))
    const sessions = yield* Session.Service
    const prompts = yield* SessionPrompt.Service
    const cfg = yield* Config.Service
    const job = Store.get(jobID)!
    const state = live.get(jobID)!
    const cancelled = () => state.reason === "user"

    if (cancelled()) {
      Store.move(jobID, "cancelled", { error: "Cancelled by user" })
      live.delete(jobID)
      yield* publish(jobID)
      return
    }

    Store.move(jobID, "running")
    const session = yield* sessions.create({ title: `[job] ${job.name}` })
    state.sessionID = session.id
    Store.patch(jobID, { session_id: session.id })
    yield* publish(jobID)

    // "provider/model" is a literal; anything else is a tier, group or capability alias (fast, cheap, local, ...).
    const { Provider: Providers } = yield* Effect.promise(() => import("@/provider"))
    const model = !job.model
      ? {}
      : job.model.includes("/")
        ? { model: Providers.parseModel(job.model) }
        : { modelRef: job.model }
    const work = cancelled()
      ? Effect.succeed(undefined)
      : prompts.prompt({
          sessionID: session.id,
          agent: job.agent ?? undefined,
          ...model,
          parts: [{ type: "text", text: job.prompt }],
        })

    // Per-job budget: poll the session's spend and cancel the turn when it is exhausted.
    const watch = Effect.gen(function* () {
      while (true) {
        yield* Effect.sleep("2 seconds")
        if (cancelled()) return undefined
        const spent = spentInSession(session.id)
        Store.patch(jobID, { cost_usd: spent })
        if (job.budget_usd && spent >= job.budget_usd) {
          state.reason = "budget"
          yield* prompts.cancel(session.id)
          return undefined
        }
      }
    })

    const result = yield* Effect.exit(Effect.race(work, watch))
    Store.patch(jobID, { cost_usd: spentInSession(session.id) })

    if (state.reason === "user") Store.move(jobID, "cancelled", { error: "Cancelled by user" })
    else if (state.reason === "budget")
      Store.move(jobID, "failed", { error: `Budget of $${job.budget_usd} reached; the job was stopped` })
    else if (result._tag === "Failure") Store.move(jobID, "failed", { error: String(result.cause) })
    else if (result.value?.info.role === "assistant" && result.value.info.error)
      Store.move(jobID, "failed", {
        error: String((result.value.info.error as { data?: { message?: string } }).data?.message ?? "Model error"),
      })
    else {
      const text = (reply: typeof result.value) =>
        reply?.parts.flatMap((part) => (part.type === "text" && !part.synthetic ? [part.text] : [])).join("\n")
      let summary = text(result.value)
      let outcome = job.verify?.length
        ? yield* Effect.promise(() => Verify.run(job.verify!, state.directory, 1, state.abort.signal))
        : undefined

      // Sage 2.0: the deterministic gate has run; a model only reviews when the gate failed or the change is risky.
      const full = yield* cfg.get()
      let sageSpent = 0
      const exhausted = () => {
        if (!job.budget_usd || spentInSession(session.id) + sageSpent < job.budget_usd) return false
        state.reason = "budget"
        return true
      }
      const review = (reason: string) =>
        Effect.gen(function* () {
          if (state.reason || exhausted()) return undefined
          if (!full.advisor || !Sage.affordable({ cfg: full.sage, budget: job.budget_usd, spent: sageSpent }))
            return undefined
          const { Provider } = yield* Effect.promise(() => import("@/provider"))
          const providers = yield* Provider.Service
          const advisor = yield* providers.resolveModelRef(full.advisor.model)
          const change = yield* Effect.tryPromise(() => changeSummary(state.directory)).pipe(
            Effect.catch(() => Effect.succeed({ files: [] as string[], lines: 0 })),
          )
          const gate = outcome?.gates.find((item) => item.code !== 0)
          const sageSession = yield* sessions.create({ title: `[sage] ${job.name}` })
          state.sessionID = sageSession.id
          const reply = yield* prompts
            .prompt({
              sessionID: sageSession.id,
              agent: "advisor",
              model: { providerID: advisor.providerID, modelID: advisor.id },
              parts: [{ type: "text", text: Sage.critiquePrompt({ task: job.prompt, reason, gate, change }) }],
            })
            .pipe(
              Effect.ensuring(
                Effect.sync(() => {
                  state.sessionID = session.id
                }),
              ),
            )
          const cost = spentInSession(sageSession.id)
          sageSpent += cost
          Store.recordSage({ job_id: jobID, stage: "critique", reason, session_id: sageSession.id, cost_usd: cost })
          return text(reply)
        }).pipe(
          Effect.catch((error) =>
            Effect.sync(() => {
              log.warn("sage review failed", { jobID, error: String(error) })
              return undefined
            }),
          ),
        )

      const stage = (gate: "pass" | "fail" | "none") =>
        Effect.gen(function* () {
          if (!full.sage?.enabled) return { type: "none" } as const
          const change = yield* Effect.tryPromise(() => changeSummary(state.directory)).pipe(
            Effect.catch(() => Effect.succeed({ files: [] as string[], lines: 0 })),
          )
          return Sage.plan({
            cfg: full.sage,
            gate,
            risk: Sage.risk({ change, failures: outcome && !outcome.pass ? 1 : 0 }),
          })
        })

      // A failing gate is fed back to the same session so the agent can fix it, up to verify_retries times.
      for (let attempt = 1; outcome && !outcome.pass && attempt <= job.verify_retries && !state.reason; attempt++) {
        if (exhausted()) break
        const planned = yield* stage("fail")
        const critique = planned.type === "critique" ? yield* review(planned.reason) : undefined
        if (state.reason || exhausted()) break
        const again = yield* Effect.exit(
          Effect.race(
            prompts.prompt({
              sessionID: session.id,
              agent: job.agent ?? undefined,
              ...model,
              parts: [{ type: "text", text: Verify.retryPrompt(outcome, critique) }],
            }),
            watch,
          ),
        )
        if (again._tag === "Failure") break
        summary = text(again.value)
        if (state.reason) break
        outcome = yield* Effect.promise(() => Verify.run(job.verify!, state.directory, attempt + 1, state.abort.signal))
      }
      if (state.reason === "user")
        Store.move(jobID, "cancelled", { error: "Cancelled by user", verify_result: outcome, result: summary })
      else if (state.reason === "budget")
        Store.move(jobID, "failed", {
          error: `Budget of $${job.budget_usd} reached; the job was stopped`,
          verify_result: outcome,
          result: summary,
        })
      else if (outcome && !outcome.pass) {
        const failed = outcome.gates.find((gate) => gate.code !== 0)
        Store.move(jobID, "failed", {
          verify_result: outcome,
          result: summary,
          error: `Verification failed: ${failed?.command} exited ${failed?.code}`,
        })
      } else {
        // Green gate (or none): only a high-risk change earns a review, and it is informational.
        const planned = yield* stage(outcome ? "pass" : "none")
        const critique = planned.type === "critique" ? yield* review(planned.reason) : undefined
        Store.move(jobID, state.reason === "user" ? "cancelled" : state.reason === "budget" ? "failed" : "done", {
          error:
            state.reason === "user"
              ? "Cancelled by user"
              : state.reason === "budget"
                ? `Budget of $${job.budget_usd} reached; the job was stopped`
                : undefined,
          verify_result: outcome,
          result: critique
            ? `${summary}\n\nSage review (${planned.type === "critique" ? planned.reason : ""}):\n${critique}`
            : summary,
        })
      }
      state.sageSpent = sageSpent
    }
    const used = tokensInSession(session.id)
    const spent = spentInSession(session.id) + (state.sageSpent ?? 0)
    Store.patch(jobID, { cost_usd: spent, tokens_in: used.input, tokens_out: used.output })
    // A single model call can overshoot the cap before spend is visible; say so on the finished job.
    if (job.budget_usd && spent > job.budget_usd && Store.get(jobID)?.status === "done")
      Store.patch(jobID, { error: `Over budget: spent $${spent.toFixed(4)} of $${job.budget_usd}` })

    // A finished worktree job leaves its work committed on its branch so it can be reviewed and merged.
    if (state.worktree && Store.get(jobID)?.status === "done")
      yield* Effect.tryPromise(() => commitAll(state.directory, `job: ${job.name}`)).pipe(
        Effect.catch((error) => Effect.sync(() => log.warn("auto-commit failed", { jobID, error: String(error) }))),
      )

    live.delete(jobID)
    yield* publish(jobID)

    const final = Store.get(jobID)!
    const quietHours = (yield* cfg.get()).notification?.quiet_hours
    if (Notify.shouldNotify({ notified: final.notified, status: final.status, quietHours })) {
      Store.patch(jobID, { notified: true })
      yield* Bus.Service.use((bus) =>
        bus.publish(Event.Notify, {
          jobID,
          title: final.name,
          status: final.status,
          sequences: Notify.sequences({ title: final.name, status: final.status }),
        }),
      ).pipe(Effect.ignore)
    }
  })

/** Cancel a queued or running job. A cancelled worktree job has its worktree removed. */
export async function cancel(jobID: string) {
  const job = Store.get(jobID)
  if (!job) throw new Error(`Job not found: ${jobID}`)
  if (terminal(job.status)) return job
  const state = live.get(jobID)
  if (!state) return Store.move(jobID, "cancelled", { error: "Cancelled by user" })
  state.reason = "user"
  state.abort.abort()
  const { AppRuntime } = await import("@/effect/app-runtime")
  const { SessionPrompt } = await import("@/session/prompt")
  if (state.sessionID) {
    const sessionID = state.sessionID
    await Instance.provide({
      directory: state.directory,
      fn: () => AppRuntime.runPromise(SessionPrompt.Service.use((svc) => svc.cancel(sessionID))),
    }).catch((error) => log.warn("cancel failed", { jobID, error: String(error) }))
  }
  await state.done
  if (state.worktree) {
    const { Worktree } = await import("@/worktree")
    await AppRuntime.runPromise(Worktree.Service.use((svc) => svc.remove({ directory: state.directory }))).catch(
      (error) => log.warn("worktree cleanup failed", { jobID, error: String(error) }),
    )
  }
  return Store.get(jobID)!
}

/** Fail jobs whose server process died. Call once at startup. */
export const recover = () => Store.reapOrphans(alive())
