import { Config } from "@/config"
import { Provider } from "@/provider"
import { spawnRef } from "@/actor/spawn-ref"
import { Deferred, Effect } from "effect"
import z from "zod"
import DESCRIPTION from "./consult.txt"
import { RecoverableError } from "./recoverable"
import * as Tool from "./tool"

export const ConsultParameters = z.strictObject({
  question: z.string().min(1).max(2_000).describe("The precise uncertainty or decision to review."),
  context: z
    .string()
    .min(1)
    .max(12_000)
    .describe("Concise relevant facts, current approach, constraints, and alternatives. Exclude secrets."),
})

export const ConsultResult = z.strictObject({
  recommendation: z.string(),
  reasoning: z.array(z.string()),
  risks: z.array(z.string()),
  alternatives: z.array(z.string()),
})

const claimed = new Map<string, string>()

export function claimConsultation(sessionID: string, messageID: string) {
  if (claimed.get(sessionID) === messageID) return false
  claimed.set(sessionID, messageID)
  return true
}

export function releaseConsultation(sessionID: string, messageID: string) {
  if (claimed.get(sessionID) !== messageID) return
  claimed.delete(sessionID)
}

export const ConsultTool = Tool.define(
  "consult",
  Effect.gen(function* () {
    const config = yield* Config.Service
    const provider = yield* Provider.Service

    return {
      description: DESCRIPTION,
      parameters: ConsultParameters,
      execute: (input: z.infer<typeof ConsultParameters>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          const cfg = yield* config.get()
          if (!cfg.advisor) {
            return yield* Effect.fail(
              new RecoverableError("Sage is not configured. Ask the user to run /consult or /sage-model first."),
            )
          }

          const model = yield* provider
            .resolveModelRef(cfg.advisor.model)
            .pipe(
              Effect.mapError(
                (error) =>
                  new RecoverableError(
                    `The configured Sage model ${cfg.advisor!.model} is unavailable. Ask the user to run /sage-model.`,
                    { cause: error },
                  ),
              ),
            )
          if (cfg.advisor.variant && !model.variants?.[cfg.advisor.variant]) {
            return yield* Effect.fail(
              new RecoverableError(
                `The Sage reasoning level ${cfg.advisor.variant} is unavailable for ${cfg.advisor.model}. Ask the user to run /sage-model.`,
              ),
            )
          }
          if (!claimConsultation(ctx.sessionID, ctx.messageID)) {
            return yield* Effect.fail(
              new RecoverableError("Sage was already consulted during this assistant turn. Use the existing advice."),
            )
          }

          const actor = spawnRef.current
          if (!actor) {
            releaseConsultation(ctx.sessionID, ctx.messageID)
            return yield* Effect.fail(new Error("Actor service unavailable for Sage consultation"))
          }

          let actorID: string | undefined
          const cancel = () => {
            if (!actorID) return
            Effect.runFork(actor.cancel(ctx.sessionID, actorID, "graceful"))
          }
          const outcome = yield* Effect.acquireUseRelease(
            Effect.sync(() => {
              ctx.abort.addEventListener("abort", cancel)
            }),
            () =>
              actor
                .spawn({
                  mode: "subagent",
                  sessionID: ctx.sessionID,
                  parentActorID: ctx.actorID,
                  agentType: "advisor",
                  description: "Sage consultation",
                  task: [
                    "<question>",
                    input.question,
                    "</question>",
                    "",
                    "<untrusted-context>",
                    input.context,
                    "</untrusted-context>",
                  ].join("\n"),
                  context: "none",
                  tools: [],
                  model: { providerID: model.providerID, modelID: model.id },
                  background: true,
                  notify: false,
                  onActorID: (id) => {
                    actorID = id
                    if (ctx.abort.aborted) cancel()
                  },
                  format: {
                    type: "json_schema",
                    retryCount: 2,
                    schema: {
                      type: "object",
                      additionalProperties: false,
                      required: ["recommendation", "reasoning", "risks", "alternatives"],
                      properties: {
                        recommendation: { type: "string" },
                        reasoning: { type: "array", items: { type: "string" } },
                        risks: { type: "array", items: { type: "string" } },
                        alternatives: { type: "array", items: { type: "string" } },
                      },
                    },
                  },
                })
                .pipe(
                  Effect.flatMap((spawned) => Deferred.await(spawned.outcome)),
                  Effect.timeout(300_000),
                  Effect.catchTag("TimeoutError", () => {
                    cancel()
                    return Effect.fail(new RecoverableError("Sage consultation timed out after five minutes."))
                  }),
                ),
            () =>
              Effect.sync(() => {
                ctx.abort.removeEventListener("abort", cancel)
              }),
          ).pipe(
            Effect.tapError(() =>
              Effect.sync(() => {
                releaseConsultation(ctx.sessionID, ctx.messageID)
              }),
            ),
          )

          if (outcome.status === "failure") {
            releaseConsultation(ctx.sessionID, ctx.messageID)
            return yield* Effect.fail(new Error(`Sage consultation failed: ${outcome.error}`))
          }
          if (outcome.status === "cancelled") {
            releaseConsultation(ctx.sessionID, ctx.messageID)
            return yield* Effect.fail(new RecoverableError("Sage consultation was cancelled."))
          }
          const result = ConsultResult.safeParse(outcome.structured)
          if (!result.success) {
            releaseConsultation(ctx.sessionID, ctx.messageID)
            return yield* Effect.fail(
              new RecoverableError(`Sage returned an invalid response: ${z.prettifyError(result.error)}`),
            )
          }
          return {
            title: "Sage consultation",
            metadata: {
              actorId: actorID,
              model: { providerID: model.providerID, modelID: model.id, variant: cfg.advisor.variant },
            },
            output: JSON.stringify(result.data),
          }
        }).pipe(Effect.orDie),
    }
  }),
)
