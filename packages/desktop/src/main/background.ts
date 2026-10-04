/** Closing a window must never stop the server; explicit quit still does. */
export function createBackgroundState() {
  const active = new Set<string>()
  let quitting = false
  return {
    get quitting() { return quitting },
    quit() { quitting = true },
    shouldHide(trayAvailable: boolean) { return trayAvailable && !quitting },
    update(event: { directory?: string; payload?: { type?: string; properties?: { sessionID?: string; status?: { type?: string } } } }) {
      const properties = event.payload?.properties
      if (event.payload?.type !== "session.status" || !properties?.sessionID) return
      const key = `${event.directory ?? ""}\n${properties.sessionID}`
      if (properties.status?.type === "idle") active.delete(key)
      if (properties.status?.type === "busy" || properties.status?.type === "retry") active.add(key)
    },
    get count() { return active.size },
    get tooltip() { return active.size ? `async-coder · ${active.size} agent${active.size === 1 ? "" : "s"} running` : "async-coder · Ready" },
  }
}
