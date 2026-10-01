export type Session = { id: string; title: string }
export type FileDiff = { file: string; patch: string; additions: number; deletions: number }
export type Message = {
  info: { id: string; role: string; error?: { data?: { message?: string } }; cost?: number; tokens?: { input: number; output: number } }
  parts: { type: string; text?: string; tool?: string; state?: { status: string; output?: string; error?: string } }[]
}
export type Permission = { id: string; sessionID: string; permission: string; patterns: string[] }
export type Question = { id: string; sessionID: string; questions: { question: string; options: { label: string; description: string }[]; multiple?: boolean }[] }

/** Uses the same authenticated local API as the desktop and terminal clients. */
export class AgentClient {
  constructor(readonly url: string, readonly directory: string, readonly password: string) {}

  async request<T>(path: string, body?: unknown): Promise<T> {
    const url = new URL(path, this.url)
    url.searchParams.set("directory", this.directory)
    const response = await fetch(url, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`async-coder:${this.password}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) throw new Error(`async-coder ${path}: ${response.status} ${(await response.text()).slice(0, 400)}`)
    if (response.status === 204) return undefined as T
    return response.json() as Promise<T>
  }

  sessions() { return this.request<Session[]>("/session?roots=true&limit=100") }
  create() { return this.request<Session>("/session", { title: "VS Code session" }) }
  prompt(id: string, text: string, model?: { providerID: string; modelID: string }, agent?: string) {
    return this.request<void>(`/session/${encodeURIComponent(id)}/prompt_async`, { parts: [{ type: "text", text }], model, agent })
  }
  abort(id: string) { return this.request<boolean>(`/session/${encodeURIComponent(id)}/abort`, {}) }
  async snapshot(id: string) {
    const [messages, statuses, diffs, permissions, questions] = await Promise.all([
      this.request<Message[]>(`/session/${encodeURIComponent(id)}/message?limit=100`),
      this.request<Record<string, { type: "idle" | "busy" | "retry"; message?: string }>>("/session/status"),
      this.request<FileDiff[]>(`/session/${encodeURIComponent(id)}/diff`),
      this.request<Permission[]>("/permission"),
      this.request<Question[]>("/question"),
    ])
    return { messages, status: statuses[id] ?? { type: "idle" as const }, diffs, permissions: permissions.filter((item) => item.sessionID === id), questions: questions.filter((item) => item.sessionID === id) }
  }
}
