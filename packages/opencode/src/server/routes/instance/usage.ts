import { Hono } from "hono"
import { describeRoute, validator, resolver } from "hono-openapi"
import z from "zod"
import { lazy } from "@/util/lazy"
import * as Summary from "@/usage/summary"
import { jsonRequest } from "./trace"

const Row = z.object({
  provider: z.string(),
  model: z.string(),
  agent: z.string(),
  messages: z.number(),
  input: z.number(),
  output: z.number(),
  reasoning: z.number(),
  cache_read: z.number(),
  cache_write: z.number(),
  cost: z.number(),
})

export const UsageRoutes = lazy(() =>
  new Hono().get(
    "/summary",
    describeRoute({
      summary: "Usage summary",
      description: "Spend and tokens by provider, model and agent across all sessions, for today or this month.",
      operationId: "usage.summary",
      responses: {
        200: {
          description: "Usage summary",
          content: {
            "application/json": {
              schema: resolver(
                z.object({
                  range: z.enum(["day", "month"]),
                  from: z.number(),
                  rows: z.array(Row),
                  daily: z.array(z.object({ day: z.string(), cost: z.number() })),
                  total: z.number(),
                  projected_month: z.number().optional(),
                }),
              ),
            },
          },
        },
      },
    }),
    validator("query", z.object({ range: z.enum(["day", "month"]).default("day") })),
    async (c) =>
      jsonRequest("UsageRoutes.summary", c, function* () {
        return Summary.summary(c.req.valid("query").range)
      }),
  ),
)
