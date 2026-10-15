// async-coder brand system: single source of truth for the mark, wordmark and lockup.
//
// The mark is a prompt chevron travelling inside an open orbit with a satellite dot sitting in the
// gap: "a coding prompt running as an asynchronous loop". All geometry is hand-authored vector paths
// (no fonts), so every asset renders identically in browsers, resvg, Electron and the terminal docs.

export const palette = {
  lavender: "#B197FC",
  light: "#C4B1FF",
  mid: "#8F72F2",
  deep: "#5B3FD1",
  indigo: "#4C3FB5",
  ink: "#14102B",
  paper: "#F6F3FF",
  white: "#FFFFFF",
} as const

export type Variant = "prod" | "beta" | "dev"

const variants = {
  prod: { from: palette.light, to: palette.mid, glyph: palette.ink, dot: palette.white },
  beta: { from: "#7C5CF0", to: palette.indigo, glyph: palette.white, dot: palette.light },
  dev: { from: palette.ink, to: palette.ink, glyph: palette.lavender, dot: palette.white },
} as const

// Geometry on a 256 grid. Orbit centre (128,128) r=84, gap centred at -50deg.
const ORBIT = "M204.1 92.5A84 84 0 1 1 149.7 46.9"
const CHEVRON = "M98 84L150 128L98 172"
const DOT = { cx: 182, cy: 63.7, r: 13 }

/** Chunky variant for <= 32px renders. */
const SMALL = {
  orbit: "M204.1 92.5A84 84 0 1 1 149.7 46.9",
  orbitWidth: 20,
  chevronWidth: 30,
  dot: { cx: 182, cy: 63.7, r: 17 },
}

type MarkOptions = { variant?: Variant; small?: boolean; bg?: "squircle" | "round" | "none" | "full"; padding?: number }

/** The app icon: squircle (or full-bleed / round / transparent) with the glyph. */
export function mark(options: MarkOptions = {}) {
  const v = variants[options.variant ?? "prod"]
  const small = options.small ?? false
  const bg = options.bg ?? "squircle"
  const pad = options.padding ?? 0
  const scale = 1 - pad * 2
  const offset = (256 * (1 - scale)) / 2
  const orbitWidth = small ? SMALL.orbitWidth : 14
  const chevronWidth = small ? SMALL.chevronWidth : 22
  const dot = small ? SMALL.dot : DOT
  const bgShape =
    bg === "none"
      ? ""
      : bg === "round"
        ? `<circle cx="128" cy="128" r="128" fill="url(#g)"/>`
        : bg === "full"
          ? `<rect width="256" height="256" fill="url(#g)"/>`
          : `<rect width="256" height="256" rx="58" fill="url(#g)"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none">
<defs><linearGradient id="g" x1="24" y1="8" x2="232" y2="248" gradientUnits="userSpaceOnUse"><stop stop-color="${v.from}"/><stop offset="1" stop-color="${v.to}"/></linearGradient></defs>
${bgShape}
<g transform="translate(${offset} ${offset}) scale(${scale})" stroke-linecap="round" stroke-linejoin="round">
<path d="${ORBIT}" stroke="${v.glyph}" stroke-width="${orbitWidth}"/>
<path d="${CHEVRON}" stroke="${v.glyph}" stroke-width="${chevronWidth}"/>
<circle cx="${dot.cx}" cy="${dot.cy}" r="${dot.r}" fill="${v.dot}"/>
</g>
</svg>
`
}

/** Single-colour glyph for trays, monochrome UI, and CSS-variable theming. */
export function glyph(color = "currentColor", strokeWeight: "regular" | "bold" = "regular") {
  const o = strokeWeight === "bold" ? 20 : 14
  const c = strokeWeight === "bold" ? 30 : 22
  const d = strokeWeight === "bold" ? 17 : 13
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="24 24 208 208" fill="none" stroke-linecap="round" stroke-linejoin="round">
<path d="${ORBIT}" stroke="${color}" stroke-width="${o}"/>
<path d="${CHEVRON}" stroke="${color}" stroke-width="${c}"/>
<circle cx="${DOT.cx}" cy="${DOT.cy}" r="${d}" fill="${color}"/>
</svg>
`
}

// Monoline letterforms. Baseline y=40, x-height top y=12, ascender y=0, descender y=52.
type Letter = { advance: number; d?: string; circle?: { cx: number; cy: number; r: number }; extra?: string }
const LETTERS: Record<string, Letter> = {
  a: { advance: 42, circle: { cx: 14, cy: 26, r: 14 }, d: "M28 12V40" },
  s: { advance: 36, d: "M25 17C21 12 8 12 8 20C8 28 25 25 25 33C25 41 9 41 4 35" },
  y: { advance: 38, d: "M1 12L14 40M27 12L11 50" },
  n: { advance: 40, d: "M2 12V40M2 24C4 8 26 8 26 24V40" },
  c: { advance: 36, d: "M24.7 17A14 14 0 1 0 24.7 35" },
  "-": { advance: 24, d: "M2 26H14" },
  o: { advance: 42, circle: { cx: 14, cy: 26, r: 14 } },
  d: { advance: 42, circle: { cx: 14, cy: 26, r: 14 }, d: "M28 0V40" },
  e: { advance: 40, d: "M0 26H28C28 17 22 12 14 12C6 12 0 18 0 26C0 34 6 40 14 40C20 40 25 37 27 33" },
  r: { advance: 30, d: "M2 12V40M2 26C2 15 12 10 24 12" },
}

const TEXT = "async-coder"

function wordmarkBody(color: string, accent: string) {
  let x = 0
  const parts: string[] = []
  for (const ch of TEXT) {
    const l = LETTERS[ch]
    const stroke = ch === "-" ? accent : color
    const shapes = [
      l.circle ? `<circle cx="${l.circle.cx}" cy="${l.circle.cy}" r="${l.circle.r}"/>` : "",
      l.d ? `<path d="${l.d}"/>` : "",
    ].join("")
    parts.push(`<g transform="translate(${x} 0)" stroke="${stroke}">${shapes}</g>`)
    x += l.advance
  }
  return { body: parts.join(""), width: x }
}

export function wordmark(color = "currentColor", accent: string = palette.lavender) {
  const { body, width } = wordmarkBody(color, accent)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 ${width + 6} 64" fill="none" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
${body}
</svg>
`
}

/** Mark + wordmark, horizontal. */
export function lockup(color: string = palette.ink, variant: Variant = "prod") {
  const { body, width } = wordmarkBody(color, palette.lavender)
  const v = variants[variant]
  const markSize = 64
  const gap = 18
  const totalW = markSize + gap + width
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -6 ${totalW + 6} 76" fill="none">
<defs><linearGradient id="g" x1="0" y1="0" x2="${markSize}" y2="${markSize}" gradientUnits="userSpaceOnUse"><stop stop-color="${v.from}"/><stop offset="1" stop-color="${v.to}"/></linearGradient></defs>
<g transform="translate(0 0) scale(${markSize / 256})" stroke-linecap="round" stroke-linejoin="round">
<rect width="256" height="256" rx="58" fill="url(#g)"/>
<path d="${ORBIT}" stroke="${v.glyph}" stroke-width="14"/>
<path d="${CHEVRON}" stroke="${v.glyph}" stroke-width="22"/>
<circle cx="${DOT.cx}" cy="${DOT.cy}" r="${DOT.r}" fill="${v.dot}"/>
</g>
<g transform="translate(${markSize + gap} 6)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">${body}</g>
</svg>
`
}

/** Paths for UI components that need to embed the glyph with CSS variables. */
export const paths = { orbit: ORBIT, chevron: CHEVRON, dot: DOT, letters: LETTERS, text: TEXT }

/** Terminal glyphs: 16-colour safe, no emoji. */
export const terminal = {
  badge: ["╭──╮ ·", "│ >│", "╰──╯"],
  badgeAscii: ["+--+ .", "| >|", "+--+"],
}
