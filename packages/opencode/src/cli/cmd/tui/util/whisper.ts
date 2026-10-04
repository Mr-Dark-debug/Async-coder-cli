import path from "path"
import os from "os"
import { mkdtemp, rm } from "fs/promises"
import { which } from "@/util/which"
import { encodeWav } from "./voice"

/** whisper.cpp binaries by name across releases and package managers. */
const BINARIES = ["whisper-cli", "whisper-cpp", "whisper"]

export type Local = { bin: string; model: string }

const modelCandidates = () => [
  process.env.ASYNC_CODER_WHISPER_MODEL,
  path.join(os.homedir(), ".cache", "async-coder", "whisper", "ggml-base.en.bin"),
  path.join(os.homedir(), ".cache", "async-coder", "whisper", "ggml-base.bin"),
]

/** Locate a local whisper.cpp binary and ggml model, or undefined when on-device transcription is not set up. */
export async function find(input?: { has?: (name: string) => string | null; exists?: (file: string) => Promise<boolean> }): Promise<Local | undefined> {
  const has = input?.has ?? ((name) => which(name) ?? null)
  const exists = input?.exists ?? ((file) => Bun.file(file).exists())
  const bin = BINARIES.map((name) => has(name)).find((found): found is string => !!found)
  if (!bin) return undefined
  for (const model of modelCandidates()) if (model && (await exists(model))) return { bin, model }
  return undefined
}

/** whisper.cpp prints bracketed timestamps and bracketed non-speech tags; keep only the spoken text. */
export function parse(output: string) {
  return output
    .split("\n")
    .map((line) => line.replace(/^\s*\[[^\]]*-->[^\]]*\]\s*/, "").replace(/\[[A-Z_ ]+\]|\([a-z ]+\)/g, "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Transcribe 16 kHz mono samples entirely on this machine. Returns null when whisper fails. Audio never leaves the device. */
export async function transcribe(audio: Int16Array, local: Local, run = Bun.spawn): Promise<string | null> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "ac-whisper-"))
  try {
    const wav = path.join(dir, "speech.wav")
    await Bun.write(wav, encodeWav(audio))
    const child = run([local.bin, "-m", local.model, "-f", wav, "-nt", "-np"], { stdout: "pipe", stderr: "ignore", stdin: "ignore" })
    const [out, code] = await Promise.all([new Response(child.stdout as ReadableStream).text(), child.exited])
    if (code !== 0) return null
    return parse(out) || null
  } catch {
    return null
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}
