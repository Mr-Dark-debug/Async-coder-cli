export type Cron = { minute: number[]; hour: number[]; dom: number[]; month: number[]; dow: number[]; domStar: boolean; dowStar: boolean }

const FIELDS: [string, number, number][] = [
  ["minute", 0, 59],
  ["hour", 0, 23],
  ["day of month", 1, 31],
  ["month", 1, 12],
  ["day of week", 0, 7],
]

function field(text: string, name: string, lo: number, hi: number): number[] {
  const values = new Set<number>()
  for (const part of text.split(",")) {
    const [base, stepText] = part.split("/")
    const step = stepText === undefined ? 1 : Number(stepText)
    if (!Number.isInteger(step) || step < 1) throw new Error(`Invalid step in ${name}: ${part}`)
    const [from, to] =
      base === "*"
        ? [lo, hi]
        : base.includes("-")
          ? base.split("-").map(Number)
          : stepText !== undefined
            ? [Number(base), hi]
            : [Number(base), Number(base)]
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < lo || to > hi || from > to)
      throw new Error(`Invalid ${name} value: ${part}`)
    for (let value = from; value <= to; value += step) values.add(value)
  }
  return [...values].sort((a, b) => a - b)
}

/** Parse a standard 5-field cron expression (minute hour day-of-month month day-of-week). */
export function parse(expression: string): Cron {
  const parts = expression.trim().split(/\s+/)
  if (parts.length !== 5) throw new Error(`A cron expression has 5 fields, got ${parts.length}: "${expression}"`)
  const [minute, hour, dom, month, dow] = parts.map((text, i) => field(text, FIELDS[i][0], FIELDS[i][1], FIELDS[i][2]))
  return {
    minute,
    hour,
    dom,
    month,
    // 7 is Sunday too
    dow: [...new Set(dow.map((d) => d % 7))].sort((a, b) => a - b),
    domStar: parts[2].startsWith("*"),
    dowStar: parts[4].startsWith("*"),
  }
}

/** True when `date` (local time) is a minute at which the expression fires. */
export function matches(cron: Cron, date: Date) {
  if (!cron.minute.includes(date.getMinutes()) || !cron.hour.includes(date.getHours()) || !cron.month.includes(date.getMonth() + 1)) return false
  const dom = cron.dom.includes(date.getDate())
  const dow = cron.dow.includes(date.getDay())
  // Standard cron: when both day fields are restricted, either may match.
  if (!cron.domStar && !cron.dowStar) return dom || dow
  return dom && dow
}

/** The next firing strictly after `from` (local time), searching up to four years ahead. */
export function next(cron: Cron, from: Date) {
  const at = new Date(from)
  at.setSeconds(0, 0)
  at.setMinutes(at.getMinutes() + 1)
  for (let i = 0; i < 4 * 366 * 24 * 60; i++) {
    if (matches(cron, at)) return at
    at.setMinutes(at.getMinutes() + 1)
  }
  return undefined
}
