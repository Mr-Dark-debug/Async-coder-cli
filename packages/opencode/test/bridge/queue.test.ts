import { expect, test } from "bun:test"
import { getEventListeners } from "node:events"
import { Inbox } from "../../src/bridge/queue"

test("normal message wakes release the abort listener", async () => {
  const inbox = new Inbox()
  const controller = new AbortController()
  for (const text of ["first", "second", "third"]) {
    const waiting = inbox.take(controller.signal)
    expect(getEventListeners(controller.signal, "abort")).toHaveLength(1)
    inbox.push({ chat: "1", user: "2", text })
    expect(await waiting).toEqual([{ chat: "1", user: "2", text }])
    expect(getEventListeners(controller.signal, "abort")).toHaveLength(0)
  }
  const waiting = inbox.take(controller.signal)
  controller.abort()
  expect(await waiting).toEqual([])
  expect(getEventListeners(controller.signal, "abort")).toHaveLength(0)
  inbox.push({ chat: "1", user: "2", text: "after abort" })
  expect(await inbox.take()).toEqual([{ chat: "1", user: "2", text: "after abort" }])
})
