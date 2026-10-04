export * as RepoMap from "./index"
import { Context, Effect, Layer, Stream } from "effect"
import { Ripgrep } from "@/file/ripgrep"
import { InstanceState } from "@/effect"
import { Bus } from "@/bus"
import { FileWatcher } from "@/file/watcher"
import { build } from "./builder"
import type { RepoMap } from "./types"

export class Service extends Context.Service<Service, {
  get: (signal?: AbortSignal) => Effect.Effect<RepoMap, Error>
}>()("@async-coder/RepoMap") {}

export const layer = Layer.effect(Service, Effect.gen(function* () {
  const rg = yield* Ripgrep.Service
  const bus = yield* Bus.Service
  const state = yield* InstanceState.make(Effect.fn("RepoMap.state")(function* (ctx) {
    const item = { root: ctx.directory, map: undefined as RepoMap | undefined, dirty: true, updated: 0 }
    const unsubscribe = yield* bus.subscribeCallback(FileWatcher.Event.Updated, () => { item.dirty = true })
    yield* Effect.addFinalizer(() => Effect.sync(unsubscribe))
    return item
  }))
  return Service.of({ get: Effect.fn("RepoMap.get")(function* (signal) {
    const item = yield* InstanceState.get(state)
    if (item.map && !item.dirty && Date.now() - item.updated < 2000) return item.map
    const files = yield* rg.files({ cwd: item.root, hidden: false, follow: false, signal }).pipe(Stream.take(10000), Stream.runCollect, Effect.map((items) => [...items]), Effect.mapError((error) => new Error(String(error))))
    const map = yield* Effect.tryPromise({ try: () => build(item.root, files, item.map), catch: (error) => new Error(String(error)) })
    item.map = map
    item.dirty = false
    item.updated = Date.now()
    return map
  }) })
}))

export const defaultLayer = layer.pipe(Layer.provide(Ripgrep.defaultLayer), Layer.provide(Bus.defaultLayer))
export { format, findSymbols, dependencies } from "./formatter"
