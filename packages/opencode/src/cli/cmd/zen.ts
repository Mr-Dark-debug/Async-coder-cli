import { Effect } from "effect"
import { cmd } from "./cmd"
import { Instance } from "@/project/instance"
import { AppRuntime } from "@/effect/app-runtime"
import { ModelsDev, Provider } from "@/provider"
import { Zen } from "@/zen"

export const ZenCommand = cmd({
  command: "zen",
  describe: "list available free models or recommend a model for a task",
  builder: (yargs) => yargs
    .option("task", { type: "string", choices: ["coding", "review", "planning", "writing", "quick"] as const, default: "coding" as const })
    .option("all", { type: "boolean", default: false, describe: "include paid models in recommendations" })
    .option("context", { type: "number", default: 0, describe: "minimum context window in tokens" })
    .option("input", { type: "number", default: 0, describe: "input tokens for cost estimate" })
    .option("output", { type: "number", default: 0, describe: "output tokens for cost estimate" })
    .option("json", { type: "boolean", default: false }),
  handler: async (args) => {
    await Instance.provide({ directory: process.cwd(), fn: () => AppRuntime.runPromise(Effect.gen(function* () {
      const provider = yield* Provider.Service
      const providers = yield* provider.list()
      const catalog = yield* Effect.promise(() => ModelsDev.get())
      const free = Zen.list(providers, catalog)
      const models = Zen.recommend(args.all ? Object.values(providers).flatMap((item) => Object.values(item.models)) : free.map((item) => item.model), { task: args.task, context: args.context })
      const results = models.map((model) => ({
        id: `${model.providerID}/${model.id}`, name: model.name, context: model.limit.context,
        inputPerMillion: model.cost.input, outputPerMillion: model.cost.output,
        estimatedCost: Zen.estimate(model, args.input, args.output),
        authentication: free.find((item) => item.model === model)?.authentication ?? "Provider credentials required",
      }))
      process.stdout.write(args.json ? JSON.stringify(results, null, 2) + "\n" : results.map((item) => `${item.id} | ${item.context} context | $${item.inputPerMillion}/M in, $${item.outputPerMillion}/M out | estimate $${item.estimatedCost.toFixed(6)} | ${item.authentication}`).join("\n") + "\n")
      if (!results.length) process.stderr.write("No matching free models are available. Connect a provider, refresh models, use a local Ollama model, or use --all for paid recommendations.\n")
    })) })
  },
})
