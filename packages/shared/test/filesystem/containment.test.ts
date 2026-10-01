import { expect, test } from "bun:test"
import { AppFileSystem } from "../../src/filesystem"

test("containment rejects traversal and allows dot-prefixed child names", () => {
  expect(AppFileSystem.contains("/project", "/project/../external")).toBe(false)
  expect(AppFileSystem.contains("/project", "/project/..notes/file.ts")).toBe(true)
  expect(AppFileSystem.overlaps("/project", "/external")).toBe(false)
})

test.skipIf(process.platform !== "win32")("different Windows drives never count as contained or overlapping", () => {
  expect(AppFileSystem.contains("C:\\project", "D:\\external")).toBe(false)
  expect(AppFileSystem.overlaps("C:\\project", "D:\\external")).toBe(false)
  expect(AppFileSystem.contains("C:\\project", "c:\\project\\file.ts")).toBe(true)
})
