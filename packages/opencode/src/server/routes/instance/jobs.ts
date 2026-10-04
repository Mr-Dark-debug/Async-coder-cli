import { Hono } from "hono"
import { describeRoute, validator, resolver } from "hono-openapi"
import z from "zod"
import { Effect } from "effect"
import { lazy } from "@/util/lazy"
import { Jobs } from "@/jobs"
import { errors } from "../../error"
import { jsonRequest } from "./trace"
import * as Pr from "@/jobs/pr"
import { receipt } from "@/jobs/verify"

const Job = z
  .object({
    id: z.string(),
    session_id: z.string().nullable(),
    name: z.string(),
    prompt: z.string(),
    agent: z.string().nullable(),
    model: z.string().nullable(),
    status: z.enum(["queued", "running", "done", "failed", "cancelled"]),
    directory: z.string().nullable(),
    branch: z.string().nullable(),
    team_id: z.string().nullable(),
    role: z.string().nullable(),
    budget_usd: z.number().nullable(),
    cost_usd: z.number(),
    error: z.string().nullable(),
    result: z.string().nullable(),
    verify: z.array(z.string()).nullable(),
    verify_retries: z.number(),
    verify_result: z.any().nullable(),
    tokens_in: z.number(),
    tokens_out: z.number(),
    time_created: z.number(),
    time_started: z.number().nullable(),
    time_finished: z.number().nullable(),
  })
  .meta({ ref: "Job" })

export const JobRoutes = lazy(() =>
  new Hono()
    .get(
      "/",
      describeRoute({
        summary: "List background jobs",
        description: "List background jobs, newest first.",
        operationId: "job.list",
        responses: { 200: { description: "Jobs", content: { "application/json": { schema: resolver(z.array(Job)) } } } },
      }),
      async (c) => jsonRequest("JobRoutes.list", c, function* () {
          return Jobs.Store.list()
        }),
    )
    .post(
      "/",
      describeRoute({
        summary: "Start a background job",
        description:
          "Run a prompt as a detached session in this server process, optionally inside its own git worktree and with a spend cap. The job keeps running while the server does.",
        operationId: "job.create",
        responses: { 200: { description: "Queued job", content: { "application/json": { schema: resolver(Job) } } }, ...errors(400) },
      }),
      validator(
        "json",
        z.object({
          prompt: z.string().min(1),
          agent: z.string().optional(),
          model: z.string().optional().describe("provider/model"),
          budget_usd: z.number().positive().optional(),
          worktree: z.boolean().optional(),
          verify: z.array(z.string()).optional().describe("Gate commands that must pass before the job is done"),
          verify_retries: z.number().int().min(0).max(5).optional(),
        }),
      ),
      async (c) => jsonRequest("JobRoutes.create", c, function* () {
          return yield* Effect.promise(() => Jobs.start(c.req.valid("json")))
        }),
    )
    .get(
      "/:jobID",
      describeRoute({
        summary: "Get a background job",
        operationId: "job.get",
        responses: { 200: { description: "Job", content: { "application/json": { schema: resolver(Job) } } }, ...errors(404) },
      }),
      validator("param", z.object({ jobID: z.string() })),
      async (c) =>
        jsonRequest("JobRoutes.get", c, function* () {
          const job = Jobs.Store.get(c.req.valid("param").jobID)
          if (!job) throw new Error("Job not found")
          return job
        }),
    )
    .post(
      "/:jobID/cancel",
      describeRoute({
        summary: "Cancel a background job",
        description: "Stop a queued or running job. A job with its own worktree has the worktree removed.",
        operationId: "job.cancel",
        responses: { 200: { description: "Job", content: { "application/json": { schema: resolver(Job) } } }, ...errors(404) },
      }),
      validator("param", z.object({ jobID: z.string() })),
      async (c) => jsonRequest("JobRoutes.cancel", c, function* () {
          return yield* Effect.promise(() => Jobs.cancel(c.req.valid("param").jobID))
        }),
    )
    .get(
      "/:jobID/receipt",
      describeRoute({
        summary: "Job receipt",
        description: "Markdown cost, token and verification receipt for a job.",
        operationId: "job.receipt",
        responses: { 200: { description: "Receipt", content: { "application/json": { schema: resolver(z.object({ markdown: z.string() })) } } }, ...errors(404) },
      }),
      validator("param", z.object({ jobID: z.string() })),
      async (c) =>
        jsonRequest("JobRoutes.receipt", c, function* () {
          const job = Jobs.Store.get(c.req.valid("param").jobID)
          if (!job) throw new Error("Job not found")
          return { markdown: receipt(job, Jobs.Store.sageInvocations(job.id)) }
        }),
    )
    .post(
      "/:jobID/pr",
      describeRoute({
        summary: "Open a pull request for a finished job",
        description: "Pushes the job branch and opens a draft pull request with the job receipt as its body. Requires a passing verification gate when one was configured.",
        operationId: "job.pr",
        responses: { 200: { description: "Pull request", content: { "application/json": { schema: resolver(z.object({ url: z.string(), branch: z.string() })) } } }, ...errors(400, 404) },
      }),
      validator("param", z.object({ jobID: z.string() })),
      async (c) =>
        jsonRequest("JobRoutes.pr", c, function* () {
          const job = Jobs.Store.get(c.req.valid("param").jobID)
          if (!job) throw new Error("Job not found")
          return yield* Effect.promise(() => Pr.open(job))
        }),
    ),
)
