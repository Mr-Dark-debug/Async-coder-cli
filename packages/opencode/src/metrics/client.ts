export type EventType = "model_call" | "tool_call" | "agent_request"

export type Header = {
  event: EventType
  app_id: string
  instance_id: string
  instance_id_type: "uuid"
  uid?: string
  uid_type?: "session_id"
  e_ts: number
}

export function buildHeader(event: EventType, sessionID?: string): Header {
  const header: Header = {
    event,
    app_id: "async-coder-local",
    instance_id: crypto.randomUUID(),
    instance_id_type: "uuid",
    e_ts: Date.now(),
  }
  if (sessionID) {
    header.uid = sessionID
    header.uid_type = "session_id"
  }
  return header
}

export type Envelope = { H: Header; B: Record<string, unknown> }

export async function postEvents(payload: Envelope[]): Promise<void> {
  void payload
}
