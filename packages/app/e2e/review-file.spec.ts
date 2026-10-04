import { test, expect } from "@playwright/test"
import { execFile } from "node:child_process"
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { promisify } from "node:util"

test("nested Git review opens the actual source file in a tab", async ({ page, request }) => {
  page.setDefaultTimeout(10_000)
  const root = await mkdtemp(join(tmpdir(), "async-coder-review-"))
  const directory = join(root, "packages", "nested")
  const git = promisify(execFile)
  const server = `http://${process.env.PLAYWRIGHT_SERVER_HOST ?? "127.0.0.1"}:${process.env.PLAYWRIGHT_SERVER_PORT ?? "4096"}`
  const scope = `directory=${encodeURIComponent(directory)}`
  const sessions: string[] = []
  try {
    await mkdir(directory, { recursive: true })
    await git("git", ["init", root])
    await writeFile(join(directory, "example.ts"), "export const greeting = 'before'\n")
    await git("git", ["-C", root, "add", "."])
    await git("git", ["-C", root, "-c", "user.name=UI Test", "-c", "user.email=ui@example.invalid", "-c", "commit.gpgsign=false", "commit", "-m", "fixture"])
    await writeFile(join(directory, "example.ts"), "export const greeting = 'source file opened from review'\n")
    const response = await request.post(`${server}/session?${scope}`, { data: { title: "Review navigation regression" } })
    expect(response.ok()).toBe(true)
    const session = await response.json() as { id: string }
    sessions.push(session.id)
    expect((await request.get(`${server}/project/current?${scope}`)).ok()).toBe(true)
    await page.goto(`/${Buffer.from(directory).toString("base64url")}/session/${session.id}`)
    const toggle = page.getByRole("button", { name: "Toggle review", exact: true })
    await expect(toggle).toHaveAttribute("aria-expanded", /true|false/)
    if (await toggle.getAttribute("aria-expanded") !== "true") await toggle.click()
    await expect.poll(async () => {
      const changes = page.getByRole("button", { name: "Last turn changes", exact: true })
      if (await changes.getAttribute("aria-expanded") !== "true") await changes.click()
      return page.getByRole("option", { name: "Git changes", exact: true }).count()
    }).toBe(1)
    await page.getByRole("option", { name: "Git changes", exact: true }).click()
    const review = page.getByRole("heading", { name: "example.ts Open file +1 -1", exact: true })
    await expect(review).toBeVisible()
    await review.getByRole("button", { name: "Open file", exact: true }).click()
    await expect(page.getByRole("tab", { name: "example.ts", exact: true })).toHaveAttribute("aria-selected", "true")
    const content = page.locator('[role="tabpanel"] [data-line]')
    await expect(content).toContainText("source file opened from review")
    await page.screenshot({ path: ".artifacts/ui/review-file.png" })
  } finally {
    await Promise.allSettled(sessions.map((id) => request.delete(`${server}/session/${id}?${scope}`)))
    await request.post(`${server}/instance/dispose?${scope}`).catch(() => {})
    if (!root.startsWith(join(tmpdir(), "async-coder-review-"))) throw new Error("Unexpected test directory")
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
})
