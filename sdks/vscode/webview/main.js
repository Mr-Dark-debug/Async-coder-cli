/* All agent text is rendered as text nodes, never HTML. */
const api = acquireVsCodeApi()
const element = (id) => document.getElementById(id)
const node = (tag, text) => { const value = document.createElement(tag); value.textContent = text; return value }
const send = (type, fields = {}) => api.postMessage({ type, ...fields })
element("new").onclick = () => send("new")
element("refresh").onclick = () => send("refresh")
element("stop").onclick = () => send("stop")
element("sessions").onchange = (event) => send("select", { id: event.target.value })
element("prompt").onsubmit = (event) => {
  event.preventDefault()
  const text = element("input").value
  if (!text.trim()) return
  send("send", { text })
  element("input").value = ""
}
window.addEventListener("message", ({ data }) => {
  if (data.type === "error") { element("error").textContent = data.text; element("status").textContent = "Disconnected / error"; return }
  if (data.type !== "state") return
  element("error").textContent = ""
  element("status").textContent = data.permissions.length || data.questions.length ? "Waiting for input" : data.status.type
  element("sessions").replaceChildren(...data.sessions.map((session) => {
    const option = node("option", session.title)
    option.value = session.id
    option.selected = session.id === data.session
    return option
  }))
  element("messages").replaceChildren(...data.messages.map((message) => {
    const article = node("article", "")
    article.append(node("strong", message.info.role))
    message.parts.forEach((part) => {
      if (part.type === "text" || part.type === "reasoning") article.append(node("pre", part.text || ""))
      if (part.type === "tool") {
        const details = node("details", "")
        details.append(node("summary", `${part.tool}: ${part.state?.status || "pending"}`), node("pre", part.state?.output || part.state?.error || ""))
        article.append(details)
      }
    })
    if (message.info.error) article.append(node("p", message.info.error.data?.message || "Agent failed"))
    if (message.info.tokens) article.append(node("small", `${message.info.tokens.input} in · ${message.info.tokens.output} out · $${(message.info.cost || 0).toFixed(4)}`))
    return article
  }))
  const requests = element("requests")
  requests.replaceChildren()
  data.permissions.forEach((permission) => {
    const section = node("section", `${permission.permission}: ${permission.patterns.join(", ")}`)
    ;[["Allow once", "once"], ["Deny", "reject"]].forEach(([label, reply]) => {
      const button = node("button", label)
      button.onclick = () => send("permission", { id: permission.id, reply })
      section.append(button)
    })
    requests.append(section)
  })
  data.questions.forEach((request) => {
    const section = node("section", "")
    const selects = request.questions.map((question) => {
      section.append(node("label", question.question))
      const select = node("select", "")
      select.multiple = !!question.multiple
      question.options.forEach((option) => select.append(node("option", option.label)))
      section.append(select)
      return select
    })
    const button = node("button", "Answer")
    button.onclick = () => send("question", { id: request.id, answers: selects.map((select) => Array.from(select.selectedOptions).map((option) => option.value)) })
    section.append(button)
    requests.append(section)
  })
  element("diffs").replaceChildren(...data.diffs.map((diff) => {
    const button = node("button", `${diff.file}  +${diff.additions} −${diff.deletions}`)
    button.onclick = () => send("diff", { file: diff.file })
    return button
  }))
})
