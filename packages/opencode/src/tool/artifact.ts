import z from "zod"
import path from "path"
import fs from "fs/promises"
import { Effect } from "effect"
import { createTwoFilesPatch } from "diff"
import * as Tool from "./tool"
import { Instance } from "../project/instance"
import { assertWriteAllowed, askEditUnlessMemory } from "./external-directory"

export const ARTIFACTS = ["task", "implementation_plan", "walkthrough"] as const

const parameters = z.object({
  operation: z.enum(["write", "read", "list"]),
  name: z.enum(ARTIFACTS).optional().describe("task: live checklist. implementation_plan: before editing code. walkthrough: summary and proof when done."),
  content: z.string().optional().describe("Full markdown body. Required for write."),
  summary: z.string().max(200).optional().describe("One-line summary shown in clients. Required for write."),
})

const DESCRIPTION = [
  "Create and update session artifacts: durable markdown deliverables that the user reviews.",
  "Use `task` for a live checklist you update as work proceeds, `implementation_plan` before changing code on non-trivial work, and `walkthrough` when finished (what changed, how it was verified).",
  "Each write keeps the previous revision as <name>.rev.<n>.md. Artifacts live in .async-coder/artifacts/<session-id>/.",
].join("\n")

export type Meta = {
  kind: (typeof ARTIFACTS)[number]
  summary: string
  revision: number
  updatedAt: number
  review: "pending" | "approved" | "changes"
  comments: { at: number; text: string }[]
}

export const directory = (sessionID: string) => path.join(Instance.directory, ".async-coder", "artifacts", sessionID)

const readMeta = (file: string) =>
  fs
    .readFile(file, "utf8")
    .then((text) => JSON.parse(text) as Meta)
    .catch(() => undefined)

export const ArtifactTool = Tool.define(
  "artifact",
  Effect.succeed({
    description: DESCRIPTION,
    parameters,
    execute: (args: z.infer<typeof parameters>, ctx: Tool.Context): Effect.Effect<Tool.ExecuteResult> =>
      Effect.gen(function* () {
        const dir = directory(ctx.sessionID)
        if (args.operation === "list") {
          const names = yield* Effect.promise(() => fs.readdir(dir).catch(() => [] as string[]))
          const metas = yield* Effect.promise(() =>
            Promise.all(ARTIFACTS.filter((name) => names.includes(`${name}.md`)).map(async (name) => ({ name, meta: await readMeta(path.join(dir, `${name}.meta.json`)) }))),
          )
          return {
            title: "Artifacts",
            metadata: { artifacts: metas },
            output: metas.length
              ? metas.map((item) => `${item.name} (rev ${item.meta?.revision ?? 1}, review ${item.meta?.review ?? "pending"}): ${item.meta?.summary ?? ""}`).join("\n")
              : "No artifacts yet in this session.",
          }
        }
        if (!args.name) return { title: "Artifact", metadata: { error: true }, output: "name is required." }
        const file = path.join(dir, `${args.name}.md`)
        const metaFile = path.join(dir, `${args.name}.meta.json`)

        if (args.operation === "read") {
          const text = yield* Effect.promise(() => fs.readFile(file, "utf8").catch(() => undefined))
          return text === undefined
            ? { title: args.name, metadata: { missing: true }, output: `${args.name}.md does not exist yet.` }
            : { title: args.name, metadata: {}, output: text }
        }

        if (args.content === undefined || !args.summary) {
          return { title: args.name, metadata: { error: true }, output: "content and summary are required for write." }
        }
        yield* assertWriteAllowed(ctx, file)
        const before = yield* Effect.promise(() => fs.readFile(file, "utf8").catch(() => ""))
        yield* askEditUnlessMemory(ctx, file, {
          patterns: [path.relative(Instance.directory, file)],
          diff: createTwoFilesPatch(file, file, before, args.content),
        })
        const meta = yield* Effect.promise(async () => {
          await fs.mkdir(dir, { recursive: true })
          const previous = await readMeta(metaFile)
          const revision = (previous?.revision ?? 0) + 1
          if (before) await fs.writeFile(path.join(dir, `${args.name}.rev.${revision - 1}.md`), before, "utf8")
          await fs.writeFile(file, args.content!, "utf8")
          const next: Meta = {
            kind: args.name!,
            summary: args.summary!,
            revision,
            updatedAt: Date.now(),
            // A new revision of a reviewed artifact needs review again.
            review: "pending",
            comments: previous?.comments ?? [],
          }
          await fs.writeFile(metaFile, JSON.stringify(next, null, 2), "utf8")
          return next
        })
        return {
          title: path.relative(Instance.directory, file),
          metadata: { revision: meta.revision, review: meta.review },
          output: `Saved ${args.name}.md (revision ${meta.revision}).`,
        }
      }).pipe(Effect.orDie),
  }),
)
