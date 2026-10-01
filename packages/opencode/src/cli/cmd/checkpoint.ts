import { cmd } from "./cmd"
import { bootstrap } from "../bootstrap"
import { Checkpoint } from "@/checkpoint"
import { SessionID } from "@/session/schema"

export const CheckpointCommand = cmd({
  command: "checkpoint <action> <sessionID> [id]",
  describe: "save, list and restore file and conversation checkpoints",
  builder: (yargs) => yargs
    .positional("action", { type: "string", choices: ["create", "list", "restore"], demandOption: true })
    .positional("sessionID", { type: "string", demandOption: true })
    .positional("id", { type: "string" })
    .option("description", { type: "string" })
    .option("files", { type: "array", string: true, describe: "file paths owned by this checkpoint" })
    .option("all-files", { type: "boolean", default: false, describe: "restore every changed tracked snapshot file, including manual changes" }),
  handler: async (args) => {
    await bootstrap(process.cwd(), async () => {
      const sessionID = SessionID.make(args.sessionID)
      const result = args.action === "create"
        ? await Checkpoint.create({ sessionID, description: args.description, files: args.files })
        : args.action === "restore"
          ? args.id ? await Checkpoint.restore({ sessionID, id: args.id, files: args.files, allFiles: args.allFiles }) : (() => { throw new Error("Checkpoint id required for restore") })()
          : Checkpoint.list(sessionID).map(({ conversation, ...row }) => ({ ...row, messages: conversation.length }))
      process.stdout.write(JSON.stringify(result, null, 2) + "\n")
    })
  },
})
