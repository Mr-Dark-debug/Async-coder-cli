import z from "zod"
import { Effect } from "effect"
import * as Tool from "./tool"
import { Checkpoint } from "@/checkpoint"
import { InstanceState } from "@/effect"
import { Instance } from "@/project/instance"

const parameters = z.object({ action: z.enum(["create", "list"]), description: z.string().optional(), files: z.array(z.string()).optional() })

export const CheckpointTool = Tool.define("checkpoint", Effect.succeed({
  description: "Create or list named file and conversation checkpoints. Rewind is available through the checkpoint CLI after stopping the running agent. Snapshots exclude ignored and large files.",
  parameters,
  execute: (args: z.infer<typeof parameters>, ctx: Tool.Context) => Effect.gen(function* () {
    const instance = yield* InstanceState.context
    const output = yield* Effect.promise(() => Instance.restore(instance, async () => {
      if (args.action === "list") return JSON.stringify(Checkpoint.list(ctx.sessionID).map(({ conversation, ...row }) => ({ ...row, messages: conversation.length })), null, 2)
      const { conversation, ...row } = await Checkpoint.create({ sessionID: ctx.sessionID, description: args.description, files: args.files })
      return JSON.stringify({ ...row, messages: conversation.length }, null, 2)
    }))
    return { title: `Checkpoint ${args.action}`, metadata: {}, output }
  }),
}))
