import { Hono } from "hono"
import { describeRoute, validator, resolver } from "hono-openapi"
import z from "zod"
import { lazy } from "@/util/lazy"
import * as Pairing from "../pairing"

export const PairRoutes = lazy(() =>
  new Hono()
    .post(
      "/",
      describeRoute({
        summary: "Create a pairing code",
        description: "Generate a short-lived single-use code. Enter it on a new device to receive a device token.",
        operationId: "pair.create",
        responses: { 200: { description: "Pairing code", content: { "application/json": { schema: resolver(z.object({ code: z.string(), expires: z.number() })) } } } },
      }),
      (c) => c.json(Pairing.createCode()),
    )
    .post(
      "/exchange",
      describeRoute({
        summary: "Exchange a pairing code for a device token",
        description: "Unauthenticated: the pairing code is the credential. Repeated failures lock the endpoint briefly.",
        operationId: "pair.exchange",
        responses: { 200: { description: "Device token", content: { "application/json": { schema: resolver(z.object({ id: z.string(), token: z.string() })) } } } },
      }),
      validator("json", z.object({ code: z.string().min(4), name: z.string().default("device") })),
      (c) => {
        const body = c.req.valid("json")
        const result = Pairing.exchange(body)
        if (!result.ok) return c.json({ error: result.reason }, result.reason === "locked" ? 429 : 401)
        return c.json({ id: result.id, token: result.token })
      },
    )
    .get(
      "/devices",
      describeRoute({
        summary: "List paired devices",
        operationId: "pair.devices",
        responses: { 200: { description: "Devices", content: { "application/json": { schema: resolver(z.array(z.any())) } } } },
      }),
      (c) => c.json(Pairing.list()),
    )
    .delete(
      "/devices/:id",
      describeRoute({
        summary: "Revoke a paired device",
        operationId: "pair.revoke",
        responses: { 200: { description: "Revoked", content: { "application/json": { schema: resolver(z.boolean()) } } } },
      }),
      validator("param", z.object({ id: z.string() })),
      (c) => c.json(Pairing.revoke(c.req.valid("param").id)),
    ),
)
