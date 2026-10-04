// Simple JSON-RPC 2.0 LSP-like fake server over stdio
// Implements a minimal LSP handshake and triggers a request upon notification

let nextId = 1

function encode(message) {
  const json = JSON.stringify(message)
  const header = `Content-Length: ${Buffer.byteLength(json, "utf8")}\r\n\r\n`
  return Buffer.concat([Buffer.from(header, "utf8"), Buffer.from(json, "utf8")])
}

function decodeFrames(buffer) {
  const results = []
  let idx
  while ((idx = buffer.indexOf("\r\n\r\n")) !== -1) {
    const header = buffer.slice(0, idx).toString("utf8")
    const m = /Content-Length:\s*(\d+)/i.exec(header)
    const len = m ? parseInt(m[1], 10) : 0
    const bodyStart = idx + 4
    const bodyEnd = bodyStart + len
    if (buffer.length < bodyEnd) break
    const body = buffer.slice(bodyStart, bodyEnd).toString("utf8")
    results.push(body)
    buffer = buffer.slice(bodyEnd)
  }
  return { messages: results, rest: buffer }
}

let readBuffer = Buffer.alloc(0)
let activeUri
let activeDiagnostics = []

process.stdin.on("data", (chunk) => {
  readBuffer = Buffer.concat([readBuffer, chunk])
  const { messages, rest } = decodeFrames(readBuffer)
  readBuffer = rest
  for (const m of messages) handle(m)
})

function send(msg) {
  process.stdout.write(encode(msg))
}

function sendRequest(method, params) {
  const id = nextId++
  send({ jsonrpc: "2.0", id, method, params })
  return id
}

function handle(raw) {
  let data
  try {
    data = JSON.parse(raw)
  } catch {
    return
  }
  if (data.method === "initialize") {
    send({ jsonrpc: "2.0", id: data.id, result: { capabilities: process.env.FIXTURE_PULL_DIAGNOSTICS ? { diagnosticProvider: { interFileDependencies: false, workspaceDiagnostics: false } } : {} } })
    return
  }
  if (data.method === "initialized") {
    return
  }
  if (data.method === "textDocument/didOpen" || data.method === "textDocument/didChange") {
    activeUri = data.params.textDocument.uri
    const text = data.method === "textDocument/didOpen" ? data.params.textDocument.text : data.params.contentChanges[0].text
    activeDiagnostics = text.includes("BROKEN") ? [{ range: { start: { line: 0, character: 0 }, end: { line: 0, character: 6 } }, severity: 1, message: "Fixture syntax error" }] : []
    if (!process.env.FIXTURE_PULL_DIAGNOSTICS) send({ jsonrpc: "2.0", method: "textDocument/publishDiagnostics", params: { uri: activeUri, diagnostics: activeDiagnostics } })
    return
  }
  if (data.method === "textDocument/didClose") {
    activeUri = undefined
    return
  }
  if (data.method === "textDocument/diagnostic") {
    send({ jsonrpc: "2.0", id: data.id, result: { kind: "full", items: activeDiagnostics } })
    return
  }
  if (data.method === "textDocument/hover") {
    send({ jsonrpc: "2.0", id: data.id, result: { contents: { kind: "plaintext", value: "Fixture hover" }, pid: process.pid } })
    return
  }
  if (data.method === "textDocument/completion") {
    send({ jsonrpc: "2.0", id: data.id, result: { isIncomplete: false, items: [{ label: "fixtureSymbol", kind: 6 }] } })
    return
  }
  if (data.method === "textDocument/prepareRename") {
    send({ jsonrpc: "2.0", id: data.id, result: { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 6 } }, placeholder: "BROKEN" } })
    return
  }
  if (data.method === "textDocument/rename") {
    send({ jsonrpc: "2.0", id: data.id, result: { changes: { [data.params.textDocument.uri]: [{ range: { start: { line: 0, character: 0 }, end: { line: 0, character: 6 } }, newText: data.params.newName }] } } })
    return
  }
  if (data.method === "textDocument/definition" || data.method === "textDocument/references") {
    send({ jsonrpc: "2.0", id: data.id, result: [{ uri: data.params.textDocument.uri, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 6 } } }] })
    return
  }
  if (data.method === "workspace/symbol") {
    send({ jsonrpc: "2.0", id: data.id, result: [{ name: data.params.query || "fixture", kind: 12, location: { uri: activeUri, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 6 } } } }] })
    return
  }
  if (data.method === "workspace/didChangeConfiguration") {
    return
  }
  if (data.method === "test/trigger") {
    const method = data.params && data.params.method
    if (method) sendRequest(method, {})
    return
  }
  if (typeof data.id !== "undefined") {
    // Respond OK to any request from client to keep transport flowing
    send({ jsonrpc: "2.0", id: data.id, result: null })
    return
  }
}
