#!/usr/bin/env bun
// Regenerates every async-coder brand asset from script/brand/mark.ts.
//
//   BRAND_TOOLS=<dir containing node_modules with @resvg/resvg-js and png2icons> bun script/brand/generate.ts [--check]
//
// The rasteriser is intentionally not a repository dependency (it would touch bun.lock); install it in a
// scratch directory: `bun add @resvg/resvg-js png2icons`. Files are regenerated *in place* at their
// existing pixel size, so no import or manifest has to change.
import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"
import { glyph, lockup, mark, palette, wordmark, type Variant } from "./mark"

const root = path.resolve(import.meta.dir, "../..")
const tools = process.env.BRAND_TOOLS
if (!tools) throw new Error("Set BRAND_TOOLS to a directory that has @resvg/resvg-js and png2icons installed")
const need = createRequire(path.join(tools, "package.json"))
const { Resvg } = need("@resvg/resvg-js") as typeof import("@resvg/resvg-js")
const png2icons = need("png2icons") as {
  createICO(input: Buffer, scale: number, colors: number, usePng: boolean, forWinExe: boolean): Buffer | null
  createICNS(input: Buffer, scale: number, colors: number): Buffer | null
  BICUBIC: number
}

const check = process.argv.includes("--check")
const touched: string[] = []

// Several asset folders are git symlinks into packages/ui. On Windows checkouts they are tiny text files;
// overwriting them would turn the symlink into binary garbage, so they are skipped (the target is
// regenerated through its real path).
const symlinks = new Set(
  Bun.spawnSync(["git", "ls-files", "-s"], { cwd: root })
    .stdout.toString()
    .split("\n")
    .filter((line) => line.startsWith("120000"))
    .map((line) => line.split("\t")[1]),
)
const isLink = (rel: string) => symlinks.has(rel.replaceAll("\\", "/"))

const png = (svg: string, width: number, height?: number, background?: string) => {
  if (!Number.isInteger(width) || width < 1 || width > 8192) throw new Error(`invalid raster width ${width}`)
  const r = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    background,
    font: { loadSystemFonts: true, defaultFontFamily: "Segoe UI" },
  }).render()
  if (height && r.height !== height) {
    // Non-square canvases are produced by the composed SVGs below with matching aspect ratios.
    return new Resvg(svg, { fitTo: { mode: "height", value: height }, background, font: { loadSystemFonts: true, defaultFontFamily: "Segoe UI" } }).render().asPng()
  }
  return r.asPng()
}

const write = (file: string, data: string | Uint8Array) => {
  if (isLink(file)) return
  const full = path.join(root, file)
  if (!fs.existsSync(path.dirname(full))) fs.mkdirSync(path.dirname(full), { recursive: true })
  touched.push(file)
  if (process.env.BRAND_VERBOSE) console.log("write", file)
  if (!check) fs.writeFileSync(full, data)
}

const dims = (file: string) => {
  if (isLink(file)) return { width: 16, height: 16 } // skipped by write(); any valid size works
  const buf = fs.readFileSync(path.join(root, file))
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

const ico = (variant: Variant) => {
  const big = png(mark({ variant }), 1024)
  const out = png2icons.createICO(Buffer.from(big), png2icons.BICUBIC, 0, true, true)
  if (!out) throw new Error("ICO generation failed")
  return out
}
const icns = (variant: Variant) => {
  const big = png(mark({ variant }), 1024)
  const out = png2icons.createICNS(Buffer.from(big), png2icons.BICUBIC, 0)
  if (!out) throw new Error("ICNS generation failed")
  return out
}
const smallIco = () => {
  const big = png(mark({ small: true }), 256)
  const out = png2icons.createICO(Buffer.from(big), png2icons.BICUBIC, 0, true, false)
  if (!out) throw new Error("favicon ICO failed")
  return out
}

const TAGLINE = "Asynchronous AI coding agent"

const social = (theme: "dark" | "black" | "zen") => {
  const bg = theme === "black" ? "#000000" : palette.ink
  const sub = theme === "zen" ? "Zen — curated free and low-cost models" : TAGLINE
  const body = lockup(palette.paper).replace("<svg ", '<svg x="190" y="200" width="820" height="150" ')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="${bg}"/>
<circle cx="1040" cy="90" r="260" fill="${palette.deep}" opacity="0.22"/>
<circle cx="120" cy="560" r="200" fill="${palette.lavender}" opacity="0.12"/>
${body}
<text x="600" y="440" text-anchor="middle" font-family="Segoe UI, Inter, Arial, sans-serif" font-size="38" fill="${palette.light}">${sub}</text>
</svg>`
}

const banner = () => `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="380" viewBox="0 0 1280 380">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1280" y2="380" gradientUnits="userSpaceOnUse"><stop stop-color="${palette.ink}"/><stop offset="1" stop-color="#2A1F6B"/></linearGradient></defs>
<rect width="1280" height="380" fill="url(#bg)"/>
<circle cx="1120" cy="40" r="240" fill="${palette.deep}" opacity="0.3"/>
${lockup(palette.paper).replace("<svg ", '<svg x="250" y="110" width="780" height="143" ')}
<text x="640" y="305" text-anchor="middle" font-family="Segoe UI, Inter, Arial, sans-serif" font-size="30" fill="${palette.light}">${TAGLINE}</text>
</svg>`

// ---------------------------------------------------------------------------------------------
// 1. Sources
// ---------------------------------------------------------------------------------------------
write("assets/brand/mark.svg", mark())
write("assets/brand/mark-beta.svg", mark({ variant: "beta" }))
write("assets/brand/mark-dev.svg", mark({ variant: "dev" }))
write("assets/brand/mark-small.svg", mark({ small: true }))
write("assets/brand/glyph.svg", glyph("currentColor"))
write("assets/brand/glyph-lavender.svg", glyph(palette.lavender))
write("assets/brand/wordmark-dark.svg", wordmark(palette.ink))
write("assets/brand/wordmark-light.svg", wordmark(palette.paper))
write("assets/brand/lockup-dark.svg", lockup(palette.ink))
write("assets/brand/lockup-light.svg", lockup(palette.paper))
write("assets/brand/icon-1024.png", png(mark(), 1024))
write("assets/brand/social.png", png(social("dark"), 1200))
write("assets/readme/async-coder-banner.png", png(banner(), 1280))

// ---------------------------------------------------------------------------------------------
// 2. Web / app favicons (same file set repeated across surfaces)
// ---------------------------------------------------------------------------------------------
const webDirs = [
  "packages/app/public",
  "packages/console/app/public",
  "packages/web/public",
  "packages/enterprise/public",
  "packages/ui/src/assets/favicon",
]
for (const dir of webDirs) {
  for (const name of fs.readdirSync(path.join(root, dir))) {
    const rel = `${dir}/${name}`
    const lower = name.toLowerCase()
    if (/^favicon.*\.svg$/.test(lower)) write(rel, mark({ small: true }))
    else if (/^favicon.*\.ico$/.test(lower)) write(rel, smallIco())
    else if (/^favicon-96x96.*\.png$/.test(lower)) write(rel, png(mark({ small: true }), 96))
    else if (/^apple-touch-icon.*\.png$/.test(lower)) write(rel, png(mark({ bg: "full" }), dims(rel).width))
    else if (/^web-app-manifest-.*\.png$/.test(lower)) write(rel, png(mark({ bg: "full", padding: 0.1 }), dims(rel).width))
    else if (lower === "social-share-zen.png") write(rel, png(social("zen"), dims(rel).width))
    else if (lower === "social-share.png") write(rel, png(social("dark"), dims(rel).width))
  }
}
for (const [file, theme] of [
  ["packages/ui/src/assets/images/social-share.png", "dark"],
  ["packages/ui/src/assets/images/social-share-zen.png", "zen"],
  ["packages/ui/src/assets/images/social-share-black.png", "black"],
] as const) {
  if (fs.existsSync(path.join(root, file))) write(file, png(social(theme), dims(file).width))
}

// ---------------------------------------------------------------------------------------------
// 3. Desktop icons (prod / beta / dev)
// ---------------------------------------------------------------------------------------------
const walk = (dir: string): string[] =>
  fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]))

for (const variant of ["prod", "beta", "dev"] as const) {
  const base = `packages/desktop/icons/${variant}`
  for (const rel of walk(base)) {
    const lower = path.basename(rel).toLowerCase()
    if (lower.endsWith(".ico")) write(rel, ico(variant))
    else if (lower.endsWith(".icns")) write(rel, icns(variant))
    else if (lower.endsWith(".png")) {
      const { width } = dims(rel)
      if (rel.includes("/android/") && lower.includes("foreground")) write(rel, png(mark({ variant, bg: "none", padding: 0.18 }), width))
      else if (rel.includes("/android/") && lower.includes("round")) write(rel, png(mark({ variant, bg: "round" }), width))
      else if (rel.includes("/ios/")) write(rel, png(mark({ variant, bg: "full" }), width))
      else write(rel, png(mark({ variant, small: width <= 48 }), width))
    }
  }
}

// ---------------------------------------------------------------------------------------------
// 4. Identity package, VS Code / Zed extensions, email logos
// ---------------------------------------------------------------------------------------------
write("packages/identity/mark.svg", mark({ bg: "full" }))
write("packages/identity/mark-light.svg", mark({ variant: "dev", bg: "full" }))
for (const [name, variant] of [
  ["mark-96x96.png", "prod"],
  ["mark-192x192.png", "prod"],
  ["mark-512x512.png", "prod"],
  ["mark-512x512-light.png", "dev"],
] as const) {
  const rel = `packages/identity/${name}`
  if (fs.existsSync(path.join(root, rel))) write(rel, png(mark({ variant, bg: "full" }), dims(rel).width))
}
if (fs.existsSync(path.join(root, "sdks/vscode/images/icon.png"))) write("sdks/vscode/images/icon.png", png(mark(), dims("sdks/vscode/images/icon.png").width))
if (fs.existsSync(path.join(root, "packages/extensions/zed/icons/opencode.svg"))) write("packages/extensions/zed/icons/async-coder.svg", glyph("currentColor", "bold"))
for (const rel of ["packages/console/mail/emails/templates/static/logo.png", "packages/console/mail/emails/templates/static/zen-logo.png"]) {
  if (fs.existsSync(path.join(root, rel))) write(rel, png(lockup(palette.ink), dims(rel).width))
}

// ---------------------------------------------------------------------------------------------
// 5. Inherited console / docs / website brand folders (names are preserved or renamed by script/brand/rename.ts)
// ---------------------------------------------------------------------------------------------
type Kind = "square" | "glyph" | "wordmark" | "lockup" | "icon" | "preview"

const kindOf = (name: string): Kind | undefined => {
  const n = name.toLowerCase()
  if (n.startsWith("preview-")) return "preview"
  if (n.includes("desktop-icon") || n.includes("desktop-app-icon") || n === "dock.png") return "icon"
  if (n.includes("ornate") || n.includes("brand-assets") || n === "logo.svg") return "lockup"
  if (n.includes("wordmark")) return "wordmark"
  if (n.includes("square")) return "square"
  if (n.includes("logo")) return "glyph"
  return undefined
}
const onDark = (name: string) => /(^|[-_.])dark([-_.]|$)/i.test(name)

const canvas = (w: number, h: number, inner: string, bg?: string, inset = 0.14) => {
  const iw = w * (1 - inset * 2)
  const ih = h * (1 - inset * 2)
  const body = inner.replace("<svg ", `<svg x="${w * inset}" y="${h * inset}" width="${iw}" height="${ih}" preserveAspectRatio="xMidYMid meet" `)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ""}${body}</svg>`
}

const brandSvg = (kind: Kind, dark: boolean) => {
  const ink = dark ? palette.paper : palette.ink
  if (kind === "square") return mark({ variant: "prod" })
  if (kind === "glyph") return glyph(dark ? palette.paper : palette.ink)
  if (kind === "wordmark") return wordmark(ink)
  if (kind === "lockup") return lockup(ink)
  return mark()
}

const folders = [
  "packages/console/app/src/asset",
  "packages/console/app/src/asset/lander",
  "packages/console/app/src/asset/brand",
  "packages/web/src/assets",
  "async-coder-website/public",
]
for (const folder of folders) {
  if (!fs.existsSync(path.join(root, folder))) continue
  for (const entry of fs.readdirSync(path.join(root, folder), { withFileTypes: true })) {
    if (!entry.isFile()) continue
    const rel = `${folder}/${entry.name}`
    const lower = entry.name.toLowerCase()
    const kind = kindOf(entry.name)
    if (!kind || isLink(rel)) continue
    if (/(provider|go-ornate|zen-ornate)/.test(lower)) {
      // Product sub-brands keep their own lockup text but use the async-coder mark.
      if (lower.endsWith(".svg")) write(rel, lockup(onDark(lower) ? palette.paper : palette.ink))
      continue
    }
    const dark = onDark(lower)
    const svg = brandSvg(kind, dark)
    if (lower.endsWith(".svg")) {
      write(rel, svg)
    } else if (lower.endsWith(".png")) {
      const { width, height } = dims(rel)
      if (kind === "icon") write(rel, png(mark(), width))
      else if (kind === "preview") {
        const bg = dark ? palette.ink : palette.paper
        const inner = brandSvg(/wordmark/.test(lower) ? "wordmark" : /square/.test(lower) ? "square" : "glyph", dark)
        write(rel, png(canvas(width, height, inner, bg, /square/.test(lower) ? 0.12 : 0.22), width))
      } else write(rel, png(canvas(width, height, svg, undefined, kind === "square" ? 0 : 0.08), width))
    }
  }
}
// Landing artwork that is a plain logo render:
for (const rel of ["packages/console/app/src/asset/lander/brand.png"]) {
  if (fs.existsSync(path.join(root, rel)) && !isLink(rel)) write(rel, png(banner().replace('width="1280" height="380" viewBox="0 0 1280 380"', 'width="1200" height="675" viewBox="0 0 1280 380" preserveAspectRatio="xMidYMid slice"'), 1200))
}

console.log(`${check ? "would write" : "wrote"} ${touched.length} files`)
if (check) for (const f of touched) console.log(" ", f)
