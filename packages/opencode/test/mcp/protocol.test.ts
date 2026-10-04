import { describe, expect, test } from "bun:test"
import path from "path"
import { tmpdir } from "../fixture/fixture"

describe("MCP real protocol transports", () => {
  for (const mode of ["stdio", "http", "sse"]) {
    test(`${mode} initializes, discovers and calls tools, disconnects and reconnects`, async () => {
      await using directory = await tmpdir()
      // A subprocess keeps SDK transport mocks in other test files out of this protocol test.
      const child = Bun.spawn([process.execPath, "run", path.join(import.meta.dir, "../fixture/mcp-protocol-worker.ts"), mode, directory.path], { stdout: "pipe", stderr: "pipe" })
      // The worker imports the full application on a cold Windows filesystem;
      // MCP connection and request deadlines remain independently set to 3s.
      const timer = setTimeout(() => child.kill(), 45000)
      const result = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]).finally(() => clearTimeout(timer))
      expect(result[2], result[1]).toBe(0)
      const value = JSON.parse(result[0].trim().split("\n").at(-1)!)
      expect(value.connected).toBe("connected")
      expect(value.toolNames).toEqual(["echo"])
      expect(value.output.content).toEqual([{ type: "text", text: "echo:roundtrip" }])
      expect(value.disconnected).toBe("disabled")
      expect(value.reconnected).toBe("connected")
    }, 50000)
  }
})
