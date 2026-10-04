import type { Status } from "./state"

export type QuietHours = { start: string; end: string }

const minutes = (value: string) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value)
  if (!match) return undefined
  return Number(match[1]) * 60 + Number(match[2])
}

/** True when `now` falls inside quiet hours. Ranges may wrap midnight (22:00 to 07:00). */
export function quiet(hours: QuietHours | undefined, now = new Date()) {
  if (!hours) return false
  const start = minutes(hours.start)
  const end = minutes(hours.end)
  if (start === undefined || end === undefined || start === end) return false
  const current = now.getHours() * 60 + now.getMinutes()
  return start < end ? current >= start && current < end : current >= start || current < end
}

/** Terminal escape sequences that announce a finished job: bell plus an OSC 9 desktop notification. */
export function sequences(input: { title: string; status: Status }) {
  const text = `${input.status === "done" ? "Finished" : input.status === "failed" ? "Failed" : "Stopped"}: ${input.title}`
    .replace(/[\x00-\x1f\x7f]/g, " ")
    .slice(0, 120)
  return `\x07\x1b]9;${text}\x07`
}

/** Decide whether a completed job should notify now. Each job notifies at most once. */
export function shouldNotify(input: { notified: boolean; status: Status; quietHours?: QuietHours; now?: Date }) {
  if (input.notified) return false
  if (input.status !== "done" && input.status !== "failed") return false
  return !quiet(input.quietHours, input.now)
}
