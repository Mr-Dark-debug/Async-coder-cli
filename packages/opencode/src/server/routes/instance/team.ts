import { Hono } from "hono"
import { describeRoute, validator, resolver } from "hono-openapi"
import z from "zod"
import { Effect } from "effect"
import { lazy } from "@/util/lazy"
import { errors } from "../../error"
import * as Team from "@/team/run"
import { jsonRequest } from "./trace"

export const TeamRoutes = lazy(() =>
  new Hono()
    .get(
      "/",
      describeRoute({
        summary: "List team manifests",
        description: "Team manifests found in .async-coder/team/*.md.",
        operationId: "team.manifests",
        responses: { 200: { description: "Manifest names", content: { "application/json": { schema: resolver(z.array(z.string())) } } } },
      }),
      async (c) =>
        jsonRequest("TeamRoutes.manifests", c, function* () {
          return yield* Effect.promise(() => Team.listManifests())
        }),
    )
    .post(
      "/start",
      describeRoute({
        summary: "Start a team",
        description: "Start every worker of a team manifest as a detached job on its own worktree branch.",
        operationId: "team.start",
        responses: { 200: { description: "Team id and worker jobs", content: { "application/json": { schema: resolver(z.any()) } } }, ...errors(400) },
      }),
      validator("json", z.object({ manifest: z.string(), budget_usd: z.number().positive().optional() })),
      async (c) =>
        jsonRequest("TeamRoutes.start", c, function* () {
          const body = c.req.valid("json")
          return yield* Effect.promise(async () => Team.start(await Team.loadManifest(body.manifest), { budget_usd: body.budget_usd }))
        }),
    )
    .get(
      "/:teamID",
      describeRoute({
        summary: "Team status",
        operationId: "team.status",
        responses: { 200: { description: "Team jobs", content: { "application/json": { schema: resolver(z.any()) } } } },
      }),
      validator("param", z.object({ teamID: z.string() })),
      async (c) =>
        jsonRequest("TeamRoutes.status", c, function* () {
          return Team.status(c.req.valid("param").teamID)
        }),
    )
    .post(
      "/:teamID/merge",
      describeRoute({
        summary: "Merge finished workers",
        description: "Merge finished worker branches into the current branch sequentially. Stops at the first conflict.",
        operationId: "team.merge",
        responses: { 200: { description: "Merge result", content: { "application/json": { schema: resolver(z.any()) } } }, ...errors(400) },
      }),
      validator("param", z.object({ teamID: z.string() })),
      async (c) =>
        jsonRequest("TeamRoutes.merge", c, function* () {
          return yield* Effect.promise(() => Team.merge(c.req.valid("param").teamID))
        }),
    )
    .post(
      "/reassign/:jobID",
      describeRoute({
        summary: "Reassign a worker",
        description: "Cancel a worker (if still running) and start a replacement with the same role and assignment.",
        operationId: "team.reassign",
        responses: { 200: { description: "Replacement job", content: { "application/json": { schema: resolver(z.any()) } } }, ...errors(400) },
      }),
      validator("param", z.object({ jobID: z.string() })),
      async (c) =>
        jsonRequest("TeamRoutes.reassign", c, function* () {
          return yield* Effect.promise(() => Team.reassign(c.req.valid("param").jobID))
        }),
    ),
)
