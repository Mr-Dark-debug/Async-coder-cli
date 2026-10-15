import { ComponentProps } from "solid-js"

// async-coder brand marks. Geometry is generated from script/brand/mark.ts; keep the two in sync.
// A prompt chevron inside an open orbit with a satellite dot: a coding prompt running as an async loop.
const ORBIT = "M204.1 92.5A84 84 0 1 1 149.7 46.9"
const CHEVRON = "M98 84L150 128L98 172"

const Glyph = (props: { orbit: number; chevron: number }) => (
  <>
    <path data-slot="logo-orbit" d={ORBIT} stroke="var(--icon-weak-base)" stroke-width={props.orbit} stroke-linecap="round" />
    <path data-slot="logo-chevron" d={CHEVRON} stroke="var(--icon-strong-base)" stroke-width={props.chevron} stroke-linecap="round" stroke-linejoin="round" />
    <circle data-slot="logo-dot" cx="182" cy="63.7" r={props.chevron > 24 ? 17 : 13} fill="var(--icon-base)" />
  </>
)

export const Mark = (props: { class?: string }) => {
  return (
    <svg
      data-component="logo-mark"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="24 24 208 208"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <Glyph orbit={20} chevron={30} />
    </svg>
  )
}

export const Splash = (props: Pick<ComponentProps<"svg">, "ref" | "class">) => {
  return (
    <svg
      ref={props.ref}
      data-component="logo-splash"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="24 24 208 208"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <Glyph orbit={14} chevron={22} />
    </svg>
  )
}

export const Logo = (props: { class?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="-6 -6 412 64"
      fill="none"
      stroke-width="7"
      stroke-linecap="round"
      stroke-linejoin="round"
      classList={{ [props.class ?? ""]: !!props.class }}
    >
      <g>
        <g transform="translate(0 0)" stroke="var(--icon-strong-base)">
          <circle cx="14" cy="26" r="14" />
          <path d="M28 12V40" />
        </g>
        <g transform="translate(42 0)" stroke="var(--icon-strong-base)">
          <path d="M25 17C21 12 8 12 8 20C8 28 25 25 25 33C25 41 9 41 4 35" />
        </g>
        <g transform="translate(78 0)" stroke="var(--icon-strong-base)">
          <path d="M1 12L14 40M27 12L11 50" />
        </g>
        <g transform="translate(116 0)" stroke="var(--icon-strong-base)">
          <path d="M2 12V40M2 24C4 8 26 8 26 24V40" />
        </g>
        <g transform="translate(156 0)" stroke="var(--icon-strong-base)">
          <path d="M24.7 17A14 14 0 1 0 24.7 35" />
        </g>
        <g transform="translate(192 0)" stroke="var(--icon-weak-base)">
          <path d="M2 26H14" />
        </g>
        <g transform="translate(216 0)" stroke="var(--icon-strong-base)">
          <path d="M24.7 17A14 14 0 1 0 24.7 35" />
        </g>
        <g transform="translate(252 0)" stroke="var(--icon-strong-base)">
          <circle cx="14" cy="26" r="14" />
        </g>
        <g transform="translate(294 0)" stroke="var(--icon-strong-base)">
          <circle cx="14" cy="26" r="14" />
          <path d="M28 0V40" />
        </g>
        <g transform="translate(336 0)" stroke="var(--icon-strong-base)">
          <path d="M0 26H28C28 17 22 12 14 12C6 12 0 18 0 26C0 34 6 40 14 40C20 40 25 37 27 33" />
        </g>
        <g transform="translate(376 0)" stroke="var(--icon-strong-base)">
          <path d="M2 12V40M2 26C2 15 12 10 24 12" />
        </g>
      </g>
    </svg>
  )
}
