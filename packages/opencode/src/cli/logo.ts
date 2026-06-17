function pad(lines: string[]) {
  const width = Math.max(...lines.map((line) => line.length))
  return lines.map((line) => line.padEnd(width))
}

export const logo = {
  left: pad([
    "                               ",
    "                               ",
    "  ███   █████ █   █ █   █  ███ ",
    " █   █ █       █ █  ██  █ █   █",
    "     █ █        █   █ █ █ █    ",
    "  ████  ████    █   █  ██ █    ",
    " █   █      █   █   █   █ █   █",
    "  ████ █████    █   █   █  ███ ",
  ]),
  right: pad([
    "                               ",
    "                               ",
    "  ███   ███  ████  █████ ████ ",
    " █   █ █   █ █   █ █     █   █",
    " █     █   █ █   █ █     █   █",
    " █     █   █ █   █ ████  ████ ",
    " █   █ █   █ █   █ █     █ █  ",
    "  ███   ███  ████  █████ █  ██",
  ]),
}

export const logoThin = {
  left: pad([
    "                    ",
    "                    ",
    "  ██   ███  █  █ █  █",
    "   █  █      ██  ██ █",
    " ███   ██    █   █ ██",
    "█  █     █   █   █  █",
    " ███  ███    █   █  █",
  ]),
  right: pad([
    "                    ",
    "                    ",
    "  ██   ██  ███  ███ ███",
    " █    █  █ █  █ █   █  █",
    " █    █  █ █  █ ██  ███",
    " █    █  █ █  █ █   █ █",
    "  ██   ██  ███  ███ █  █",
  ]),
}

export const logos = {
  thin: logoThin,
  classic: logo,
} as const

export type LogoKey = keyof typeof logos

export const go = {
  left: pad(["     ", "  █  ", " ███ ", "█   █"]),
  right: pad(["     ", " ███ ", "   █ ", " ██  "]),
}

export const marks = "_^~,"
