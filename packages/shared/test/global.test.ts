import { describe, expect, test } from "bun:test"
import path from "path"
import { resolveAsyncCoderHome } from "@async-coder/shared/global"

describe("resolveAsyncCoderHome", () => {
  test("with ASYNC_CODER_HOME set, resolves 4 subdirs under root", () => {
    const result = resolveAsyncCoderHome({
      ASYNC_CODER_HOME: "/tmp/profile-a",
    })
    expect(result.mode).toBe("async_coder_home")
    expect(result.root).toBe("/tmp/profile-a")
    expect(result.config).toBe(path.join("/tmp/profile-a", "config"))
    expect(result.data).toBe(path.join("/tmp/profile-a", "data"))
    expect(result.state).toBe(path.join("/tmp/profile-a", "state"))
    expect(result.cache).toBe(path.join("/tmp/profile-a", "cache"))
  })

  test("without ASYNC_CODER_HOME, falls through to xdg mode", () => {
    const result = resolveAsyncCoderHome({})
    expect(result.mode).toBe("xdg")
    expect(result.root).toBeUndefined()
    // xdg paths end with "/async-coder"
    expect(result.config.endsWith(path.join("", "async-coder"))).toBe(true)
    expect(result.data.endsWith(path.join("", "async-coder"))).toBe(true)
    expect(result.state.endsWith(path.join("", "async-coder"))).toBe(true)
    expect(result.cache.endsWith(path.join("", "async-coder"))).toBe(true)
  })

  test("empty ASYNC_CODER_HOME string is treated as unset (xdg mode)", () => {
    const result = resolveAsyncCoderHome({ ASYNC_CODER_HOME: "" })
    expect(result.mode).toBe("xdg")
  })

  test("relative ASYNC_CODER_HOME path throws with clear error", () => {
    expect(() => resolveAsyncCoderHome({ ASYNC_CODER_HOME: "./foo" })).toThrow(
      /ASYNC_CODER_HOME must be an absolute path/,
    )
    expect(() => resolveAsyncCoderHome({ ASYNC_CODER_HOME: "foo/bar" })).toThrow(
      /ASYNC_CODER_HOME must be an absolute path/,
    )
  })

  test("tilde-prefixed ASYNC_CODER_HOME throws (not treated as absolute)", () => {
    expect(() => resolveAsyncCoderHome({ ASYNC_CODER_HOME: "~/profiles/a" })).toThrow(
      /ASYNC_CODER_HOME must be an absolute path/,
    )
  })

  test("error message includes the offending value", () => {
    expect(() => resolveAsyncCoderHome({ ASYNC_CODER_HOME: "./relative" })).toThrow(
      /\.\/relative/,
    )
  })
})
