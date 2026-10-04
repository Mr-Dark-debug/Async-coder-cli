import { describe, expect, test } from "bun:test"
import * as Whisper from "../../../src/cli/cmd/tui/util/whisper"

describe("whisper local transcription", () => {
  test("parse keeps spoken text and drops timestamps and non-speech tags", () => {
    const out = [
      "[00:00:00.000 --> 00:00:02.000]   Add a retry to the fetch helper.",
      "[00:00:02.000 --> 00:00:03.500]  [BLANK_AUDIO]",
      "[00:00:03.500 --> 00:00:05.000]   (music) and run the tests",
      "",
    ].join("\n")
    expect(Whisper.parse(out)).toBe("Add a retry to the fetch helper. and run the tests")
    expect(Whisper.parse("")).toBe("")
    expect(Whisper.parse("plain text without timestamps")).toBe("plain text without timestamps")
  })

  test("find needs both a binary and a model", async () => {
    const none = await Whisper.find({ has: () => null, exists: async () => true })
    expect(none).toBeUndefined()
    const noModel = await Whisper.find({ has: (n) => (n === "whisper-cli" ? "/bin/whisper-cli" : null), exists: async () => false })
    expect(noModel).toBeUndefined()
    const ok = await Whisper.find({ has: (n) => (n === "whisper-cpp" ? "/bin/whisper-cpp" : null), exists: async (f) => f.endsWith("ggml-base.en.bin") })
    expect(ok?.bin).toBe("/bin/whisper-cpp")
    expect(ok?.model.endsWith("ggml-base.en.bin")).toBe(true)
  })

  test("transcribe runs the binary on a temp wav and returns the parsed text", async () => {
    let seen: string[] = []
    const fake = ((argv: string[]) => {
      seen = argv
      return { stdout: new Response("[00:00:00.000 --> 00:00:01.000]  hello world").body, exited: Promise.resolve(0) }
    }) as unknown as typeof Bun.spawn
    const text = await Whisper.transcribe(new Int16Array(160), { bin: "wh", model: "m.bin" }, fake)
    expect(text).toBe("hello world")
    expect(seen.slice(0, 3)).toEqual(["wh", "-m", "m.bin"])
    expect(seen.at(-3)?.endsWith("speech.wav")).toBe(true)
  })

  test("a failing whisper process yields null", async () => {
    const fake = (() => ({ stdout: new Response("").body, exited: Promise.resolve(1) })) as unknown as typeof Bun.spawn
    expect(await Whisper.transcribe(new Int16Array(16), { bin: "wh", model: "m" }, fake)).toBeNull()
  })
})
