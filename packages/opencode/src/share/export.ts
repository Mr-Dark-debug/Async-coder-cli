import z from "zod"
import { Session } from "@/session"
import { SessionID } from "@/session/schema"
import { MessageV2 } from "@/session/message-v2"
import { Snapshot } from "@/snapshot"
import { makeRuntime } from "@/effect/run-service"

const sessions = makeRuntime(Session.Service, Session.defaultLayer)

export const Document = z.object({
  format: z.literal("async-coder-session"),
  version: z.literal(1),
  exportedAt: z.string().datetime(),
  readOnly: z.literal(true),
  info: Session.Info,
  messages: MessageV2.WithParts.array(),
  diffs: Snapshot.FileDiff.array(),
})
export type Document = z.infer<typeof Document>

export async function collect(sessionID: SessionID): Promise<Document> {
  const [info, messages, diffs] = await Promise.all([
    sessions.runPromise((svc) => svc.get(sessionID)),
    sessions.runPromise((svc) => svc.messages({ sessionID, agentID: "*" })),
    sessions.runPromise((svc) => svc.diff(sessionID)),
  ])
  return { format: "async-coder-session", version: 1, exportedAt: new Date().toISOString(), readOnly: true, info, messages, diffs }
}

export function json(document: Document) {
  return JSON.stringify(Document.parse(document), null, 2)
}

function escape(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;")
}

export function html(document: Document) {
  Document.parse(document)
  const assistants = document.messages.filter((message) => message.info.role === "assistant").map((message) => message.info).filter((info) => info.role === "assistant")
  const usage = assistants.reduce((total, info) => ({ cost: total.cost + info.cost, input: total.input + info.tokens.input, output: total.output + info.tokens.output }), { cost: 0, input: 0, output: 0 })
  const messages = document.messages.map((message) => `<article><h2>${escape(message.info.role)} <small>${escape(message.info.id)}</small></h2>${message.info.role === "assistant" ? `<p class="meta">${escape(message.info.providerID)} / ${escape(message.info.modelID)} · ${message.info.tokens.input} input / ${message.info.tokens.output} output tokens</p>` : ""}${message.parts.map((part) => {
    if (part.type === "text" || part.type === "reasoning") return `<pre>${escape(part.text)}</pre>`
    if (part.type === "tool") return `<details><summary>${escape(part.tool)} · ${escape(part.state.status)}</summary><pre>${escape(JSON.stringify(part.state, null, 2))}</pre></details>`
    return `<details><summary>${escape(part.type)}</summary><pre>${escape(JSON.stringify(part, null, 2))}</pre></details>`
  }).join("")}</article>`).join("")
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'"><title>${escape(document.info.title)} · async-coder</title><style>body{margin:0 auto;padding:2rem;max-width:960px;background:#15131c;color:#eee9fa;font:16px system-ui;line-height:1.6}h1,h2,summary{color:#c4b5fd}article,section{padding:1.2rem;margin:1rem 0;background:#201c2c;border:1px solid #40364f;border-radius:12px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:14px ui-monospace,monospace}small,.meta{color:#aaa1be;font-size:13px}summary{cursor:pointer}</style></head><body><h1>${escape(document.info.title)}</h1><p class="meta">async-coder · Read-only offline session · ${escape(document.exportedAt)}<br>${usage.input} input / ${usage.output} output tokens · $${usage.cost.toFixed(6)}</p>${messages}<section><h2>File diffs</h2>${document.diffs.map((diff) => `<details><summary>${escape(diff.file)} (+${diff.additions} / −${diff.deletions})</summary><pre>${escape(diff.patch)}</pre></details>`).join("") || "<p>No file diffs recorded.</p>"}</section></body></html>`
}

export * as SessionExport from "./export"
