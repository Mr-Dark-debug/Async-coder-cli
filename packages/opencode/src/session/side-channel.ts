/**
 * Side-channel notes (/btw, /steer): text sent to a running agent that it sees on its next model
 * call. Notes are not user turns; they are held per (session, agent) until the loop drains them.
 */
export type Note = { text: string; steer: boolean; time: number }

const boxes = new Map<string, Note[]>()

const key = (sessionID: string, agentID: string) => `${sessionID}:${agentID}`

export function push(input: { sessionID: string; agentID?: string; text: string; steer?: boolean }) {
  const text = input.text.trim()
  if (!text) return false
  const k = key(input.sessionID, input.agentID ?? "main")
  boxes.set(k, [...(boxes.get(k) ?? []), { text, steer: input.steer === true, time: Date.now() }])
  return true
}

/** Remove and return every pending note for the agent, oldest first. */
export function drain(sessionID: string, agentID = "main"): Note[] {
  const k = key(sessionID, agentID)
  const notes = boxes.get(k) ?? []
  boxes.delete(k)
  return notes
}

export function pending(sessionID: string, agentID = "main") {
  return boxes.get(key(sessionID, agentID))?.length ?? 0
}

/** Prompt text shown to the model. Steering notes are framed as a correction. */
export function render(notes: Note[]) {
  return [
    "<system-reminder>",
    ...notes.map((note) =>
      note.steer
        ? `COURSE CORRECTION from the user (apply it to your next action): ${note.text}`
        : `Side note from the user, sent while you were working (not a new task; take it into account): ${note.text}`,
    ),
    "</system-reminder>",
  ].join("\n")
}
