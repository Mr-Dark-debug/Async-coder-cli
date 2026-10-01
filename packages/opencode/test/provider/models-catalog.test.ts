import { expect, test } from "bun:test"
import { decodeCatalog } from "../../src/provider/models"

test("model catalog validates real fixture metadata and rejects corrupt pricing", async () => {
  const fixture = await Bun.file(new URL("../tool/fixtures/models-api.json", import.meta.url)).json()
  expect(Object.keys(decodeCatalog(fixture)).length).toBeGreaterThan(0)
  expect(() => decodeCatalog({ provider: { name: "bad", env: [], id: "provider", models: { bad: { id: "bad", cost: { input: "free", output: -1 } } } } })).toThrow()
  expect(() => decodeCatalog("<html>upstream unavailable</html>")).toThrow()
})
