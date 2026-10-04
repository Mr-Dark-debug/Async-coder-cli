import * as vscode from "vscode"
import { randomBytes } from "node:crypto"
import { AgentClient, type FileDiff } from "./client"

export class AgentPanel implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView
  private session?: string
  private snapshot?: Awaited<ReturnType<AgentClient["snapshot"]>>
  private refreshing = false
  private timer?: ReturnType<typeof setInterval>

  constructor(private context: vscode.ExtensionContext, private client: () => Promise<AgentClient>, private status: (text: string) => void, private showDiff: (diff: FileDiff) => Promise<void>) {}

  resolveWebviewView(view: vscode.WebviewView) {
    this.view = view
    view.webview.options = { enableScripts: true, localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, "webview")] }
    const nonce = randomBytes(24).toString("hex")
    const script = view.webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "webview", "main.js"))
    const style = view.webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "webview", "styles.css"))
    view.webview.html = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${view.webview.cspSource}; script-src 'nonce-${nonce}';"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="${style}"></head><body><header><strong>async-coder</strong><span id="status" role="status">Disconnected</span></header><nav><select id="sessions" aria-label="Session"></select><button id="new">New session</button><button id="refresh">Refresh</button></nav><p id="error" role="alert"></p><main id="messages" aria-live="polite"></main><section id="requests"></section><section id="diffs"></section><form id="prompt"><label for="input">Message the agent</label><textarea id="input" rows="4" placeholder="Ask a question or describe a task"></textarea><div><button type="submit">Send</button><button id="stop" type="button">Stop</button></div></form><script nonce="${nonce}" src="${script}"></script></body></html>`
    view.webview.onDidReceiveMessage((message: unknown) => {
      void this.receive(message).catch((error: unknown) => this.fail(error))
    }, undefined, this.context.subscriptions)
    view.onDidDispose(() => { this.view = undefined }, undefined, this.context.subscriptions)
    this.timer ??= setInterval(() => { if (this.session || this.view?.visible) void this.refresh() }, 1500)
    void this.refresh()
  }

  dispose() { clearInterval(this.timer) }

  async send(text: string) {
    const client = await this.client()
    this.session ??= (await client.create()).id
    await client.prompt(this.session, text)
    await this.refresh()
  }

  private fail(error: unknown) {
    this.status("Disconnected / error")
    void this.view?.webview.postMessage({ type: "error", text: error instanceof Error ? error.message : String(error) })
  }

  private async receive(message: unknown) {
    if (!message || typeof message !== "object" || !("type" in message)) return
    const input = message as { type: string; text?: unknown; id?: unknown; reply?: unknown; file?: unknown; answers?: unknown }
    const client = await this.client()
    if (input.type === "send" && typeof input.text === "string" && input.text.trim() && input.text.length <= 100_000) await this.send(input.text)
    if (input.type === "new") this.session = (await client.create()).id
    if (input.type === "select" && typeof input.id === "string" && (await client.sessions()).some((session) => session.id === input.id)) this.session = input.id
    if (input.type === "stop" && this.session) await client.abort(this.session)
    if (input.type === "diff") {
      const diff = this.snapshot?.diffs.find((item) => item.file === input.file)
      if (diff) await this.showDiff(diff)
    }
    if (input.type === "permission" && this.snapshot?.permissions.some((item) => item.id === input.id) && ["once", "reject"].includes(String(input.reply))) {
      await client.request(`/permission/${encodeURIComponent(String(input.id))}/reply`, { reply: input.reply })
    }
    if (input.type === "question" && this.snapshot?.questions.some((item) => item.id === input.id) && Array.isArray(input.answers) && input.answers.every((answer) => Array.isArray(answer) && answer.every((value) => typeof value === "string"))) {
      await client.request(`/question/${encodeURIComponent(String(input.id))}/reply`, { answers: input.answers })
    }
    await this.refresh()
  }

  private async refresh() {
    if (this.refreshing) return
    this.refreshing = true
    await (async () => {
      const client = await this.client()
      const sessions = await client.sessions()
      this.session ??= sessions[0]?.id
      if (!this.session) {
        this.status("Ready")
        await this.view?.webview.postMessage({ type: "state", sessions, status: { type: "idle" }, messages: [], diffs: [], permissions: [], questions: [] })
        return
      }
      this.snapshot = await client.snapshot(this.session)
      this.status(this.snapshot.permissions.length || this.snapshot.questions.length ? "Waiting for input" : this.snapshot.status.type)
      await this.view?.webview.postMessage({ type: "state", sessions, session: this.session, ...this.snapshot })
    })().catch((error: unknown) => this.fail(error)).finally(() => { this.refreshing = false })
  }
}
