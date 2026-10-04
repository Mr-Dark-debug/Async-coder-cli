import { Hono } from "hono"
import { describeRoute, validator, resolver } from "hono-openapi"
import z from "zod"
import { lazy } from "@/util/lazy"
import { Memory } from "@/memory"
import { errors } from "../../error"
import { jsonRequest } from "./trace"

const Note = z.object({ path: z.string(), scope: z.string(), scope_id: z.string(), type: z.string(), pinned: z.boolean(), bytes: z.number() })

export const MemoryRoutes = lazy(() =>
  new Hono()
    .get(
      "/",
      describeRoute({
        summary: "List memory notes",
        description: "All indexed memory notes. Memory writes are always user-auditable: this is the audit view.",
        operationId: "memory.list",
        responses: { 200: { description: "Notes", content: { "application/json": { schema: resolver(z.array(Note)) } } } },
      }),
      async (c) =>
        jsonRequest("MemoryRoutes.list", c, function* () {
          return yield* Memory.Service.use((svc) => svc.list())
        }),
    )
    .get(
      "/search",
      describeRoute({
        summary: "Search memory",
        operationId: "memory.search",
        responses: { 200: { description: "Matches", content: { "application/json": { schema: resolver(z.array(z.any())) } } } },
      }),
      validator("query", z.object({ query: z.string().min(1) })),
      async (c) =>
        jsonRequest("MemoryRoutes.search", c, function* () {
          return yield* Memory.Service.use((svc) => svc.search({ query: c.req.valid("query").query, limit: 25 }))
        }),
    )
    .get(
      "/note",
      describeRoute({
        summary: "Read a memory note",
        operationId: "memory.read",
        responses: { 200: { description: "Note text", content: { "application/json": { schema: resolver(z.object({ text: z.string() })) } } }, ...errors(404) },
      }),
      validator("query", z.object({ path: z.string() })),
      async (c) =>
        jsonRequest("MemoryRoutes.read", c, function* () {
          const text = yield* Memory.Service.use((svc) => svc.read(c.req.valid("query").path))
          if (text === undefined) throw new Error("Note not found")
          return { text }
        }),
    )
    .post(
      "/pin",
      describeRoute({
        summary: "Pin or unpin a note",
        description: "Pinned notes are always recalled into new turns.",
        operationId: "memory.pin",
        responses: { 200: { description: "Result", content: { "application/json": { schema: resolver(z.boolean()) } } } },
      }),
      validator("json", z.object({ path: z.string(), pinned: z.boolean() })),
      async (c) =>
        jsonRequest("MemoryRoutes.pin", c, function* () {
          const body = c.req.valid("json")
          return yield* Memory.Service.use((svc) => svc.pin(body.path, body.pinned))
        }),
    )
    .delete(
      "/note",
      describeRoute({
        summary: "Forget a memory note",
        description: "Deletes the note from disk and the index.",
        operationId: "memory.forget",
        responses: { 200: { description: "Whether a note was removed", content: { "application/json": { schema: resolver(z.boolean()) } } } },
      }),
      validator("query", z.object({ path: z.string() })),
      async (c) =>
        jsonRequest("MemoryRoutes.forget", c, function* () {
          return yield* Memory.Service.use((svc) => svc.forget(c.req.valid("query").path))
        }),
    ),
)
