import { expect, test } from "bun:test"
import path from "node:path"
import { Jobs } from "../../src/jobs"
import { Instance } from "../../src/project/instance"
import { tmpdir } from "../fixture/fixture"

async function fixture() {
  const calls: unknown[] = []
  const server = Bun.serve({
    port: 0,
    async fetch(req) {
      if (req.method === "GET") return Response.json({ data: [] })
      calls.push(await req.json())
      const chunks = [
        { choices: [{ delta: { role: "assistant", content: "Runtime job completed." } }] },
        {
          choices: [{ delta: {}, finish_reason: "stop" }],
          usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
        },
      ]
      return new Response(
        chunks
          .map((chunk) => `data: ${JSON.stringify({ id: "test", object: "chat.completion.chunk", ...chunk })}\n\n`)
          .join("") + "data: [DONE]\n\n",
        {
          headers: { "content-type": "text/event-stream" },
        },
      )
    },
  })
  const dir = await tmpdir({
    config: {
      model: "test/test-model",
      agent: { title: { disable: true } },
      checkpoint: { thresholds: [] },
      provider: {
        test: {
          npm: "@ai-sdk/openai-compatible",
          options: { apiKey: "test", baseURL: `${server.url}v1` },
          models: {
            "test-model": {
              name: "Test",
              limit: { context: 100000, output: 10000 },
              cost: { input: 1000000, output: 1000000 },
            },
          },
        },
      },
    },
  })
  return {
    dir: dir.path,
    calls,
    async [Symbol.asyncDispose]() {
      server.stop(true)
      await dir[Symbol.asyncDispose]()
    },
  }
}

async function finished(id: string) {
  const deadline = Date.now() + 20000
  while (Jobs.alive().has(id) && Date.now() < deadline) await Bun.sleep(20)
  expect(Jobs.alive().has(id)).toBe(false)
  return Jobs.Store.get(id)!
}

test("detached job runs the real session and verification gate", async () => {
  await using fx = await fixture()
  await Instance.provide({
    directory: fx.dir,
    fn: async () => {
      const job = await Jobs.start({ prompt: "Respond with completion.", verify: ["echo verified"] })
      const result = await finished(job.id)
      expect(result.status).toBe("done")
      expect(result.verify_result?.pass).toBe(true)
      expect(result.result).toContain("Runtime job completed")
      expect(result.tokens_in).toBe(5)
      expect(result.tokens_out).toBe(3)
      expect(result.cost_usd).toBe(8)
    },
  })
}, 30000)

test("cancellation during a verification gate cannot finish as done", async () => {
  await using fx = await fixture()
  await Instance.provide({
    directory: fx.dir,
    fn: async () => {
      const marker = path.join(fx.dir, "gate-started.txt")
      const gate =
        process.platform === "win32"
          ? "Set-Content gate-started.txt started; Start-Sleep -Seconds 2"
          : "echo started > gate-started.txt; sleep 2"
      const job = await Jobs.start({ prompt: "Respond with completion.", verify: [gate] })
      const deadline = Date.now() + 15000
      while (!(await Bun.file(marker).exists()) && Date.now() < deadline) await Bun.sleep(20)
      expect(await Bun.file(marker).exists()).toBe(true)
      await Jobs.cancel(job.id)
      expect((await finished(job.id)).status).toBe("cancelled")
    },
  })
}, 30000)

test("an exhausted job budget blocks verification repair calls", async () => {
  await using fx = await fixture()
  await Instance.provide({
    directory: fx.dir,
    fn: async () => {
      const job = await Jobs.start({
        prompt: "Respond with completion.",
        budget_usd: 0.01,
        verify: ["exit 1"],
        verify_retries: 2,
      })
      const result = await finished(job.id)
      expect(result.status).toBe("failed")
      expect(result.error).toContain("Budget")
      expect(fx.calls).toHaveLength(1)
    },
  })
}, 30000)

test("immediate cancellation settles startup without making a model call", async () => {
  await using fx = await fixture()
  await Instance.provide({
    directory: fx.dir,
    fn: async () => {
      const job = await Jobs.start({ prompt: "Respond with completion." })
      const cancelled = await Jobs.cancel(job.id)
      expect(cancelled.status).toBe("cancelled")
      expect(Jobs.alive().has(job.id)).toBe(false)
      expect(fx.calls).toEqual([])
    },
  })
}, 30000)

test("non-Git jobs also finish when Sage risk assessment is enabled", async () => {
  await using fx = await fixture()
  const config = Bun.file(path.join(fx.dir, "async-coder.json"))
  await Bun.write(config, JSON.stringify({ ...(await config.json()), sage: { enabled: true } }))
  await Instance.provide({
    directory: fx.dir,
    fn: async () => {
      const job = await Jobs.start({ prompt: "Respond with completion.", verify: ["echo verified"] })
      expect((await finished(job.id)).status).toBe("done")
      expect(fx.calls).toHaveLength(1)
    },
  })
}, 30000)
