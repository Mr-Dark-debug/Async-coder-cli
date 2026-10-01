import { app, Menu, nativeImage, Tray, type BrowserWindow } from "electron"
import { createBackgroundState } from "./background"

export function createTray(window: BrowserWindow) {
  const state = createBackgroundState()
  // Electron's bitmap format is BGRA. Generate a local lavender terminal icon.
  const image = nativeImage.createFromBitmap(Buffer.from(Array.from({ length: 32 * 32 }, (_, i) => {
    const x = i % 32
    const y = Math.floor(i / 32)
    const glyph = (x >= 9 && x <= 16 && Math.abs(Math.abs(y - 15) - (x - 9)) <= 1) || (x >= 18 && x <= 24 && y >= 21 && y <= 23)
    return glyph ? [50, 27, 33, 255] : [239, 164, 180, 255]
  }).flat()), { width: 32, height: 32 })
  const tray = new Tray(image)
  const show = () => {
    if (window.isDestroyed()) return
    if (window.isMinimized()) window.restore()
    window.show()
    window.focus()
  }
  tray.setToolTip(state.tooltip)
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open async-coder", click: show },
    { type: "separator" },
    { label: "Quit async-coder", click: () => app.quit() },
  ]))
  tray.on("click", show)
  tray.on("double-click", show)
  window.on("close", (event) => {
    if (!state.shouldHide(!tray.isDestroyed())) return
    event.preventDefault()
    window.hide()
  })
  app.on("activate", show)
  app.on("before-quit", () => state.quit())
  app.on("will-quit", () => tray.destroy())
  const abort = new AbortController()
  app.on("before-quit", () => abort.abort())
  return {
    async watch(url: string, password: string) {
      const response = await fetch(`${url}/global/event`, {
        headers: { authorization: `Basic ${Buffer.from(`opencode:${password}`).toString("base64")}` },
        signal: abort.signal,
      })
      if (!response.ok || !response.body) throw new Error(`Tray status stream failed (${response.status})`)
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
      let buffer = ""
      while (!abort.signal.aborted) {
        const chunk = await reader.read()
        if (chunk.done) return
        buffer += chunk.value.replace(/\r\n/g, "\n")
        const frames = buffer.split("\n\n")
        buffer = frames.pop() ?? ""
        frames.forEach((frame) => {
          const data = frame.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n")
          if (!data) return
          state.update(JSON.parse(data))
          tray.setToolTip(state.tooltip)
        })
      }
    },
  }
}
