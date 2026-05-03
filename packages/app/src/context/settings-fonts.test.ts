import { describe, expect, test } from "bun:test"
import { resolveSansFontFamily } from "./settings"

describe("resolveSansFontFamily", () => {
  test("uses Folonite sans fallback when theme is folonite and the user has not chosen a font", () => {
    expect(resolveSansFontFamily({ themeID: "folonite", font: "" })).toBe(
      "system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif",
    )
  })

  test("keeps the user-selected sans font on Folonite", () => {
    expect(resolveSansFontFamily({ themeID: "folonite", font: "IBM Plex Sans" })).toContain("IBM Plex Sans")
  })
})
