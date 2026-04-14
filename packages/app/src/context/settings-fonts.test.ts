import { describe, expect, test } from "bun:test"
import { resolveSansFontFamily } from "./settings"

describe("resolveSansFontFamily", () => {
  test("uses PawWork sans fallback when theme is pawwork and the user has not chosen a font", () => {
    expect(resolveSansFontFamily({ themeID: "pawwork", font: "" })).toBe(
      "system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif",
    )
  })

  test("keeps the user-selected sans font on PawWork", () => {
    expect(resolveSansFontFamily({ themeID: "pawwork", font: "IBM Plex Sans" })).toContain("IBM Plex Sans")
  })
})
