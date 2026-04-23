import { describe, expect, test } from "bun:test"
import { buildHomeOverride } from "./home-override"

describe("buildHomeOverride", () => {
  test("returns undefined when no Skill is selected", () => {
    expect(buildHomeOverride(undefined, "")).toBeUndefined()
    expect(buildHomeOverride(undefined, "  some text  ")).toBeUndefined()
  })

  test("returns plain /skill-name for Skill-only send with empty text", () => {
    expect(buildHomeOverride("document-processing", "")).toBe("/document-processing")
  })

  test("treats whitespace-only text as empty and returns plain /skill-name", () => {
    expect(buildHomeOverride("data-analysis", "   ")).toBe("/data-analysis")
    expect(buildHomeOverride("data-analysis", "\n\t  ")).toBe("/data-analysis")
  })

  test("packages Skill + user text with single space and trims the user text", () => {
    expect(buildHomeOverride("writing-assistant", "hello world")).toBe(
      "/writing-assistant hello world",
    )
    expect(buildHomeOverride("writing-assistant", "  hello world  ")).toBe(
      "/writing-assistant hello world",
    )
  })

  test("preserves user slash-like text as plain prompt text (Gate 5 is the caller's job)", () => {
    expect(buildHomeOverride("document-processing", "/review this")).toBe(
      "/document-processing /review this",
    )
  })
})
