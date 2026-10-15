import z from "zod"
import path from "path"
import fs from "fs/promises"
import { Effect } from "effect"
import { createTwoFilesPatch } from "diff"
import * as Tool from "./tool"
import { Instance } from "../project/instance"
import { Spec } from "../spec"
import { assertWriteAllowed, askEditUnlessMemory } from "./external-directory"

const parameters = z.object({
  operation: z.enum(["list", "read", "write", "tasks", "ready", "complete"]),
  name: z.string().optional().describe("Spec name: lowercase letters, digits and hyphens (for example user-auth)."),
  doc: z.enum(Spec.DOCS).optional().describe("requirements, design or tasks. Required for read and write."),
  content: z.string().optional().describe("Full markdown body. Required for write."),
  task_id: z.string().optional().describe("Task id such as 2 or 2.1. Required for complete."),
})

const DESCRIPTION = [
  "Manage a spec-driven workflow stored in .async-coder/specs/<name>/{requirements,design,tasks}.md.",
  "The documents are ordered: write requirements first, then design, then tasks. Writing a document before the ones it depends on is refused.",
  "requirements.md: user stories with acceptance criteria in the form `WHEN <event> THEN the system SHALL <response>`, numbered 1.1, 1.2.",
  "design.md: architecture, components and interfaces, data models, error handling and testing strategy.",
  "tasks.md: at most two levels, `- [ ] 1.1 Title`, with `_Requirements: 1.1_` and optional `_Depends: 1.1_` lines under the task. Mark optional test sub-tasks with a `*` after the checkbox: `- [ ]* 1.2 Write tests`.",
  "Operations: list specs; read a document; write a document; tasks (parsed task list with progress); ready (tasks that can run now, including parallel waves); complete (mark a task done).",
].join("\n")

const root = () => path.join(Instance.directory, ".async-coder", "specs")

const exists = (file: string) =>
  fs.access(file).then(
    () => true,
    () => false,
  )

const result = (title: string, output: string, metadata: Record<string, unknown> = {}) => ({ title, output, metadata })

export const SpecTool = Tool.define(
  "spec",
  Effect.succeed({
    description: DESCRIPTION,
    parameters,
    execute: (args: z.infer<typeof parameters>, ctx: Tool.Context): Effect.Effect<Tool.ExecuteResult> =>
      Effect.gen(function* () {
        if (args.operation === "list") {
          const names = yield* Effect.promise(() => fs.readdir(root()).catch(() => [] as string[]))
          const rows = yield* Effect.promise(() =>
            Promise.all(
              names
                .filter((name) => Spec.NAME.test(name))
                .map(async (name) => {
                  const docs = (await Promise.all(Spec.DOCS.map(async (doc) => ((await exists(path.join(root(), name, `${doc}.md`))) ? doc : undefined)))).filter(
                    (doc): doc is Spec.Doc => !!doc,
                  )
                  const tasks = docs.includes("tasks")
                    ? Spec.progress(Spec.parseTasks(await fs.readFile(path.join(root(), name, "tasks.md"), "utf8")))
                    : undefined
                  return { name, docs, tasks }
                }),
            ),
          )
          if (!rows.length) return result("Specs", "No specs yet. Write requirements first with operation=write.")
          return result(
            "Specs",
            rows.map((row) => `${row.name}: ${row.docs.join(", ") || "empty"}${row.tasks ? ` (${row.tasks.done}/${row.tasks.total} tasks done)` : ""}`).join("\n"),
            { specs: rows },
          )
        }

        if (!args.name || !Spec.NAME.test(args.name)) {
          return result("Spec", "name is required and must match [a-z0-9][a-z0-9-]* (max 63 characters).", { error: true })
        }
        const dir = path.join(root(), args.name)
        const file = (doc: Spec.Doc) => path.join(dir, `${doc}.md`)
        const present = yield* Effect.promise(async () => {
          const found = await Promise.all(Spec.DOCS.map(async (doc) => ((await exists(file(doc))) ? doc : undefined)))
          return new Set(found.filter((doc): doc is Spec.Doc => !!doc))
        })

        if (args.operation === "read") {
          if (!args.doc) return result("Spec", "doc is required for read.", { error: true })
          if (!present.has(args.doc)) return result(`${args.name}/${args.doc}`, `${args.doc}.md does not exist yet.`, { missing: true })
          const text = yield* Effect.promise(() => fs.readFile(file(args.doc!), "utf8"))
          return result(`${args.name}/${args.doc}`, text)
        }

        if (args.operation === "write") {
          if (!args.doc || args.content === undefined) return result("Spec", "doc and content are required for write.", { error: true })
          const guard = Spec.canWrite(args.doc, present)
          if (!guard.ok) return result(`${args.name}/${args.doc}`, guard.reason, { refused: true })
          const target = file(args.doc)
          yield* assertWriteAllowed(ctx, target)
          const before = present.has(args.doc) ? yield* Effect.promise(() => fs.readFile(target, "utf8")) : ""
          yield* askEditUnlessMemory(ctx, target, {
            patterns: [path.relative(Instance.directory, target)],
            diff: createTwoFilesPatch(target, target, before, args.content),
          })
          yield* Effect.promise(async () => {
            await fs.mkdir(dir, { recursive: true })
            await fs.writeFile(target, args.content!, "utf8")
          })
          const notes = args.doc === "tasks" ? `Parsed ${Spec.parseTasks(args.content).length} tasks.` : ""
          return result(`${args.name}/${args.doc}`, `Saved ${path.relative(Instance.directory, target)}. ${notes}`.trim(), { path: target })
        }

        if (!present.has("tasks")) return result(args.name, "tasks.md does not exist yet.", { missing: true })
        const tasksFile = file("tasks")
        const markdown = yield* Effect.promise(() => fs.readFile(tasksFile, "utf8"))
        const tasks = Spec.parseTasks(markdown)

        if (args.operation === "tasks") {
          const progress = Spec.progress(tasks)
          const requirements = present.has("requirements")
            ? Spec.uncovered(Spec.requirementIds(yield* Effect.promise(() => fs.readFile(file("requirements"), "utf8"))), tasks)
            : []
          const lines = tasks.map((task) => `${task.done ? "[x]" : "[ ]"}${task.optional ? "*" : ""} ${task.id} ${task.title}${task.depends.length ? ` (after ${task.depends.join(", ")})` : ""}`)
          return result(
            `${args.name} tasks`,
            [`${progress.done}/${progress.total} required tasks done`, ...lines, requirements.length ? `Requirements without a task: ${requirements.join(", ")}` : ""].filter(Boolean).join("\n"),
            { progress, uncovered: requirements },
          )
        }

        if (args.operation === "ready") {
          const next = Spec.ready(tasks)
          return result(
            `${args.name} ready`,
            next.length ? next.map((task) => `${task.id} ${task.title}`).join("\n") : "No runnable tasks (all done, or waiting on dependencies).",
            { ready: next.map((task) => task.id) },
          )
        }

        // complete
        if (!args.task_id) return result("Spec", "task_id is required for complete.", { error: true })
        const task = tasks.find((item) => item.id === args.task_id)
        if (!task) return result(args.name, `No task ${args.task_id} in tasks.md.`, { error: true })
        if (task.done) return result(args.name, `Task ${task.id} is already done.`)
        const blocked = task.depends.filter((dep) => !tasks.find((item) => item.id === dep)?.done)
        if (blocked.length) return result(args.name, `Task ${task.id} depends on unfinished tasks: ${blocked.join(", ")}.`, { refused: true })
        const next = Spec.complete(markdown, task.id)
        yield* assertWriteAllowed(ctx, tasksFile)
        yield* askEditUnlessMemory(ctx, tasksFile, {
          patterns: [path.relative(Instance.directory, tasksFile)],
          diff: createTwoFilesPatch(tasksFile, tasksFile, markdown, next),
        })
        yield* Effect.promise(() => fs.writeFile(tasksFile, next, "utf8"))
        const progress = Spec.progress(Spec.parseTasks(next))
        return result(`${args.name} ${task.id}`, `Completed ${task.id}. ${progress.done}/${progress.total} required tasks done.`, { progress })
      }).pipe(Effect.orDie),
  }),
)
