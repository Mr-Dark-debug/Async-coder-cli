import { test, expect } from "@playwright/test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

test("session tabs switch, persist, and close without deleting sessions", async ({ page, request }) => {
  const directory = await mkdtemp(join(tmpdir(), "async-coder-tabs-"))
  const server = `http://${process.env.PLAYWRIGHT_SERVER_HOST ?? "127.0.0.1"}:${process.env.PLAYWRIGHT_SERVER_PORT ?? "4096"}`
  const scope = `directory=${encodeURIComponent(directory)}`
  const sessions: string[] = []
  try {
    const firstResponse = await request.post(`${server}/session?${scope}`, { data: { title: "Tab regression one" } })
    expect(firstResponse.ok()).toBe(true)
    const first = await firstResponse.json() as { id: string }
    sessions.push(first.id)
    const secondResponse = await request.post(`${server}/session?${scope}`, { data: { title: "Tab regression two" } })
    expect(secondResponse.ok()).toBe(true)
    const second = await secondResponse.json() as { id: string }
    sessions.push(second.id)
    const route = `/${Buffer.from(directory).toString("base64url")}/session`
    await page.goto(`${route}/${first.id}`)
    await expect(page.getByRole("tab", { name: "Tab regression one", exact: true })).toHaveAttribute("aria-selected", "true")
    await page.goto(`${route}/${second.id}`)
    await expect(page.getByRole("tab", { name: "Tab regression two", exact: true })).toHaveAttribute("aria-selected", "true")
    await page.getByRole("tab", { name: "Tab regression one", exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`${first.id}$`))
    await page.getByRole("tab", { name: "Tab regression two", exact: true }).click()
    await page.getByRole("button", { name: "Close tab Tab regression two", exact: true }).click()
    await expect(page.getByRole("tab", { name: "Tab regression two", exact: true })).toHaveCount(0)
    await expect(page).toHaveURL(new RegExp(`${first.id}$`))
    expect((await request.get(`${server}/session/${second.id}?${scope}`)).status()).toBe(200)
    await page.reload()
    await expect(page.getByRole("tab", { name: "Tab regression one", exact: true })).toHaveAttribute("aria-selected", "true")
    await expect(page.getByRole("tab", { name: "Tab regression two", exact: true })).toHaveCount(0)
    await page.screenshot({ path: ".artifacts/ui/session-tabs.png" })
    await page.getByRole("button", { name: "Close tab Tab regression one", exact: true }).click()
    await expect(page.getByRole("tab", { name: "Tab regression one", exact: true })).toHaveCount(0)
    await expect(page.getByRole("tab", { name: "New session", exact: true })).toBeVisible()
    expect((await request.get(`${server}/session/${first.id}?${scope}`)).status()).toBe(200)
  } finally {
    await Promise.all(sessions.map((id) => request.delete(`${server}/session/${id}?${scope}`)))
    if (!directory.startsWith(join(tmpdir(), "async-coder-tabs-"))) throw new Error("Unexpected test directory")
    await rm(directory, { recursive: true, force: true })
  }
})
