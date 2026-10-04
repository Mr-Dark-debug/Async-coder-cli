import path from "node:path"

const root = path.resolve(import.meta.dir, "..")
const workspace: { workspaces: { packages: string[] } } = await Bun.file(path.join(root, "package.json")).json()
const files = [
  ...new Set(
    workspace.workspaces.packages.flatMap((pattern) =>
      Array.from(new Bun.Glob(`${pattern}/package.json`).scanSync({ cwd: root })),
    ),
  ),
]
const packages = (
  await Promise.all(
    files.map(async (file) => {
      const pkg: { scripts?: Record<string, string> } = await Bun.file(path.join(root, file)).json()
      return pkg.scripts?.typecheck ? path.dirname(file) : undefined
    }),
  )
).filter((directory): directory is string => directory !== undefined)
const results = await Promise.all(
  packages.map(async (directory) => {
    const child = Bun.spawn([process.execPath, "typecheck"], {
      cwd: path.join(root, directory),
      stdout: "pipe",
      stderr: "pipe",
    })
    const [stdout, stderr, code] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ])
    console.log(`${code === 0 ? "PASS" : "FAIL"} ${directory}`)
    if (code !== 0) console.error(stdout + stderr)
    return code
  }),
)
if (results.some((code) => code !== 0)) process.exit(1)
