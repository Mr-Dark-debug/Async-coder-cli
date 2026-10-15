# async-coder brand

One identity, two surfaces. The **TUI** (`packages/opencode/src/cli/cmd/tui`) and the **main UI**
(`packages/app`, `packages/ui`, `packages/desktop`, web) render the same mark but never share
rendering code: the TUI draws the glyph and wordmark with box-drawing characters, the main UI
uses the SVG components in `packages/ui/src/components/logo.tsx`.

## Mark

A prompt chevron (`>`) travelling inside an open orbit, with a satellite dot sitting in the gap:
*a coding prompt running as an asynchronous loop*. It reads at 16 px (use the `small` variant)
and in one colour.

| File | Use |
| --- | --- |
| `mark.svg` | App icon, squircle, lavender gradient (prod) |
| `mark-beta.svg`, `mark-dev.svg` | Beta (deep purple) and dev (ink) channel icons |
| `mark-small.svg` | Favicon / tray, heavier strokes |
| `glyph.svg`, `glyph-lavender.svg` | Single-colour glyph (`currentColor` / lavender) |
| `wordmark-dark.svg`, `wordmark-light.svg` | `async-coder` monoline wordmark (ink / paper) |
| `lockup-dark.svg`, `lockup-light.svg` | Mark + wordmark, horizontal |

## Palette

| Token | Hex |
| --- | --- |
| lavender (primary) | `#B197FC` |
| light | `#C4B1FF` |
| mid | `#8F72F2` |
| deep | `#5B3FD1` |
| indigo | `#4C3FB5` |
| ink | `#14102B` |
| paper | `#F6F3FF` |

## Rules

- Only the async-coder mark/wordmark may identify the product in UI, installers, docs and the website.
  Third-party provider icons (Anthropic, OpenAI, ...) are allowed **only** where they identify a
  model provider in a picker.
- Keep clear space of one orbit-gap (the dot's diameter) around the mark; minimum size 16 px.
- Do not recolour outside the palette, rotate, or add outlines/shadows.

## Regenerating assets

All rasters are generated from `script/brand/mark.ts`:

```sh
mkdir -p /tmp/brandtools && cd /tmp/brandtools && bun add @resvg/resvg-js png2icons
BRAND_TOOLS=/tmp/brandtools bun script/brand/generate.ts          # --check lists what would change
```

The rasteriser is deliberately not a repository dependency. Files are regenerated in place at their
existing pixel size; git-symlinked asset folders are skipped (their real target is regenerated).
