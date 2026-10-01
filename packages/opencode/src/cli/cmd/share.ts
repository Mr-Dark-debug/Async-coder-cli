import path from "node:path"
import { cmd } from "./cmd"
import { bootstrap } from "../bootstrap"
import { SessionExport } from "@/share/export"
import { SessionImport } from "@/share/import"
import { SessionID } from "@/session/schema"

export const ShareExportCommand = cmd({
  command: "share <sessionID>",
  describe: "export a self-contained read-only offline HTML or JSON session",
  builder: (yargs) => yargs
    .positional("sessionID", { type: "string", demandOption: true })
    .option("format", { type: "string", choices: ["html", "json"], default: "html" })
    .option("output", { type: "string", describe: "destination file (transcript may contain private data)" }),
  handler: async (args) => bootstrap(process.cwd(), async () => {
    const document = await SessionExport.collect(SessionID.make(args.sessionID))
    const destination = path.resolve(args.output ?? `${args.sessionID}.${args.format}`)
    if (await Bun.file(destination).exists()) throw new Error(`Export destination already exists: ${destination}`)
    await Bun.write(destination, args.format === "json" ? SessionExport.json(document) : SessionExport.html(document))
    process.stdout.write(destination + "\n")
  }),
})

export const ShareViewCommand = cmd({
  command: "share-view <file>",
  describe: "validate and view an offline JSON session without executing tools",
  builder: (yargs) => yargs.positional("file", { type: "string", demandOption: true }),
  handler: async (args) => {
    const document = SessionImport.read(await Bun.file(args.file).text())
    process.stdout.write(SessionExport.html(document))
  },
})
