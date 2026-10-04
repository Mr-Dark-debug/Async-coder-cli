async function git(directory: string, args: string[]) {
  const child = Bun.spawn(["git", "-c", "core.fsmonitor=false", ...args], { cwd: directory, stdout: "pipe", stderr: "pipe" })
  const [out, err, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited])
  if (code !== 0) throw new Error(err.trim() || out.trim() || `git ${args[0]} failed (${code})`)
  return out.trim()
}

/** Commit every change in `directory`. Returns the new commit, or undefined when there was nothing to commit. */
export async function commitAll(directory: string, message: string) {
  if (!(await git(directory, ["status", "--porcelain=v1"]))) return undefined
  await git(directory, ["add", "-A"])
  await git(directory, ["-c", "user.name=async-coder", "-c", "user.email=async-coder@localhost", "commit", "-m", message])
  return git(directory, ["rev-parse", "HEAD"])
}

export { git }

/** Files touched and lines changed in the working tree, including untracked files. */
export async function changeSummary(directory: string) {
  const status = await git(directory, ["status", "--porcelain=v1"])
  const lines = status.split("\n").filter(Boolean)
  const files = lines.map((line) => line.slice(3).trim())
  const numstat = await git(directory, ["diff", "HEAD", "--numstat"]).catch(() => "")
  const tracked = numstat
    .split("\n")
    .filter(Boolean)
    .reduce((total, line) => {
      const [added, removed] = line.split("\t")
      return total + (Number(added) || 0) + (Number(removed) || 0)
    }, 0)
  const untracked = await Promise.all(
    lines
      .filter((line) => line.startsWith("??"))
      .map((line) => Bun.file(`${directory}/${line.slice(3).trim()}`).text().then((text) => text.split("\n").length).catch(() => 0)),
  )
  return { files, lines: tracked + untracked.reduce((a, b) => a + b, 0) }
}
