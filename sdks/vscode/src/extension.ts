import * as vscode from "vscode"
import { execFile, spawn, type ChildProcess } from "node:child_process"
import { createServer } from "node:net"
import { randomBytes } from "node:crypto"
import { AgentClient, type FileDiff } from "./client"
import { AgentPanel } from "./panel"
import { actionPrompt, fileReference } from "./utils"

export function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel("async-coder")
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100)
  status.command = "async-coder.openPanel"
  status.text = "$(terminal) async-coder: Disconnected"
  status.tooltip = "Open the async-coder agent sidebar"
  status.show()
  let child: ChildProcess | undefined
  let pending: Promise<AgentClient> | undefined
  const stop = () => {
    if (!child?.pid) return
    if (process.platform !== "win32") { child.kill(); return }
    // The npm .cmd launcher owns a child process tree on Windows.
    // Dispose only this extension's captured server tree.
    execFile("taskkill.exe", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true }, () => {})
  }
  const documents = new Map<string, string>()
  context.subscriptions.push(output, status, vscode.workspace.registerTextDocumentContentProvider("async-coder-diff", {
    provideTextDocumentContent: (uri) => documents.get(uri.toString()) ?? "",
  }), { dispose: stop })

  const connect = () => {
    if (!vscode.workspace.isTrusted) return Promise.reject(new Error("Trust this workspace before starting an agent that can run commands."))
    if (pending) return pending
    pending = (async () => {
      const folder = vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor?.document.uri ?? vscode.workspace.workspaceFolders?.[0]?.uri ?? context.extensionUri) ?? vscode.workspace.workspaceFolders?.[0]
      if (!folder || folder.uri.scheme !== "file") throw new Error("Open a local folder before starting async-coder.")
      const command = vscode.workspace.getConfiguration("async-coder").get<string>("executable", "async-coder")
      if (!command || /[\r\n"`&|<>^%!]/.test(command)) throw new Error("async-coder.executable must be an executable path, without shell arguments.")
      const port = await new Promise<number>((resolve, reject) => {
        const server = createServer()
        server.on("error", reject)
        server.listen(0, "127.0.0.1", () => {
          const address = server.address()
          if (!address || typeof address === "string") { server.close(); reject(new Error("Unable to allocate local port")); return }
          server.close((error) => error ? reject(error) : resolve(address.port))
        })
      })
      const password = randomBytes(32).toString("hex")
      const client = new AgentClient(`http://127.0.0.1:${port}`, folder.uri.fsPath, password)
      status.text = "$(sync~spin) async-coder: Starting"
      // Windows npm executables are .cmd shims. Only the validated executable
      // and fixed arguments enter the shell; prompts and files use authenticated HTTP.
      child = spawn(process.platform === "win32" ? `"${command}"` : command, ["serve", "--hostname", "127.0.0.1", "--port", String(port)], {
        cwd: folder.uri.fsPath, shell: process.platform === "win32", windowsHide: true,
        env: { ...process.env, ASYNC_CODER_CALLER: "vscode", ASYNC_CODER_SERVER_USERNAME: "async-coder", ASYNC_CODER_SERVER_PASSWORD: password },
        stdio: ["ignore", "pipe", "pipe"],
      })
      let failure: Error | undefined
      child.on("error", (error) => { failure = error })
      child.stdout?.on("data", (data: Buffer) => output.append(data.toString()))
      child.stderr?.on("data", (data: Buffer) => output.append(data.toString()))
      child.on("exit", () => {
        failure = new Error("async-coder server exited. Check the async-coder output channel.")
        pending = undefined
        status.text = "$(warning) async-coder: Disconnected"
      })
      const deadline = Date.now() + 20_000
      while (Date.now() < deadline) {
        if (failure) throw failure
        const healthy = await client.request<{ healthy: boolean }>("/global/health").catch(() => undefined)
        if (healthy?.healthy) return client
        await new Promise((resolve) => setTimeout(resolve, 250))
      }
      stop()
      throw new Error("async-coder did not become ready. Install @async-coder/cli or set async-coder.executable; see the output channel.")
    })().catch((error: unknown) => { pending = undefined; throw error })
    return pending
  }

  async function showDiff(diff: FileDiff) {
    // Review authoritative patches without assuming the working file still matches.
    const uri = vscode.Uri.from({ scheme: "async-coder-diff", path: `/${encodeURIComponent(diff.file)}.diff`, query: String(Date.now()) })
    documents.set(uri.toString(), diff.patch)
    const document = await vscode.workspace.openTextDocument(uri)
    await vscode.languages.setTextDocumentLanguage(document, "diff")
    await vscode.window.showTextDocument(document, { preview: true, viewColumn: vscode.ViewColumn.Beside })
    if (documents.size > 50) documents.delete(documents.keys().next().value ?? "")
  }

  const panel = new AgentPanel(context, connect, (text) => { status.text = `$(terminal) async-coder: ${text}` }, showDiff)
  context.subscriptions.push(panel, vscode.window.registerWebviewViewProvider("async-coder.agent", panel, { webviewOptions: { retainContextWhenHidden: true } }))
  const register = (id: string, action: () => unknown) => context.subscriptions.push(vscode.commands.registerCommand(id, async () => {
    await Promise.resolve().then(action).catch((error: unknown) => {
      output.appendLine(error instanceof Error ? error.message : String(error))
      void vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error))
    })
  }))
  const openPanel = () => vscode.commands.executeCommand("async-coder.agent.focus")
  register("async-coder.openPanel", openPanel)
  ;["explainSelection", "generateTests", "reviewFile", "fixIssue"].forEach((action) => register(`async-coder.${action}`, async () => {
    const editor = vscode.window.activeTextEditor
    if (!editor) { void vscode.window.showInformationMessage("Open a file first."); return }
    if (!vscode.workspace.getWorkspaceFolder(editor.document.uri)) throw new Error("The active file must belong to the workspace.")
    if ((await connect()).directory !== vscode.workspace.getWorkspaceFolder(editor.document.uri)?.uri.fsPath) throw new Error("This agent belongs to another workspace folder. Open this folder in its own VS Code window to run the action.")
    await openPanel()
    const diagnostics = vscode.languages.getDiagnostics(editor.document.uri).filter((item) => item.range.contains(editor.selection.active)).map((item) => `${item.range.start.line + 1}: ${item.message}`)
    await panel.send(actionPrompt(action, fileReference(editor, action === "explainSelection" || action === "fixIssue"), diagnostics))
  }))

  async function terminal(fresh: boolean) {
    if (!vscode.workspace.isTrusted) throw new Error("Trust this workspace before running async-coder.")
    const existing = vscode.window.terminals.find((item) => item.name === "async-coder" || item.name === "opencode")
    if (existing && !fresh) { existing.show(); return }
    const value = vscode.window.createTerminal({ name: "async-coder", location: { viewColumn: vscode.ViewColumn.Beside }, env: { ASYNC_CODER_CALLER: "vscode" } })
    value.show()
    value.sendText("async-coder")
  }
  register("opencode.openTerminal", () => terminal(false))
  register("opencode.openNewTerminal", () => terminal(true))
  register("opencode.addFilepathToTerminal", () => {
    const editor = vscode.window.activeTextEditor
    const value = vscode.window.activeTerminal
    if (editor && value && ["async-coder", "opencode"].includes(value.name)) { value.sendText(fileReference(editor), false); value.show() }
  })
}

export function deactivate() {}
