import path from "path"
import { Global } from "@/global"

type Entry = { sessionID: string; last?: string }

/** chat -> session mapping, persisted so conversations survive a bridge restart. */
export class Channels {
  private data: Record<string, Entry> = {}
  constructor(private file = path.join(Global.Path.data, "bridge-channels.json")) {}

  async load() {
    this.data = await Bun.file(this.file).json().catch(() => ({}))
    return this
  }

  get(key: string) {
    return this.data[key]
  }

  async set(key: string, entry: Entry) {
    this.data[key] = entry
    await Bun.write(this.file, JSON.stringify(this.data, null, 2))
  }

  async remove(key: string) {
    delete this.data[key]
    await Bun.write(this.file, JSON.stringify(this.data, null, 2))
  }
}
