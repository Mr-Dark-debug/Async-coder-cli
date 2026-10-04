import { afterEach, expect, test } from "bun:test"
import { tmpdir } from "../fixture/fixture"
import { Instance } from "@/project/instance"
import { Session } from "@/session"
import { makeRuntime } from "@/effect/run-service"
import { MessageID, PartID } from "@/session/schema"
import { ModelID, ProviderID } from "@/provider/schema"
import { SessionExport } from "@/share/export"
import { SessionImport } from "@/share/import"

const sessions = makeRuntime(Session.Service, Session.defaultLayer)
afterEach(() => Instance.disposeAll())

test("offline export roundtrips messages, tool calls, usage and diffs; HTML escapes active content", async () => {
  await using tmp = await tmpdir({ git: true })
  await Instance.provide({ directory: tmp.path, fn: async () => {
    const info = await sessions.runPromise((svc) => svc.create({ title: '<script>alert("title")</script>' }))
    const user = await sessions.runPromise((svc) => svc.updateMessage({ id: MessageID.ascending(), sessionID: info.id, role: "user", time: { created: Date.now() }, agent: "build", model: { providerID: ProviderID.make("test"), modelID: ModelID.make("coding") } }))
    await sessions.runPromise((svc) => svc.updatePart({ id: PartID.ascending(), messageID: user.id, sessionID: info.id, type: "text", text: '<img src=x onerror="alert(1)">' }))
    const assistant = await sessions.runPromise((svc) => svc.updateMessage({ id: MessageID.ascending(), sessionID: info.id, role: "assistant", parentID: user.id, time: { created: Date.now() }, modelID: ModelID.make("coding"), providerID: ProviderID.make("test"), mode: "build", agent: "build", path: { cwd: tmp.path, root: tmp.path }, cost: 0.42, tokens: { input: 10, output: 20, reasoning: 0, cache: { read: 0, write: 0 } } }))
    await sessions.runPromise((svc) => svc.updatePart({ id: PartID.ascending(), messageID: assistant.id, sessionID: info.id, type: "tool", tool: "read", callID: "call_1", state: { status: "completed", title: "read file", input: { filePath: "test.ts" }, output: "secret <script>bad()</script>", metadata: {}, time: { start: Date.now(), end: Date.now() } } }))
    const document = await SessionExport.collect(info.id)
    const imported = SessionImport.read(SessionExport.json(document))
    expect(imported.readOnly).toBe(true)
    expect(imported.messages).toHaveLength(2)
    expect(imported.messages[1]!.parts[0]!.type).toBe("tool")
    expect(imported.diffs).toEqual([])
    const html = SessionExport.html(imported)
    expect(html).toContain("$0.420000")
    expect(html).toContain("test / coding")
    expect(html).toContain("&lt;script&gt;")
    expect(html).not.toContain("<script>")
    expect(html).not.toContain("<img src=x")
    expect(html).toContain("default-src 'none'")
    expect(html).toContain("Read-only offline session")
  } })
}, 30_000)

test("read-only import rejects malformed documents and unsupported versions", () => {
  expect(() => SessionImport.read({ format: "async-coder-session", version: 2, readOnly: true })).toThrow()
  expect(() => SessionImport.read("{broken")).toThrow()
})
